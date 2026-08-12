# Farm Registry Mobile

React Native / Expo demo pentru un flux de teren al operatorului. Toate parcelele, numele, coordonatele și evenimentele sunt sintetice și locale: nu există GPS real, date cadastrale, backend, API guvernamental sau sincronizare cu un server.

## Pornire

```bash
npm ci
npx expo start
```

Deschideți proiectul în Expo Go sau într-un simulator Android/iOS. `npm run typecheck` verifică TypeScript, iar `npm test` verifică operațiile cozii.

## Flux offline local

- Selectați o parcelă sintetică și apăsați „Marchează validarea local”.
- În modul Offline, validarea este păstrată persistent în AsyncStorage și apare ca „în așteptarea sincronizării”. Schimbarea modului este observabilă: butonul de sincronizare este dezactivat offline.
- În modul Online, apăsați explicit „Sincronizează demo”. Aceasta mută coada doar în istoricul local sintetic; nu trimite nimic pe internet și nu pretinde sincronizare cu un server.
- Coada și istoricul supraviețuiesc reîncărcării. „Resetează demo-ul local” le golește.

Centroidul afișat este o valoare fixă, sintetică, folosită pentru a ilustra forma datelor. Demo-ul nu validează cadastru și nu furnizează poziționare.

## Limitare Vercel / Expo Web

`npm run export:web` exportă varianta web Expo pentru previzualizare. Vercel poate servi fișierele exportate, dar acest export nu transformă demo-ul într-o aplicație mobilă, nu adaugă GPS real și nu creează backend sau sincronizare. Pentru Vercel este necesară configurarea unui build static care publică directorul `dist` după export.

## Ce demonstrează

- React Native și TypeScript;
- interfață mobile-first pentru operatori;
- coadă offline persistentă și flush local explicit;
- feedback vizibil pentru starea și istoricul demo;
- testare a cozii și export Expo Web.

Aceasta este o demonstrație locală, nu o integrare cu un API de stat.
