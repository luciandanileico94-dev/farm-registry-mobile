# Field Registry Mobile

Demo mobil React Native / Expo pentru un portofoliu de achiziții publice. Interfața folosește exclusiv date sintetice și nu se conectează la API-uri, utilizatori sau servicii reale.

## Rulare

```bash
npm ci
npx expo start
```

Deschide aplicația în Expo Go sau într-un simulator Android/iOS.

## Preview web

Exportul web folosește calea oficială Expo pentru SDK 57:

```bash
npm run export:web
```

Artefactul static este generat în `dist/`. Workflow-ul [`deploy-pages.yml`](./.github/workflows/deploy-pages.yml) îl publică în GitHub Pages după activarea Pages pentru repository și rularea workflow-ului.

Live preview: nu este încă publicat. Nu există un URL live verificabil înainte de primul deployment; URL-ul generat de GitHub Pages va fi afișat în sumarul workflow-ului.

## Verificare

```bash
npm run typecheck
npm test -- --runInBand
```

Testele folosesc Jest cu presetul oficial `jest-expo` și React Native Testing Library (RNTL). Verificările de geometrie și reducer sunt în [`__tests__/geometry.test.ts`](./__tests__/geometry.test.ts) și [`__tests__/taskState.test.ts`](./__tests__/taskState.test.ts), iar comportamentul UI este verificat în [`__tests__/App.test.tsx`](./__tests__/App.test.tsx). CI rulează aceleași verificări după `npm ci`.

## Ce funcționează în demo

- Toate numele și ID-urile afișate sunt marcate explicit ca date synthetic de demo (`SYNTH-*`); nu identifică persoane sau exploatații reale.
- Căutarea filtrează parcelele după ID și fermier.
- Selectarea unei parcele actualizează fișa și centroidul calculat din poligonul synthetic al parcelei.
- „Salvează validarea locală” schimbă statusul în `Validată` și îl persistă local prin AsyncStorage.
- Comutatorul online/offline este explicit o conexiune simulată pentru demonstrație; nu pretinde sincronizare cu un server. Statusurile locale rămân disponibile pe dispozitiv când nu există conexiune.

## Limitări

Nu există backend, autentificare, hartă, GPS, sincronizare reală, validare cadastrală, utilizatori sau experiență de review. Persistența este locală și specifică dispozitivului. Centroidul folosește formula planarǎ pentru poligoane mici, synthetic; nu este o operație geodezică pentru producție.

## Notă post-submission

Această versiune aplică hardening post-submission cu scop restrâns: acțiuni UI funcționale, stare locală persistentă și centroid derivat din geometrie, păstrând datele synthetic și tag-ul de submission.

Submission tag: `submission-21663739-2026-08-12`
