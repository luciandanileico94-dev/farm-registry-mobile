import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useReducer, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { formatCoordinate, polygonCentroid } from './src/geometry';
import { TaskState, taskReducer } from './src/taskState';

const TASKS_KEY = 'field-registry.task-status.v1';
const parcels = [
  { id: 'SYNTH-CT-00142', name: 'Fermă Demo Alpha', area: '42.8 ha', status: 'Validată' as const, crop: 'Grâu', geometry: [[28.83, 47.01], [28.85, 47.01], [28.85, 47.03], [28.83, 47.03]] as const },
  { id: 'SYNTH-CT-00143', name: 'Operator Test Beta', area: '18.3 ha', status: 'În verificare' as const, crop: 'Porumb', geometry: [[28.80, 47.04], [28.82, 47.04], [28.82, 47.05], [28.80, 47.05]] as const },
  { id: 'SYNTH-CT-00144', name: 'Parcelă Exemplu Gamma', area: '64.1 ha', status: 'Validată' as const, crop: 'Floarea-soarelui', geometry: [[28.86, 46.99], [28.88, 46.99], [28.88, 47.01], [28.86, 47.01]] as const },
];

const initialStatuses: TaskState = Object.fromEntries(parcels.map((parcel) => [parcel.id, parcel.status]));

export default function App() {
  const [search, setSearch] = useState('');
  const [offline, setOffline] = useState(false);
  const [selectedId, setSelectedId] = useState(parcels[0].id);
  const [statuses, dispatch] = useReducer(taskReducer, initialStatuses);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(TASKS_KEY)
      .then((saved) => {
        if (saved) dispatch({ type: 'hydrate', value: JSON.parse(saved) as TaskState });
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(TASKS_KEY, JSON.stringify(statuses)).catch(() => undefined);
  }, [hydrated, statuses]);

  const filtered = useMemo(() => parcels.filter((parcel) =>
    `${parcel.id} ${parcel.name}`.toLowerCase().includes(search.toLowerCase())), [search]);
  const selected = parcels.find((parcel) => parcel.id === selectedId) ?? parcels[0];
  const selectedStatus = statuses[selected.id];
  const centroid = polygonCentroid(selected.geometry);

  return <SafeAreaView style={styles.safe}><StatusBar style="dark" /><ScrollView contentContainerStyle={styles.container}>
    <View style={styles.header}><View><Text style={styles.kicker}>OPERARE TEREN</Text><Text style={styles.title}>Field Registry</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Comută conexiunea simulată" style={[styles.sync, offline && styles.syncOffline]} onPress={() => setOffline((value) => !value)}>
        <Text style={styles.syncDot}>{offline ? '○' : '●'}</Text><Text style={styles.syncText}>{offline ? 'Conexiune simulată: offline' : 'Conexiune simulată: online'}</Text>
      </Pressable>
    </View>
    <View style={styles.hero}><Text style={styles.heroTitle}>Parcele agricole</Text><Text style={styles.heroText}>Date synthetic. Statusul se salvează local pe acest dispozitiv, inclusiv fără conexiune.</Text>
      <View style={styles.search}><Text style={styles.searchIcon}>⌕</Text><TextInput accessibilityLabel="Caută parcele" placeholder="Caută fermier sau ID" value={search} onChangeText={setSearch} style={styles.input} /></View>
    </View>
    <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Lista de lucru</Text><Text style={styles.count}>{filtered.length} parcele</Text></View>
    {filtered.map((parcel) => <Pressable accessibilityRole="button" key={parcel.id} onPress={() => setSelectedId(parcel.id)} style={[styles.card, selected.id === parcel.id && styles.cardActive]}>
      <View style={[styles.statusDot, statuses[parcel.id] !== 'Validată' && styles.statusReview]} /><View style={styles.cardBody}><Text style={styles.cardId}>{parcel.id}</Text><Text style={styles.cardName}>{parcel.name}</Text><Text style={styles.cardMeta}>{parcel.crop} · {parcel.area}</Text></View><Text style={styles.chevron}>›</Text>
    </Pressable>)}
    <View style={styles.detail}><Text style={styles.detailKicker}>SELECTATĂ</Text><Text style={styles.detailTitle}>{selected.name}</Text>
      <View style={styles.detailRow}><Text style={styles.detailLabel}>Status local</Text><Text style={styles.detailValue}>{selectedStatus}</Text></View>
      <View style={styles.detailRow}><Text style={styles.detailLabel}>Centroid calculat</Text><Text style={styles.detailValue}>{formatCoordinate(centroid)}</Text></View>
      <Pressable accessibilityRole="button" style={styles.primary} onPress={() => dispatch({ type: 'validate', id: selected.id })}><Text style={styles.primaryText}>Salvează validarea locală</Text></Pressable>
    </View><Text style={styles.footer}>React Native · TypeScript · date synthetic · stare locală</Text>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#f5f8f6' }, container: { padding: 20, paddingBottom: 40 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }, kicker: { fontSize: 10, letterSpacing: 1.5, color: '#9aaea8', fontWeight: '700' }, title: { fontSize: 27, fontWeight: '700', color: '#173d38', marginTop: 5 }, sync: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e9f6ef', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, maxWidth: 180 }, syncOffline: { backgroundColor: '#fff3df' }, syncDot: { fontSize: 12, color: '#2baf7e' }, syncText: { fontSize: 11, color: '#317a62', fontWeight: '600' }, hero: { backgroundColor: '#0b6f5c', borderRadius: 18, padding: 20, marginBottom: 26 }, heroTitle: { color: '#fff', fontSize: 21, fontWeight: '700' }, heroText: { color: '#cce6dc', fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 18 }, search: { height: 44, backgroundColor: '#fff', borderRadius: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }, searchIcon: { fontSize: 22, color: '#789088' }, input: { flex: 1, fontSize: 13, marginLeft: 8, color: '#173d38' }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, sectionTitle: { fontSize: 16, fontWeight: '700', color: '#173d38' }, count: { fontSize: 12, color: '#819692' }, card: { backgroundColor: '#fff', borderRadius: 13, padding: 15, marginBottom: 9, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e1ebe6' }, cardActive: { borderColor: '#8cc8b2', shadowColor: '#0b6f5c', shadowOpacity: .08, shadowRadius: 8 }, statusDot: { width: 9, height: 9, borderRadius: 6, backgroundColor: '#2eae83', marginRight: 12 }, statusReview: { backgroundColor: '#e4a03b' }, cardBody: { flex: 1 }, cardId: { fontSize: 12, fontWeight: '700', color: '#214a42' }, cardName: { fontSize: 13, color: '#45685f', marginTop: 3 }, cardMeta: { fontSize: 11, color: '#9aaea8', marginTop: 4 }, chevron: { fontSize: 23, color: '#9aaea8' }, detail: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginTop: 12, borderWidth: 1, borderColor: '#e1ebe6' }, detailKicker: { fontSize: 10, letterSpacing: 1.3, color: '#9aaea8', fontWeight: '700' }, detailTitle: { fontSize: 19, fontWeight: '700', color: '#173d38', marginTop: 7, marginBottom: 16 }, detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#eef3f0' }, detailLabel: { fontSize: 12, color: '#819692' }, detailValue: { fontSize: 12, color: '#28534b', fontWeight: '600' }, primary: { backgroundColor: '#0b6f5c', paddingVertical: 13, borderRadius: 9, alignItems: 'center', marginTop: 16 }, primaryText: { color: '#fff', fontSize: 13, fontWeight: '700' }, footer: { textAlign: 'center', color: '#9aaea8', fontSize: 10, marginTop: 24 } });
