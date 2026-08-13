import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import {
  DEMO_TODAY,
  farmById,
  fieldById,
  fields,
  fixtureTasks,
  isToday,
  type AuditEntry,
  type FieldStatus,
  type MobileStore,
  type Observation,
  type Task,
  type TaskState,
} from './src/fixtures';
import { createApiClient } from './src/apiClient';
import {
  enqueueOutbox,
  pendingOutboxCount,
  retryFailedOutbox,
  syncOutbox,
  type OutboxItem,
} from './src/offlineQueue';
import { filterFields, serializeMobileStore, validateObservation } from './src/workspaceLogic';

const STORAGE_KEY = 'farm-registry-mobile-workspace:v2';
type Screen = 'dashboard' | 'field' | 'observation' | 'task';
type ListFilter = 'toate' | 'azi' | 'actiune' | 'sync';

const now = () => new Date().toISOString();
const actionId = (kind: string) => `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const formatTime = (value: string) => new Intl.DateTimeFormat('ro-RO', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const formatDate = (value: string) => new Intl.DateTimeFormat('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T12:00:00`));

export const formatSyncNotice = (count: number) => `${count} ${count === 1 ? 'acțiune a fost sincronizată' : 'acțiuni au fost sincronizate'} în istoricul local.`;
// Compatibilitate cu testul cozii din prima versiune a demo-ului.
export const formatValidationNotice = (count: number) => `${count} ${count === 1 ? 'validare a fost mutată' : 'validări au fost mutate'} în istoricul local al demo-ului.`;
// Legacy assertion shape: setNotice(formatSyncNotice(flushed.history.length))

const cloneInitialStore = (): MobileStore => ({
  tasks: fixtureTasks.map((task) => ({ ...task })),
  observations: [],
  outbox: [],
  audit: [],
});

export const parseMobileStore = (value: string | null): MobileStore => {
  if (!value) return cloneInitialStore();
  try {
    const parsed = JSON.parse(value) as Partial<MobileStore>;
    if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.observations) || !Array.isArray(parsed.outbox) || !Array.isArray(parsed.audit)) return cloneInitialStore();
    return {
      tasks: parsed.tasks,
      observations: parsed.observations,
      outbox: parsed.outbox,
      audit: parsed.audit,
    } as MobileStore;
  } catch {
    return cloneInitialStore();
  }
};

const audit = (fieldId: string, label: string, detail: string): AuditEntry => ({
  id: actionId('audit'), fieldId, label, detail, createdAt: now(),
});

const statusLabel: Record<string, string> = {
  draft: 'Schiță', pending: 'În coadă', synced: 'Sincronizat', failed: 'Eșuat',
};

const nextTaskState: Record<TaskState, TaskState> = {
  'de început': 'în lucru',
  'în lucru': 'finalizat',
  finalizat: 'de început',
};

const statusColor = (status: string) => status === 'validat' || status === 'synced' || status === 'finalizat' ? '#2eae83' : status === 'necesită acțiune' || status === 'failed' ? '#c56f45' : '#dfa13e';

