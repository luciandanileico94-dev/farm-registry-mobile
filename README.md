# Farm Registry Mobile

Clientul mobil Expo/React Native pentru fluxul offline al operatorului din Farm Registry. Interfața este în primul rând în română și folosește numai date locale, deterministe și sintetice: 12 parcele în 6 ferme fictive, sarcini, observații și audit local.

## Important: ce este și ce nu este

Acesta este **Farm Registry Mobile**, clientul mobil al spațiului Farm Registry. Nu este `field-mobile-demo`, proiectul separat pentru showcase generic de teren. Cele două pot ilustra concepte apropiate, dar nu împart date, backend sau promisiuni de integrare.

Aplicația de aici nu publică date personale, coordonate reale, ID-uri cadastrale, credențiale sau endpoint-uri de producție. Numele fermelor, ID-urile `FR-SYN-*`, suprafețele, sarcinile și metadatele foto sunt inventate pentru demonstrație.

## Pornire

```bash
npm ci
npx expo start
```

Pentru verificări locale:

```bash
npm run typecheck
npm test
npm run export:web
```

## Fluxul aplicației

- Panoul arată sarcinile alocate, termenele de azi, acțiunile din outbox și sarcinile finalizate.
- Lista de lucru poate fi căutată după fermă, parcelă sau cultură și filtrată după azi, necesită acțiune sau sincronizare.
- Fișa parcelei include cultură, suprafață, status, operator, sarcini, observații și audit local.
- O observație cere o notă de cel puțin 10 caractere și o condiție/status. Metadatele foto opționale sunt un fixture sintetic; aplicația nu solicită camera.
- Sarcinile existente trec prin stări de lucru (`de început`, `în lucru`, `finalizat`). O sarcină nouă pornește ca `Schiță`, apoi poate fi trimisă în outbox.
- Fiecare observație sau schimbare de sarcină primește un `client_action_id` idempotent. Outbox-ul are stările `pending`, `synced` și `failed`, permite retry și poate simula explicit un eșec.
- Modul online/offline este controlat manual. Sincronizarea este un flush local demonstrativ; în modul offline butonul este dezactivat.
- AsyncStorage persistă store-ul local la reîncărcare. „Resetează demo-ul local” restaurează fixtures și golește observațiile, auditul și outbox-ul.

## Relația Web / Python

Interfața este construită în React Native + Expo și poate fi previzualizată pe Android, iOS sau Expo Web. `npm run export:web` exportă o variantă statică pentru previzualizare; aceasta nu transformă proiectul într-un backend și nu adaugă capabilități native.

`src/apiClient.ts` definește granița pentru viitorul serviciu FastAPI: `GET /fields`, `GET /tasks` și `POST /observations`. Clientul API este creat doar când este setată explicit variabila `EXPO_PUBLIC_FARM_REGISTRY_API_URL`; showcase-ul implicit rămâne în modul fixtures/local și nu conține un URL inventat sau implementat în producție. Backend-ul Python nu face parte din acest repository și nu este pornit de aplicație.

## Limite sintetice

Acest workspace nu validează cadastru, nu citește GPS, nu deschide camera, nu face geofencing, nu verifică identitatea fermierilor și nu sincronizează cu registre guvernamentale. „Online” în demo înseamnă doar că operatorul a permis flush-ul local; fără serviciu FastAPI configurat, nicio acțiune nu părăsește dispozitivul.

## Teste

Testele Node acoperă păstrarea cozii existente, deduplicarea prin `client_action_id`, retry după eșec, filtrarea listei, validarea observației și serializarea pentru persistență. Typecheck-ul verifică aplicația Expo și modulele TypeScript.
