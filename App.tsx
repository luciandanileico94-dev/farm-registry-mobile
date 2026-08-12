import { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { emptyDemoStore, enqueueValidation, flushValidationQueue, type DemoHistoryItem, type DemoStore, type ValidationAction } from './src/offlineQueue';

const STORAGE_KEY = 'farm-registry-demo:v1';
const parcels = [
  { id: 'MD-CT-00142', name: 'AgroNord SRL', area: '42.8 ha', status: 'Validată', crop: 'Grâu' },
  { id: 'MD-CT-00143', name: 'Ion Balan', area: '18.3 ha', status: 'În verificare', crop: 'Porumb' },
  { id: 'MD-CT-00144', name: 'Eco Valea Mare', area: '64.1 ha', status: 'Validată', crop: 'Floarea-soarelui' },
];

const formatTime = (value: string) => new Intl.DateTimeFormat('ro-RO', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));

export default function App() {
  const [search, setSearch] = useState('');
  const [offline, setOffline] = useState(false);
  const [selected, setSelected] = useState(parcels[0]);
  const [store, setStore] = useState<DemoStore>(emptyDemoStore);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState('');
  const filtered = useMemo(() => parcels.filter((p) => `${p.id}${p.name}`.toLowerCase().includes(search.toLowerCase())), [search]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) {
        try { setStore(JSON.parse(saved) as DemoStore); } catch { setStore(emptyDemoStore); }
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [loaded, store]);

  const markValidation = () => {
    const action: ValidationAction = { id: `${selected.id}-${Date.now()}`, parcelId: selected.id, parcelName: selected.name, createdAt: new Date().toISOString() };
    if (offline) {
      setStore((current) => ({ ...current, queue: enqueueValidation(current.queue, action) }));
      setNotice('Validarea este salvată local și așteaptă sincronizarea demo.');
    } else {
      const flushed = flushValidationQueue([action], new Date().toISOString());
      setStore((current) => ({ queue: current.queue, history: [...current.history, ...flushed.history] }));
      setNotice('Validarea a fost adăugată în istoricul local al demo-ului.');
    }
  };

  const syncDemo = () => {
    if (offline || store.queue.length === 0) return;
    const flushed = flushValidationQueue(store.queue, new Date().toISOString());
    setStore((current) => ({ queue: flushed.queue, history: [...current.history, ...flushed.history] }));
    setNotice(`${flushed.history.length} validări au fost mutate în istoricul local al demo-ului.`);
  };

  const resetDemo = () => { setStore(emptyDemoStore); setNotice('Datele locale ale demo-ului au fost șterse.'); };
  const queuedLabel = store.queue.length === 1 ? 'validare în așteptare' : 'validări în așteptare';

  return <SafeAreaView style={styles.safe}><StatusBar style="dark"/><ScrollView contentContainerStyle={styles.container}>
    <View style={styles.header}><View><Text style={styles.kicker}>OPERARE TEREN · DEMO</Text><Text style={styles.title}>Field Registry</Text></View>
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: !offline }} accessibilityLabel="Schimbă modul online sau offline" style={[styles.mode, offline && styles.modeOffline]} onPress={() => { setOffline((value) => !value); setNotice(''); }}><Text style={styles.modeDot}>{offline ? '○' : '●'}</Text><Text style={styles.modeText}>{offline ? 'Offline' : 'Online'}</Text></Pressable>
    </View>
    <View style={styles.hero}><Text style={styles.heroTitle}>Validare în teren</Text><Text style={styles.heroText}>Selectează o parcelă sintetică și înregistrează observația local.</Text><View style={styles.search}><Text style={styles.searchIcon}>⌕</Text><TextInput accessibilityLabel="Caută parcele" placeholder="Caută fermier sau ID" value={search} onChangeText={setSearch} style={styles.input}/></View></View>
    <View style={[styles.banner, offline ? styles.bannerOffline : styles.bannerOnline]}><Text style={styles.bannerTitle}>{offline ? 'Mod offline activ' : 'Mod online activ'}</Text><Text style={styles.bannerText}>{offline ? 'Acțiunile rămân pe acest dispozitiv până alegi sincronizarea demo.' : 'Poți muta explicit coada locală în istoricul sintetic.'}</Text></View>
    <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Lista de lucru</Text><Text style={styles.count}>{filtered.length} parcele</Text></View>
    {filtered.map((p) => <Pressable accessibilityRole="button" accessibilityLabel={`Selectează parcela ${p.id}`} key={p.id} onPress={() => setSelected(p)} style={[styles.card, selected.id === p.id && styles.cardActive]}><View style={[styles.statusDot, p.status !== 'Validată' && styles.statusReview]}/><View style={styles.cardBody}><Text style={styles.cardId}>{p.id}</Text><Text style={styles.cardName}>{p.name}</Text><Text style={styles.cardMeta}>{p.crop} · {p.area}</Text></View><Text style={styles.chevron}>›</Text></Pressable>)}
    <View style={styles.detail}><Text style={styles.detailKicker}>PARCELĂ SELECTATĂ</Text><Text style={styles.detailTitle}>{selected.name}</Text><View style={styles.detailRow}><Text style={styles.detailLabel}>ID / status</Text><Text style={styles.detailValue}>{selected.id} · {selected.status}</Text></View><View style={styles.detailRow}><Text style={styles.detailLabel}>Centroid</Text><Text style={styles.detailValue}>47.0200, 28.8400</Text></View><Text style={styles.helper}>Centroid sintetic, afișat doar pentru acest demo local.</Text><Pressable accessibilityRole="button" style={styles.primary} onPress={markValidation}><Text style={styles.primaryText}>Marchează validarea local</Text></Pressable></View>
    <View style={styles.queue}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>Coada locală</Text><Text style={styles.queueCount}>{store.queue.length}</Text></View><Text style={styles.queueText}>{store.queue.length ? `${store.queue.length} ${queuedLabel}.` : 'Nu există validări care așteaptă sincronizarea.'}</Text>{store.queue.length > 0 && <Text style={styles.queueItems}>{store.queue.map((item) => `${item.parcelId} · ${formatTime(item.createdAt)}`).join('\n')}</Text>}<Pressable accessibilityRole="button" accessibilityState={{ disabled: offline || store.queue.length === 0 }} style={[styles.secondary, (offline || store.queue.length === 0) && styles.disabled]} disabled={offline || store.queue.length === 0} onPress={syncDemo}><Text style={styles.secondaryText}>Sincronizează demo</Text></Pressable></View>
    {!!notice && <View accessibilityLiveRegion="polite" style={styles.notice}><Text style={styles.noticeText}>{notice}</Text></View>}
    <View style={styles.history}><Text style={styles.sectionTitle}>Istoric local sintetic</Text>{store.history.length === 0 ? <Text style={styles.empty}>Nicio validare finalizată în această sesiune demo.</Text> : store.history.slice().reverse().map((item: DemoHistoryItem) => <View key={item.id} style={styles.historyItem}><Text style={styles.historyName}>{item.parcelName}</Text><Text style={styles.historyMeta}>{item.parcelId} · mutată local la {formatTime(item.syncedAt)}</Text></View>)}</View>
    <Pressable accessibilityRole="button" onPress={resetDemo} style={styles.reset}><Text style={styles.resetText}>Resetează demo-ul local</Text></Pressable><Text style={styles.footer}>Date sintetice · fără GPS real · fără backend sau sincronizare guvernamentală</Text>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:'#f5f8f6'},container:{padding:20,paddingBottom:40},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24},kicker:{fontSize:10,letterSpacing:1.5,color:'#9aaea8',fontWeight:'700'},title:{fontSize:27,fontWeight:'700',color:'#173d38',marginTop:5},mode:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'#e9f6ef',paddingHorizontal:10,paddingVertical:7,borderRadius:20},modeOffline:{backgroundColor:'#fff3df'},modeDot:{fontSize:12,color:'#2baf7e'},modeText:{fontSize:11,color:'#317a62',fontWeight:'600'},hero:{backgroundColor:'#0b6f5c',borderRadius:18,padding:20,marginBottom:12},heroTitle:{color:'#fff',fontSize:21,fontWeight:'700'},heroText:{color:'#cce6dc',fontSize:13,lineHeight:19,marginTop:5,marginBottom:18},search:{height:44,backgroundColor:'#fff',borderRadius:10,flexDirection:'row',alignItems:'center',paddingHorizontal:12},searchIcon:{fontSize:22,color:'#789088'},input:{flex:1,fontSize:13,marginLeft:8,color:'#173d38'},banner:{borderRadius:12,padding:14,marginBottom:24,borderWidth:1},bannerOffline:{backgroundColor:'#fff7e9',borderColor:'#f0d49e'},bannerOnline:{backgroundColor:'#eef8f3',borderColor:'#b9dfce'},bannerTitle:{fontSize:13,fontWeight:'700',color:'#28534b'},bannerText:{fontSize:12,lineHeight:17,color:'#57736c',marginTop:3},sectionHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},sectionTitle:{fontSize:16,fontWeight:'700',color:'#173d38'},count:{fontSize:12,color:'#819692'},card:{backgroundColor:'#fff',borderRadius:13,padding:15,marginBottom:9,flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:'#e1ebe6'},cardActive:{borderColor:'#8cc8b2',shadowColor:'#0b6f5c',shadowOpacity:.08,shadowRadius:8},statusDot:{width:9,height:9,borderRadius:6,backgroundColor:'#2eae83',marginRight:12},statusReview:{backgroundColor:'#e4a03b'},cardBody:{flex:1},cardId:{fontSize:12,fontWeight:'700',color:'#214a42'},cardName:{fontSize:13,color:'#45685f',marginTop:3},cardMeta:{fontSize:11,color:'#9aaea8',marginTop:4},chevron:{fontSize:23,color:'#9aaea8'},detail:{backgroundColor:'#fff',borderRadius:16,padding:18,marginTop:12,borderWidth:1,borderColor:'#e1ebe6'},detailKicker:{fontSize:10,letterSpacing:1.3,color:'#9aaea8',fontWeight:'700'},detailTitle:{fontSize:19,fontWeight:'700',color:'#173d38',marginTop:7,marginBottom:16},detailRow:{flexDirection:'row',justifyContent:'space-between',paddingVertical:9,borderTopWidth:1,borderTopColor:'#eef3f0'},detailLabel:{fontSize:12,color:'#819692'},detailValue:{fontSize:12,color:'#28534b',fontWeight:'600'},helper:{fontSize:11,lineHeight:16,color:'#819692',marginTop:9},primary:{backgroundColor:'#0b6f5c',paddingVertical:13,borderRadius:9,alignItems:'center',marginTop:16},primaryText:{color:'#fff',fontSize:13,fontWeight:'700'},queue:{backgroundColor:'#fff',borderRadius:16,padding:18,marginTop:14,borderWidth:1,borderColor:'#e1ebe6'},queueCount:{fontSize:12,fontWeight:'700',color:'#317a62',backgroundColor:'#e9f6ef',paddingHorizontal:8,paddingVertical:3,borderRadius:12},queueText:{fontSize:12,color:'#57736c',lineHeight:18},queueItems:{fontSize:11,color:'#28534b',lineHeight:18,marginTop:10},secondary:{borderWidth:1,borderColor:'#0b6f5c',paddingVertical:12,borderRadius:9,alignItems:'center',marginTop:15},secondaryText:{color:'#0b6f5c',fontSize:13,fontWeight:'700'},disabled:{opacity:.4},notice:{backgroundColor:'#e9f6ef',borderRadius:10,padding:12,marginTop:14},noticeText:{fontSize:12,color:'#28534b',lineHeight:17},history:{marginTop:24},empty:{fontSize:12,color:'#819692',marginTop:10},historyItem:{borderTopWidth:1,borderTopColor:'#e1ebe6',paddingVertical:10},historyName:{fontSize:12,fontWeight:'700',color:'#28534b'},historyMeta:{fontSize:11,color:'#819692',marginTop:3},reset:{alignItems:'center',marginTop:24,padding:10},resetText:{fontSize:12,color:'#9a5b30',fontWeight:'600'},footer:{textAlign:'center',color:'#9aaea8',fontSize:10,lineHeight:15,marginTop:8} });