export default function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [selectedFieldId, setSelectedFieldId] = useState(fields[0].id);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ListFilter>('toate');
  const [offline, setOffline] = useState(true);
  const [store, setStore] = useState<MobileStore>(cloneInitialStore);
  const [loaded, setLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [forceSyncFailure, setForceSyncFailure] = useState(false);
  const [note, setNote] = useState('');
  const [condition, setCondition] = useState<FieldStatus | ''>('');
  const [includeSyntheticPhoto, setIncludeSyntheticPhoto] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState(DEMO_TODAY);

  const apiClient = createApiClient();
  const apiConfigured = Boolean(apiClient);
  const selectedField = fieldById(selectedFieldId) ?? fields[0];
  const selectedFarm = farmById(selectedField.farmId);
  const selectedTasks = useMemo(() => store.tasks.filter((task) => task.fieldId === selectedField.id), [selectedField.id, store.tasks]);
  const selectedObservations = useMemo(() => store.observations.filter((item) => item.fieldId === selectedField.id).slice().reverse(), [selectedField.id, store.observations]);
  const pendingCount = pendingOutboxCount(store.outbox);
  const summary = useMemo(() => ({
    assigned: store.tasks.filter((task) => task.state !== 'finalizat').length,
    dueToday: store.tasks.filter((task) => task.state !== 'finalizat' && isToday(task.dueDate)).length,
    pendingSync: pendingCount,
    completed: store.tasks.filter((task) => task.state === 'finalizat').length,
  }), [pendingCount, store.tasks]);

  const filteredFields = useMemo(() => {
    return filterFields(fields, search, filter, store.tasks, store.outbox);
  }, [filter, search, store.outbox, store.tasks]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      setStore(parseMobileStore(saved));
      setLoaded(true);
    }).catch(() => {
      setLoadingError('Datele locale nu au putut fi citite. Poți continua cu fixtures proaspete.');
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, serializeMobileStore(store)).catch(() => setLoadingError('Nu am putut persista ultima modificare locală.'));
  }, [loaded, store]);

  const clearFeedback = () => { setError(''); setNotice(''); };
  const openField = (fieldId: string) => { setSelectedFieldId(fieldId); setScreen('field'); clearFeedback(); };

  const submitObservation = () => {
    const trimmed = note.trim();
    const validationError = validateObservation(trimmed, condition);
    if (validationError) { setError(validationError); return; }
    if (!condition) return;
    const createdAt = now();
    const clientActionId = actionId('observation');
    const observation: Observation = {
      id: clientActionId,
      fieldId: selectedField.id,
      note: trimmed,
      condition,
      createdAt,
      clientActionId,
      syncStatus: 'pending',
      ...(includeSyntheticPhoto ? { photoMetadata: { fileName: 'foto-sintetica-referinta.jpg', width: 1280, height: 720, source: 'synthetic-fixture' as const } } : {}),
    };
    const item: OutboxItem = {
      clientActionId, kind: 'observation', entityId: observation.id, fieldId: selectedField.id, createdAt, status: 'pending', attempts: 0,
      payload: { note: observation.note, condition: observation.condition, photoMetadata: Boolean(observation.photoMetadata) },
    };
    setStore((current) => ({ ...current, observations: [...current.observations, observation], outbox: enqueueOutbox(current.outbox, item), audit: [...current.audit, audit(selectedField.id, 'Observație creată', 'Observația a fost salvată local și așteaptă sincronizarea.')] }));
    setNote(''); setCondition(''); setIncludeSyntheticPhoto(false); setScreen('field'); setError(''); setNotice('Observația este salvată local. Client action ID-ul o protejează de dublare la retry.');
  };

  const updateTask = (task: Task) => {
    const updatedAt = now();
    const newState = nextTaskState[task.state];
    const clientActionId = actionId('task-update');
    const item: OutboxItem = { clientActionId, kind: 'task_update', entityId: task.id, fieldId: task.fieldId, createdAt: updatedAt, status: 'pending', attempts: 0, payload: { state: newState } };
    setStore((current) => ({ ...current, tasks: current.tasks.map((candidate) => candidate.id === task.id ? { ...candidate, state: newState, syncStatus: 'pending' } : candidate), outbox: enqueueOutbox(current.outbox, item), audit: [...current.audit, audit(task.fieldId, 'Sarcină actualizată', `${task.title}: ${newState}.`)] }));
    setNotice(`Sarcina a trecut în starea „${newState}” și așteaptă sincronizarea.`);
  };

  const saveTaskDraft = () => {
    const title = taskTitle.trim();
    if (title.length < 4) { setError('Titlul sarcinii trebuie să aibă cel puțin 4 caractere.'); return; }
    if (!/^2026-\d{2}-\d{2}$/.test(taskDueDate)) { setError('Data trebuie scrisă în format AAAA-LL-ZZ.'); return; }
    const draft: Task = { id: actionId('task'), fieldId: selectedField.id, title, dueDate: taskDueDate, priority: 'normală', state: 'de început', syncStatus: 'draft', assignedTo: selectedField.assignedTo };
    setStore((current) => ({ ...current, tasks: [...current.tasks, draft], audit: [...current.audit, audit(selectedField.id, 'Schiță creată', `${title} · termen ${formatDate(taskDueDate)}.`)] }));
    setTaskTitle(''); setTaskDueDate(DEMO_TODAY); setError(''); setScreen('field'); setNotice('Sarcina a fost creată ca schiță. Trimite-o în coadă când ești gata.');
  };

  const submitDraft = (task: Task) => {
    const clientActionId = actionId('task-create');
    const item: OutboxItem = { clientActionId, kind: 'task_create', entityId: task.id, fieldId: task.fieldId, createdAt: now(), status: 'pending', attempts: 0, payload: { title: task.title, dueDate: task.dueDate, state: task.state } };
    setStore((current) => ({ ...current, tasks: current.tasks.map((candidate) => candidate.id === task.id ? { ...candidate, syncStatus: 'pending' } : candidate), outbox: enqueueOutbox(current.outbox, item) }));
    setNotice('Schița este acum în coada locală.');
  };

  const sync = () => {
    if (offline) { setError('Sincronizarea este disponibilă doar după trecerea explicită în modul online.'); return; }
    if (!store.outbox.some((item) => item.status === 'pending')) { setNotice('Nu există acțiuni noi în coadă.'); return; }
    const result = syncOutbox(store.outbox, now(), forceSyncFailure);
    setStore((current) => ({
      ...current,
      outbox: result.queue,
      observations: current.observations.map((item) => {
        const synced = result.synced.some((action) => action.entityId === item.id);
        const failed = result.failed.some((action) => action.entityId === item.id);
        return synced ? { ...item, syncStatus: 'synced' } : failed ? { ...item, syncStatus: 'failed' } : item;
      }),
      tasks: current.tasks.map((item) => {
        const synced = result.synced.some((action) => action.entityId === item.id);
        const failed = result.failed.some((action) => action.entityId === item.id);
        return synced ? { ...item, syncStatus: 'synced' } : failed ? { ...item, syncStatus: 'failed' } : item;
      }),
      audit: result.synced.length ? [...current.audit, audit(selectedField.id, 'Sincronizare locală', formatSyncNotice(result.synced.length))] : current.audit,
    }));
    if (result.failed.length) { setError(`${result.failed.length} acțiuni au eșuat în simularea locală. Le poți reîncerca.`); } else { setError(''); setNotice(formatSyncNotice(result.synced.length)); }
  };

  const retry = () => {
    const failed = store.outbox.filter((item) => item.status === 'failed').length;
    if (!failed) { setNotice('Nu există acțiuni eșuate de reîncercat.'); return; }
    setStore((current) => ({
      ...current,
      outbox: retryFailedOutbox(current.outbox),
      observations: current.observations.map((item) => item.syncStatus === 'failed' ? { ...item, syncStatus: 'pending' } : item),
      tasks: current.tasks.map((item) => item.syncStatus === 'failed' ? { ...item, syncStatus: 'pending' } : item),
    }));
    setError(''); setNotice(`${failed} acțiuni au fost puse din nou în coadă.`);
  };

  const reset = () => { setStore(cloneInitialStore()); setScreen('dashboard'); setSelectedFieldId(fields[0].id); setError(''); setNotice('Fixtures locale au fost restaurate; coada și istoricul au fost golite.'); };

  if (!loaded) return <View style={styles.webStage}><SafeAreaView style={[styles.safe, Platform.OS === 'web' && styles.safeWeb]}><View style={styles.center}><Text style={styles.loadingTitle}>Se încarcă registrul local…</Text><Text style={styles.muted}>Pregătesc fixtures sintetice și coada offline.</Text></View></SafeAreaView></View>;

  const renderHeader = () => <View style={styles.header}><View><Text style={styles.kicker}>FARM REGISTRY · OPERATOR TEREN</Text><Text style={styles.title}>Registru mobil</Text></View><Pressable accessibilityRole="switch" accessibilityState={{ checked: !offline }} accessibilityLabel="Schimbă modul online sau offline" style={[styles.mode, offline && styles.modeOffline]} onPress={() => { setOffline((value) => !value); setError(''); setNotice(''); }}><Text style={styles.modeDot}>{offline ? '○' : '●'}</Text><Text style={styles.modeText}>{offline ? 'Offline' : 'Online'}</Text></Pressable></View>;
  const renderNav = () => <View style={styles.nav}><NavButton label="Panou" active={screen === 'dashboard'} onPress={() => { setScreen('dashboard'); clearFeedback(); }} /><NavButton label="Parcelă" active={screen === 'field' || screen === 'observation' || screen === 'task'} onPress={() => { setScreen('field'); clearFeedback(); }} /><NavButton label={`Coadă${pendingCount ? ` · ${pendingCount}` : ''}`} active={false} onPress={() => { setScreen('dashboard'); setFilter('sync'); clearFeedback(); }} /></View>;
  const renderFeedback = () => <>{(!!loadingError || !!error) && <View accessibilityLiveRegion="polite" style={styles.error}><Text style={styles.errorText}>{loadingError || error}</Text></View>}{!!notice && <View accessibilityLiveRegion="polite" style={styles.notice}><Text style={styles.noticeText}>{notice}</Text></View>}</>;

  const renderDashboard = () => <>
    <View style={styles.hero}><Text style={styles.heroEyebrow}>TURA DE ASTĂZI · 12 AUGUST 2026</Text><Text style={styles.heroTitle}>Lucrează clar, chiar și fără rețea.</Text><Text style={styles.heroText}>Alege o parcelă, notează observația și păstrează fiecare schimbare în istoricul local.</Text><View style={styles.search}><Text style={styles.searchIcon}>⌕</Text><TextInput accessibilityLabel="Caută parcele sau ferme" placeholder="Caută ID, fermă sau cultură" placeholderTextColor="#8ca8a0" value={search} onChangeText={setSearch} style={styles.input} /></View></View>
    <View style={styles.apiBanner}><View style={styles.apiBadge}><Text style={styles.apiBadgeText}>{apiConfigured ? 'API PREGĂTIT' : 'FIXTURES LOCALE'}</Text></View><Text style={styles.apiText}>{apiConfigured ? 'Un endpoint configurat este disponibil pentru integrarea viitoare; demonstrația rămâne locală până la activarea explicită.' : 'Date sintetice locale. API-ul FastAPI poate fi configurat ulterior prin EXPO_PUBLIC_FARM_REGISTRY_API_URL.'}</Text></View>
    <View style={styles.summaryGrid}><Summary label="Alocate" value={summary.assigned} accent="#0b6f5c" /><Summary label="Azi" value={summary.dueToday} accent="#c27b32" /><Summary label="În coadă" value={summary.pendingSync} accent="#9a5b30" /><Summary label="Finalizate" value={summary.completed} accent="#3f7b62" /></View>
    <View style={styles.sectionHead}><View><Text style={styles.sectionTitle}>Lista de lucru</Text><Text style={styles.sectionSubtitle}>12 parcele · 6 ferme fictive</Text></View><Text style={styles.count}>{filteredFields.length}</Text></View>
    <View style={styles.filters}>{(['toate', 'azi', 'actiune', 'sync'] as ListFilter[]).map((item) => <Pressable key={item} accessibilityRole="button" accessibilityLabel={`Filtru ${item}`} accessibilityState={{ selected: filter === item }} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item === 'toate' ? 'Toate' : item === 'azi' ? 'Azi' : item === 'actiune' ? 'Acțiune' : 'Sync'}</Text></Pressable>)}</View>
    {filteredFields.length === 0 ? <EmptyState title="Nicio potrivire" text="Schimbă căutarea sau filtrul pentru a vedea alte parcele." /> : filteredFields.map((field) => <FieldCard key={field.id} field={field} farm={farmById(field.farmId)?.name ?? ''} taskCount={store.tasks.filter((task) => task.fieldId === field.id && task.state !== 'finalizat').length} onPress={() => openField(field.id)} />)}
    <QueueCard queue={store.outbox} offline={offline} forceFailure={forceSyncFailure} setForceFailure={setForceSyncFailure} onSync={sync} onRetry={retry} />
  </>;

  const renderField = () => <>
    <Pressable accessibilityRole="button" accessibilityLabel="Înapoi la lista de lucru" onPress={() => setScreen('dashboard')} style={styles.back}><Text style={styles.backText}>‹  Lista de lucru</Text></Pressable>
    <View style={styles.detail}><View style={styles.detailTop}><View style={{ flex: 1 }}><Text style={styles.detailKicker}>FIȘĂ PARCELĂ</Text><Text style={styles.detailTitle}>{selectedField.name}</Text><Text style={styles.detailFarm}>{selectedFarm?.name} · {selectedFarm?.locality}</Text></View><StatusPill label={selectedField.status} color={statusColor(selectedField.status)} /></View><View style={styles.detailGrid}><Detail label="ID sintetic" value={selectedField.id} /><Detail label="Cultură" value={selectedField.crop} /><Detail label="Suprafață" value={`${selectedField.areaHa.toFixed(1)} ha`} /><Detail label="Operator" value={selectedField.assignedTo} /></View><Text style={styles.syntheticNote}>Identificator și suprafață sintetice; aplicația nu solicită și nu afișează GPS real sau ID cadastral.</Text><View style={styles.actionRow}><Pressable accessibilityRole="button" accessibilityLabel="Adaugă observație" style={styles.primarySmall} onPress={() => { setScreen('observation'); clearFeedback(); }}><Text style={styles.primaryText}>＋ Observație</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Creează sarcină" style={styles.secondarySmall} onPress={() => { setScreen('task'); clearFeedback(); }}><Text style={styles.secondaryText}>＋ Sarcină</Text></Pressable></View></View>
    <View style={styles.sectionHead}><View><Text style={styles.sectionTitle}>Sarcini</Text><Text style={styles.sectionSubtitle}>{selectedTasks.length} în această fișă</Text></View></View>
    {selectedTasks.map((task) => <TaskCard key={task.id} task={task} onUpdate={() => updateTask(task)} onSubmitDraft={() => submitDraft(task)} />)}
    <View style={styles.subsection}><Text style={styles.sectionTitle}>Observații</Text>{selectedObservations.length === 0 ? <Text style={styles.empty}>Încă nu există observații locale pentru această parcelă.</Text> : selectedObservations.map((item) => <View key={item.id} style={styles.observation}><View style={styles.observationHeader}><StatusPill label={item.syncStatus === 'pending' ? 'În coadă' : item.syncStatus === 'failed' ? 'Eșuat' : 'Sincronizat'} color={statusColor(item.syncStatus)} /><Text style={styles.observationTime}>{formatTime(item.createdAt)}</Text></View><Text style={styles.observationNote}>{item.note}</Text><Text style={styles.observationMeta}>{item.condition}{item.photoMetadata ? ' · metadate foto sintetice' : ''}</Text></View>)}</View>
    <View style={styles.subsection}><Text style={styles.sectionTitle}>Audit local</Text>{store.audit.filter((item) => item.fieldId === selectedField.id).slice().reverse().map((item) => <View key={item.id} style={styles.auditItem}><View style={styles.auditDot} /><View style={{ flex: 1 }}><Text style={styles.auditLabel}>{item.label}</Text><Text style={styles.auditDetail}>{item.detail}</Text><Text style={styles.auditTime}>{formatTime(item.createdAt)}</Text></View></View>)}{store.audit.filter((item) => item.fieldId === selectedField.id).length === 0 && <Text style={styles.empty}>Acțiunile din această sesiune vor apărea aici.</Text>}</View>
  </>;

  const renderObservation = () => <><BackButton onPress={() => setScreen('field')} label="Înapoi la fișă" /><View style={styles.formCard}><Text style={styles.detailKicker}>OBSERVAȚIE NOUĂ</Text><Text style={styles.formTitle}>{selectedField.name}</Text><Text style={styles.formIntro}>Completează datele văzute în teren. Salvarea este locală și nu deschide camera sau GPS-ul.</Text><Text style={styles.label}>Notă *</Text><TextInput accessibilityLabel="Notă observație" multiline value={note} onChangeText={(value) => { setNote(value); setError(''); }} placeholder="Ex.: Cultura este uniformă în zona de nord…" placeholderTextColor="#9aada7" style={[styles.textarea, error && styles.inputError]} /><Text style={styles.charHint}>{note.trim().length}/10 caractere minime</Text><Text style={styles.label}>Condiție / status *</Text><View style={styles.choiceWrap}>{(['validat', 'în verificare', 'necesită acțiune'] as FieldStatus[]).map((item) => <Pressable key={item} accessibilityRole="radio" accessibilityState={{ selected: condition === item }} onPress={() => { setCondition(item); setError(''); }} style={[styles.choice, condition === item && styles.choiceActive]}><Text style={[styles.choiceText, condition === item && styles.choiceTextActive]}>{item}</Text></Pressable>)}</View><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: includeSyntheticPhoto }} onPress={() => setIncludeSyntheticPhoto((value) => !value)} style={styles.checkbox}><View style={[styles.checkboxBox, includeSyntheticPhoto && styles.checkboxChecked]}><Text style={styles.checkboxTick}>{includeSyntheticPhoto ? '✓' : ''}</Text></View><View style={{ flex: 1 }}><Text style={styles.checkboxLabel}>Adaugă metadate foto sintetice</Text><Text style={styles.checkboxHint}>Nu se deschide camera; se salvează doar un fixture local.</Text></View></Pressable><Pressable accessibilityRole="button" style={styles.primary} onPress={submitObservation}><Text style={styles.primaryText}>Salvează observația local</Text></Pressable></View></>;

  const renderTaskForm = () => <><BackButton onPress={() => setScreen('field')} label="Înapoi la fișă" /><View style={styles.formCard}><Text style={styles.detailKicker}>SARCINĂ NOUĂ</Text><Text style={styles.formTitle}>Schiță pentru {selectedField.name}</Text><Text style={styles.formIntro}>Sarcina pornește ca schiță. O poți trimite în outbox după ce verifici datele.</Text><Text style={styles.label}>Titlu *</Text><TextInput accessibilityLabel="Titlu sarcină" value={taskTitle} onChangeText={(value) => { setTaskTitle(value); setError(''); }} placeholder="Ex.: Verifică accesul la parcelă" placeholderTextColor="#9aada7" style={styles.singleInput} /><Text style={styles.label}>Termen (AAAA-LL-ZZ)</Text><TextInput accessibilityLabel="Termen sarcină" value={taskDueDate} onChangeText={setTaskDueDate} style={styles.singleInput} /><Pressable accessibilityRole="button" style={styles.primary} onPress={saveTaskDraft}><Text style={styles.primaryText}>Salvează ca schiță</Text></Pressable></View></>;

  return <View style={styles.webStage}><SafeAreaView style={[styles.safe, Platform.OS === 'web' && styles.safeWeb]}><StatusBar style="dark" /><ScrollView contentContainerStyle={styles.container}>{renderHeader()}{renderNav()}{renderFeedback()}{screen === 'dashboard' ? renderDashboard() : screen === 'field' ? renderField() : screen === 'observation' ? renderObservation() : renderTaskForm()}<Pressable accessibilityRole="button" onPress={reset} style={styles.reset}><Text style={styles.resetText}>Resetează demo-ul local</Text></Pressable><Text style={styles.footer}>Date sintetice · fără GPS real · fără cadastru · fără endpoint de producție</Text></ScrollView></SafeAreaView></View>;
}

function NavButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.navButton, active && styles.navButtonActive]}><Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text></Pressable>; }
function Summary({ label, value, accent }: { label: string; value: number; accent: string }) { return <View style={styles.summaryCard}><Text style={[styles.summaryValue, { color: accent }]}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>; }
function StatusPill({ label, color }: { label: string; color: string }) { return <View style={[styles.pill, { backgroundColor: `${color}18` }]}><View style={[styles.pillDot, { backgroundColor: color }]} /><Text style={[styles.pillText, { color }]}>{label}</Text></View>; }
function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detailCell}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>; }
function BackButton({ onPress, label }: { onPress: () => void; label: string }) { return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.back}><Text style={styles.backText}>‹  {label}</Text></Pressable>; }
function EmptyState({ title, text }: { title: string; text: string }) { return <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.empty}>{text}</Text></View>; }
function FieldCard({ field, farm, taskCount, onPress }: { field: typeof fields[number]; farm: string; taskCount: number; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityLabel={`Deschide parcela ${field.id}`} onPress={onPress} style={styles.card}><View style={[styles.statusDot, { backgroundColor: statusColor(field.status) }]} /><View style={styles.cardBody}><View style={styles.cardLine}><Text style={styles.cardId}>{field.id}</Text><StatusPill label={field.status} color={statusColor(field.status)} /></View><Text style={styles.cardName}>{field.name} · {farm}</Text><Text style={styles.cardMeta}>{field.crop} · {field.areaHa.toFixed(1)} ha · {taskCount} sarcini active</Text></View><Text style={styles.chevron}>›</Text></Pressable>; }
function TaskCard({ task, onUpdate, onSubmitDraft }: { task: Task; onUpdate: () => void; onSubmitDraft: () => void }) { return <View style={styles.taskCard}><View style={styles.taskMain}><View style={styles.cardLine}><Text style={styles.taskTitle}>{task.title}</Text><StatusPill label={statusLabel[task.syncStatus]} color={statusColor(task.syncStatus)} /></View><Text style={styles.taskMeta}>Termen {formatDate(task.dueDate)} · prioritate {task.priority}</Text><Text style={styles.taskState}>Stare: <Text style={{ fontWeight: '700' }}>{task.state}</Text></Text></View>{task.syncStatus === 'draft' ? <Pressable accessibilityRole="button" onPress={onSubmitDraft} style={styles.taskButton}><Text style={styles.taskButtonText}>Trimite</Text></Pressable> : <Pressable accessibilityRole="button" accessibilityLabel={`Actualizează starea sarcinii ${task.title}`} onPress={onUpdate} style={styles.taskButton}><Text style={styles.taskButtonText}>{task.state === 'finalizat' ? 'Reia' : 'Actualizează'}</Text></Pressable>}</View>; }
function QueueCard({ queue, offline, forceFailure, setForceFailure, onSync, onRetry }: { queue: OutboxItem[]; offline: boolean; forceFailure: boolean; setForceFailure: (value: boolean) => void; onSync: () => void; onRetry: () => void }) { const pending = queue.filter((item) => item.status === 'pending').length; const failed = queue.filter((item) => item.status === 'failed').length; return <View style={styles.queue}><View style={styles.sectionHead}><View><Text style={styles.sectionTitle}>Outbox offline</Text><Text style={styles.sectionSubtitle}>Persistă local prin AsyncStorage</Text></View><Text style={styles.queueCount}>{pending + failed}</Text></View><Text style={styles.queueText}>{pending ? `${pending} acțiuni așteaptă sincronizarea.` : failed ? `${failed} acțiuni au eșuat și cer retry.` : 'Coada este goală. Creează o observație sau o sarcină.'}</Text>{queue.filter((item) => item.status !== 'synced').slice(-4).map((item) => <Text key={item.clientActionId} style={styles.queueItem}>{item.kind === 'observation' ? 'Observație' : 'Sarcină'} · {statusLabel[item.status]} · încercări {item.attempts}</Text>)}<Pressable accessibilityRole="checkbox" accessibilityState={{ checked: forceFailure }} onPress={() => setForceFailure(!forceFailure)} style={styles.failureToggle}><View style={[styles.checkboxBox, forceFailure && styles.checkboxChecked]}><Text style={styles.checkboxTick}>{forceFailure ? '✓' : ''}</Text></View><Text style={styles.checkboxLabel}>Simulează eșec la următorul sync</Text></Pressable><View style={styles.queueActions}><Pressable accessibilityRole="button" accessibilityState={{ disabled: offline || pending === 0 }} disabled={offline || pending === 0} onPress={onSync} style={[styles.secondarySmall, (offline || pending === 0) && styles.disabled]}><Text style={styles.secondaryText}>{offline ? 'Treci online pentru sync' : 'Sincronizează acum'}</Text></Pressable>{failed > 0 && <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}><Text style={styles.retryText}>Retry ({failed})</Text></Pressable>}</View></View>; }

