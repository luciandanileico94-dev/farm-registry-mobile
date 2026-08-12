# Field Registry Mobile

Demo mobil React Native / Expo pentru un portofoliu de achiziții publice. Interfața folosește exclusiv date sintetice și nu se conectează la API-uri, utilizatori sau servicii reale.

## Rulare

```bash
npm ci
npx expo start
```

Deschide aplicația în Expo Go sau într-un simulator Android/iOS.

## Verificare

```bash
npm run typecheck
npm test
```

CI rulează aceleași verificări după `npm ci`.

## Ce funcționează în demo

- Căutarea filtrează parcelele după ID și fermier.
- Selectarea unei parcele actualizează fișa și centroidul calculat din poligonul synthetic al parcelei.
- „Salvează validarea locală” schimbă statusul în `Validată` și îl persistă local prin AsyncStorage.
- Comutatorul online/offline este explicit o conexiune simulată pentru demonstrație; nu pretinde sincronizare cu un server. Statusurile locale rămân disponibile pe dispozitiv când nu există conexiune.

## Limitări

Nu există backend, autentificare, hartă, GPS, sincronizare reală, validare cadastrală, utilizatori sau experiență de review. Persistența este locală și specifică dispozitivului. Centroidul folosește formula planarǎ pentru poligoane mici, synthetic; nu este o operație geodezică pentru producție.

## Notă post-submission

Această versiune aplică hardening post-submission cu scop restrâns: acțiuni UI funcționale, stare locală persistentă și centroid derivat din geometrie, păstrând datele synthetic și tag-ul de submission.

Submission tag: `submission-21663739-2026-08-12`
