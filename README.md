# Farm Registry Mobile

[**Live Expo Web preview →**](https://farm-registry-mobile.vercel.app)

O aplicație mobile-first pentru lucrul operatorului agricol în teren: oferă un panou de tură, navigare și filtrare a parcelelor, fișe operaționale, sarcini și observații păstrate într-un outbox local. Proiectul este un demo Expo / React Native în limba română, conceput să rămână utilizabil fără rețea și să facă starea sincronizării vizibilă.

> **Demo cu date sintetice.** Preview-ul public nu este un registru oficial și nu este conectat la un API live. Toate fermele, parcelele, persoanele, suprafețele, sarcinile, observațiile și metadatele foto sunt fixtures fictive.

## Experiența de produs

### Panou și listă de lucru

- Rezumatul turei arată sarcinile alocate, termenele zilei, acțiunile din coadă și sarcinile finalizate.
- Cele 12 parcele din 6 ferme fictive pot fi căutate după ID, nume, fermă sau cultură.
- Filtrele **Toate**, **Azi**, **Acțiune** și **Sync** restrâng lista după activitatea relevantă.

### Fișa parcelei

- Detaliul reunește cultura, suprafața, statusul, operatorul și ID-ul sintetic al parcelei.
- Sarcinile pot fi create ca schițe, trimise în coadă și mutate între `de început`, `în lucru` și `finalizat`.
- Observațiile validează nota și condiția înainte de salvare; metadatele foto opționale sunt tot un fixture, nu rezultatul accesării camerei.
- Istoricul de audit local explică acțiunile efectuate în sesiune.

### Offline, outbox și sync demonstrativ

- `AsyncStorage` păstrează sarcinile, observațiile, auditul și outbox-ul între reîncărcări.
- Observațiile și mutațiile de sarcini primesc un `client_action_id`; coada evită duplicatele cu același identificator.
- Elementele trec prin stările `pending`, `synced` și `failed`, iar eșecurile simulate pot fi reîncercate.
- Comutatorul Offline / Online controlează dacă poate fi inițiat flush-ul.
- **Sincronizarea actuală este exclusiv locală.** Modul Online nu contactează un server; el rulează adaptorul demonstrativ din `src/offlineQueue.ts` și actualizează istoricul local.

## Arhitectură și proiecte asociate

```text
Farm Registry Mobile (acest repository)
├── App.tsx                    interfață, navigare și orchestrarea stării
├── src/fixtures.ts            model și dataset sintetic determinist
├── src/workspaceLogic.ts      căutare, filtre, validare și serializare
├── src/offlineQueue.ts        outbox idempotent, failure și retry local
└── src/apiClient.ts           graniță HTTP opțională, încă neconectată la fluxurile UI

Farm Registry Web             client web operațional separat
Farm Registry Python Tools    FastAPI / SQLite demo și contracte HTTP compatibile
```

- [Farm Registry Web](https://github.com/luciandanileico94-dev/farm-registry-web) este workspace-ul web separat pentru dashboard, hartă și administrarea parcelelor. Nu partajează runtime sau stare locală cu aplicația mobilă.
- [Farm Registry Python Tools](https://github.com/luciandanileico94-dev/farm-registry-python-tools) conține serviciul FastAPI demonstrativ. Endpoint-urile sale `GET /fields`, `GET /tasks` și `POST /observations` corespund interfeței definite de `src/apiClient.ts`.

`EXPO_PUBLIC_FARM_REGISTRY_API_URL` poate construi clientul HTTP opțional, dar aplicația curentă nu folosește acel client pentru încărcarea sau trimiterea datelor. Toate fluxurile vizibile continuă să lucreze cu fixtures și outbox-ul local; simpla setare a variabilei nu activează o integrare end-to-end.

Repository-ul Python include un blueprint `render.yaml` pregătit pentru Render. **Serviciul nu este deployed și nu există un URL public al API-ului.** Proprietarul trebuie încă să conecteze repository-ul, să confirme blueprint-ul și să configureze explicit originile CORS înainte ca API-ul să poată fi folosit dintr-un client public.

## Stack

| Zonă | Tehnologie existentă |
| --- | --- |
| Aplicație | Expo 52, React 18, React Native 0.76 |
| Limbaj | TypeScript 5.6 |
| Web preview | React Native Web, React DOM, Expo static export |
| Persistență locală | `@react-native-async-storage/async-storage` |
| Verificare | TypeScript (`tsc`) și test runner-ul integrat Node.js |

Proiectul nu folosește Redux sau Playwright.

## Rulare locală

```bash
npm ci
npm start
```

Comenzile disponibile prin scripturile din `package.json`:

```bash
npm start          # pornește Expo
npm run android    # pornește ținta Android prin Expo
npm run ios        # pornește ținta iOS prin Expo
npm run typecheck  # verifică TypeScript fără emit
npm test           # compilează modulele testate și rulează testele Node
npm run export:web # generează exportul static Expo Web
```

Testele acoperă deduplicarea outbox-ului, failure/retry, filtrarea listei, validarea observațiilor și serializarea stării locale.

## Limita datelor și a securității

Acest repository și preview-ul său public folosesc numai date sintetice, potrivite pentru demonstrație. Nu trebuie introduse sau comise:

- secrete, token-uri, parole ori credențiale;
- date personale sau date reale despre clienți;
- coordonate GPS private sau trasee ale operatorilor;
- identificatori cadastrali reali ori extrase din registre;
- date confidențiale despre ferme sau exploatații.

Aplicația nu solicită GPS-ul sau camera, nu validează cadastru, nu face geofencing și nu comunică cu registre guvernamentale. ID-urile `FR-SYN-*`, numele, localitățile, suprafețele și metadatele foto din demo sunt inventate. Folosește doar date publice ori sintetice în orice deployment demonstrativ; o integrare reală ar necesita separat autentificare, autorizare, protecția datelor, persistență de producție și audit de securitate.