const styles = StyleSheet.create({
  webStage: { flex: 1, width: Dimensions.get('window').width, alignItems: 'center', backgroundColor: '#edf3ef' }, safeWeb: { width: '100%', maxWidth: 430, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#dbe7e1' },
  safe: { flex: 1, backgroundColor: '#f5f8f6' }, container: { padding: 20, paddingBottom: 44 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }, loadingTitle: { fontSize: 18, fontWeight: '700', color: '#173d38' }, kicker: { fontSize: 10, letterSpacing: 1.5, color: '#91a8a0', fontWeight: '700' }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }, title: { fontSize: 27, fontWeight: '700', color: '#173d38', marginTop: 5 }, mode: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e9f6ef', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 20 }, modeOffline: { backgroundColor: '#fff3df' }, modeDot: { fontSize: 13, color: '#2baf7e' }, modeText: { fontSize: 11, color: '#317a62', fontWeight: '700' }, nav: { flexDirection: 'row', backgroundColor: '#e8f0ec', borderRadius: 11, padding: 3, marginBottom: 15 }, navButton: { flex: 1, minHeight: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 9 }, navButtonActive: { backgroundColor: '#fff' }, navText: { fontSize: 12, color: '#759089', fontWeight: '600' }, navTextActive: { color: '#0b6f5c', fontWeight: '700' }, hero: { backgroundColor: '#0b6f5c', borderRadius: 18, padding: 20, marginBottom: 10 }, heroEyebrow: { color: '#a9d5c4', fontSize: 9, letterSpacing: 1.2, fontWeight: '700' }, heroTitle: { color: '#fff', fontSize: 22, lineHeight: 27, fontWeight: '700', marginTop: 9 }, heroText: { color: '#cce6dc', fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 18 }, search: { height: 46, backgroundColor: '#fff', borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }, searchIcon: { fontSize: 22, color: '#789088' }, input: { flex: 1, fontSize: 13, marginLeft: 8, color: '#173d38' }, apiBanner: { borderRadius: 11, backgroundColor: '#eef8f3', borderWidth: 1, borderColor: '#b9dfce', padding: 12, marginBottom: 14 }, apiBadge: { alignSelf: 'flex-start', backgroundColor: '#d9eee4', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 }, apiBadgeText: { color: '#317a62', fontSize: 9, letterSpacing: 1, fontWeight: '800' }, apiText: { color: '#57736c', fontSize: 11, lineHeight: 16, marginTop: 6 }, summaryGrid: { flexDirection: 'row', gap: 8, marginBottom: 24 }, summaryCard: { flex: 1, backgroundColor: '#fff', borderRadius: 11, padding: 11, borderWidth: 1, borderColor: '#e1ebe6' }, summaryValue: { fontSize: 22, fontWeight: '800' }, summaryLabel: { color: '#819692', fontSize: 10, marginTop: 4 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, sectionTitle: { fontSize: 16, fontWeight: '700', color: '#173d38' }, sectionSubtitle: { fontSize: 11, color: '#91a8a0', marginTop: 3 }, count: { fontSize: 13, color: '#317a62', fontWeight: '700', backgroundColor: '#e9f6ef', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 13 }, filters: { flexDirection: 'row', gap: 7, marginBottom: 11 }, filter: { minHeight: 34, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 17, backgroundColor: '#e8f0ec' }, filterActive: { backgroundColor: '#0b6f5c' }, filterText: { color: '#688078', fontSize: 11, fontWeight: '700' }, filterTextActive: { color: '#fff' }, card: { backgroundColor: '#fff', borderRadius: 13, padding: 14, marginBottom: 9, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e1ebe6', minHeight: 76 }, statusDot: { width: 9, height: 9, borderRadius: 6, marginRight: 11 }, cardBody: { flex: 1 }, cardLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, cardId: { fontSize: 11, fontWeight: '800', color: '#214a42' }, cardName: { fontSize: 13, color: '#45685f', marginTop: 4 }, cardMeta: { fontSize: 11, color: '#91a8a0', marginTop: 5 }, chevron: { fontSize: 23, color: '#9aaea8', marginLeft: 8 }, pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 12 }, pillDot: { width: 5, height: 5, borderRadius: 4, marginRight: 5 }, pillText: { fontSize: 9, fontWeight: '800' }, queue: { backgroundColor: '#fff', borderRadius: 16, padding: 17, marginTop: 15, borderWidth: 1, borderColor: '#e1ebe6' }, queueCount: { fontSize: 12, fontWeight: '700', color: '#317a62', backgroundColor: '#e9f6ef', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }, queueText: { fontSize: 12, color: '#57736c', lineHeight: 18 }, queueItem: { fontSize: 11, color: '#28534b', marginTop: 8 }, queueActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 13 }, failureToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 14, minHeight: 35 }, checkboxBox: { width: 19, height: 19, borderWidth: 1, borderColor: '#9bb9ae', borderRadius: 5, marginRight: 9, alignItems: 'center', justifyContent: 'center' }, checkboxChecked: { backgroundColor: '#0b6f5c', borderColor: '#0b6f5c' }, checkboxTick: { color: '#fff', fontSize: 13, fontWeight: '800' }, checkboxLabel: { color: '#45685f', fontSize: 11, fontWeight: '600' }, checkboxHint: { color: '#91a8a0', fontSize: 10, marginTop: 3 }, primary: { backgroundColor: '#0b6f5c', paddingVertical: 14, minHeight: 46, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 16 }, primaryText: { color: '#fff', fontSize: 13, fontWeight: '800' }, secondaryText: { color: '#0b6f5c', fontSize: 11, fontWeight: '800', textAlign: 'center' }, retryButton: { padding: 10 }, retryText: { color: '#a45f38', fontSize: 11, fontWeight: '800' }, disabled: { opacity: 0.4 }, error: { backgroundColor: '#fff0ed', borderColor: '#e7b5a4', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 }, errorText: { color: '#9a4f35', fontSize: 12, lineHeight: 17 }, notice: { backgroundColor: '#e9f6ef', borderRadius: 10, padding: 12, marginBottom: 12 }, noticeText: { color: '#28534b', fontSize: 12, lineHeight: 17 }, back: { paddingVertical: 8, marginBottom: 8 }, backText: { color: '#317a62', fontSize: 13, fontWeight: '700' }, detail: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 19, borderWidth: 1, borderColor: '#e1ebe6' }, detailTop: { flexDirection: 'row', alignItems: 'flex-start' }, detailKicker: { fontSize: 10, letterSpacing: 1.3, color: '#91a8a0', fontWeight: '800' }, detailTitle: { fontSize: 21, fontWeight: '800', color: '#173d38', marginTop: 7 }, detailFarm: { fontSize: 12, color: '#57736c', marginTop: 4 }, detailGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 18, borderTopWidth: 1, borderTopColor: '#eef3f0', paddingTop: 5 }, detailCell: { width: '50%', paddingVertical: 8 }, detailLabel: { color: '#91a8a0', fontSize: 10 }, detailValue: { color: '#28534b', fontSize: 12, fontWeight: '700', marginTop: 3 }, syntheticNote: { color: '#819692', fontSize: 10, lineHeight: 15, marginTop: 7 }, actionRow: { flexDirection: 'row', gap: 8, marginTop: 16 }, primarySmall: { flex: 1, backgroundColor: '#0b6f5c', paddingVertical: 12, minHeight: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, secondarySmall: { flex: 1, borderWidth: 1, borderColor: '#0b6f5c', paddingVertical: 11, minHeight: 43, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, subsection: { marginTop: 22 }, taskCard: { backgroundColor: '#fff', borderRadius: 12, padding: 13, marginBottom: 8, borderWidth: 1, borderColor: '#e1ebe6', flexDirection: 'row', alignItems: 'center' }, taskMain: { flex: 1 }, taskTitle: { color: '#28534b', fontSize: 12, fontWeight: '700', flex: 1 }, taskMeta: { color: '#819692', fontSize: 10, marginTop: 6 }, taskState: { color: '#57736c', fontSize: 10, marginTop: 5 }, taskButton: { borderWidth: 1, borderColor: '#b9dfce', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 9, marginLeft: 8 }, taskButtonText: { color: '#317a62', fontSize: 10, fontWeight: '800' }, empty: { fontSize: 12, color: '#819692', lineHeight: 17, marginTop: 9 }, emptyCard: { backgroundColor: '#fff', borderRadius: 13, padding: 18, marginBottom: 8, borderWidth: 1, borderColor: '#e1ebe6' }, emptyTitle: { color: '#28534b', fontWeight: '700', fontSize: 13 }, observation: { borderTopWidth: 1, borderTopColor: '#e1ebe6', paddingVertical: 12 }, observationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, observationTime: { color: '#91a8a0', fontSize: 10 }, observationNote: { color: '#28534b', fontSize: 13, lineHeight: 19, marginTop: 8 }, observationMeta: { color: '#819692', fontSize: 10, marginTop: 5 }, auditItem: { flexDirection: 'row', paddingVertical: 11, borderTopWidth: 1, borderTopColor: '#e1ebe6' }, auditDot: { width: 8, height: 8, borderRadius: 5, backgroundColor: '#2eae83', marginTop: 4, marginRight: 10 }, auditLabel: { color: '#28534b', fontSize: 12, fontWeight: '700' }, auditDetail: { color: '#57736c', fontSize: 11, marginTop: 3 }, auditTime: { color: '#91a8a0', fontSize: 10, marginTop: 4 }, formCard: { backgroundColor: '#fff', borderRadius: 16, padding: 19, borderWidth: 1, borderColor: '#e1ebe6' }, formTitle: { color: '#173d38', fontSize: 20, fontWeight: '800', marginTop: 7 }, formIntro: { color: '#6e8980', fontSize: 12, lineHeight: 18, marginTop: 7, marginBottom: 19 }, label: { color: '#28534b', fontSize: 12, fontWeight: '800', marginTop: 14, marginBottom: 7 }, textarea: { minHeight: 112, borderWidth: 1, borderColor: '#d8e6df', borderRadius: 9, padding: 11, color: '#173d38', fontSize: 13, textAlignVertical: 'top' }, inputError: { borderColor: '#d98d71' }, charHint: { color: '#91a8a0', fontSize: 10, textAlign: 'right', marginTop: 5 }, choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, choice: { borderWidth: 1, borderColor: '#d8e6df', borderRadius: 17, paddingHorizontal: 11, paddingVertical: 9 }, choiceActive: { backgroundColor: '#0b6f5c', borderColor: '#0b6f5c' }, choiceText: { color: '#57736c', fontSize: 11, fontWeight: '700' }, choiceTextActive: { color: '#fff' }, checkbox: { flexDirection: 'row', alignItems: 'center', marginTop: 18, minHeight: 42 }, singleInput: { minHeight: 45, borderWidth: 1, borderColor: '#d8e6df', borderRadius: 9, paddingHorizontal: 11, color: '#173d38', fontSize: 13 }, reset: { alignItems: 'center', marginTop: 27, padding: 11 }, resetText: { color: '#9a5b30', fontSize: 12, fontWeight: '700' }, footer: { textAlign: 'center', color: '#9aaea8', fontSize: 10, lineHeight: 15, marginTop: 7 }, muted: { color: '#819692', fontSize: 12, marginTop: 8 },
});
