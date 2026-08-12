# Farm Registry Mobile

Aplicație **mobile-first, Romanian-first** pentru operatorul care lucrează pe teren și are nevoie de un flux offline transparent: poate consulta parcele, înregistra activitatea și vedea ce rămâne în coada locală înainte de un flush controlat de utilizator.

[Deschide aplicația live →](https://farm-registry-mobile.vercel.app)

## Pentru operatori: fluxurile disponibile

UI-ul actual acoperă următoarele roluri și fluxuri locale:

- **Operator de teren:** pornește din dashboardul de tură, unde vede sarcinile, termenele, acțiunile din coadă și sarcinile finalizate.
- **Operator de teren:** caută și filtrează parcele după fermă, parcelă, cultură și starea de lucru, apoi deschide detaliul unei parcele.
- **Operator de teren:** consultă cultura, suprafața, statusul, operatorul, sarcinile și observațiile din fișa parcelei; creează sau actualizează sarcini local.
- **Operator de teren:** validează și salvează observații, apoi poate verifica jurnalul local de audit al acțiunilor efectuate.
- **Operator de teren:** controlează explicit comutarea Offline / Online și flush-ul local al cozii, inclusiv retry-ul după un eșec simulat.

## Model offline

Aplicația pornește din fixtures locale. `AsyncStorage` păstrează local sarcinile, observațiile, auditul și outbox-ul între reîncărcări. Pentru modificările de sarcini și observații, `client_action_id` oferă idempotency în coada locală, astfel încât aceeași acțiune să nu fie adăugată de două ori.

Fiecare element din outbox are starea `pending`, `synced` sau `failed`. Fluxul poate simula retry și failure. Comutatorul Offline / Online permite rularea unui **flush numai local**: actualizează starea și auditul din aplicație, fără să trimită date la un server.

## API și limite de conectare

Există un `src/apiClient.ts` opțional și variabila `EXPO_PUBLIC_FARM_REGISTRY_API_URL`, însă acestea **nu sunt conectate la UI-ul vizibil**. Aplicația rămâne pe fixtures și pe fluxul offline local chiar dacă endpointul este configurat.

Farm Registry Mobile nu este conectată la API-ul Render; [documentația Farm Registry API](https://farm-registry-api-demo.onrender.com/docs) descrie un backend separat, nu o sursă de date pentru această aplicație.

## Stack

- Expo 52
- React 18 și React Native 0.76
- TypeScript 5.6
- React Native Web și React DOM pentru preview/export web
- `@react-native-async-storage/async-storage` pentru stocarea locală

## Rulare locală și export

```bash
npm ci
npm start
```

Scripturile disponibile sunt:

```bash
npm run android    # Expo pe Android
npm run ios        # Expo pe iOS
npm run typecheck  # verificare TypeScript
npm test           # teste Node pentru logica locală
npm run export:web # export static Expo Web
```

## Dovezi

- [Arhitectură](docs/architecture.md)
- [Matrice de dovezi](docs/evidence-matrix.md)

## Date și limite

Acest produs folosește exclusiv date sintetice: 6 ferme fictive și 12 parcele fictive. Numele, identificatorii `FR-SYN-*`, localitățile, suprafețele, sarcinile, observațiile și metadatele foto sunt fictive.

Nu sunt incluse date private reale, coordonate GPS reale, date cadastrale reale, date despre persoane sau secrete. Nu există sincronizare pe server, backend persistent, integrări reale sau afirmații de pregătire pentru producție. Un sistem de producție ar necesita separat autentificare, autorizare, protecția datelor, persistență și audit de securitate.

## Proiecte asociate

- [Farm Registry Web](https://github.com/luciandanileico94-dev/farm-registry-web) — client web separat.
- [Farm Registry Python Tools](https://github.com/luciandanileico94-dev/farm-registry-python-tools) — backend FastAPI demonstrativ și contracte HTTP asociate.
