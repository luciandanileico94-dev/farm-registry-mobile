# Arhitectura demonstrației mobile

## Scop și limită

Farm Registry Mobile este o demonstrație Romanian-first, mobile-first, care rulează pe un spațiu de lucru local. Interfața vizibilă citește și modifică starea React din [`App.tsx`](../App.tsx); nu încarcă ferme, parcele, sarcini sau observații prin HTTP.

Toate fermele, parcelele și sarcinile inițiale sunt fixtures deterministe și sintetice. Fluxul demonstrativ nu reprezintă sincronizare cu un server, conectivitate Render, backend persistent, pregătire pentru producție ori folosirea unor date reale GPS, cadastrale sau private.

## Fluxul datelor verificat

```text
Utilizator
    |
    v
App.tsx / workspace React local
    |
    +--> fixtures.ts (ferme, parcele și sarcini sintetice)
    |
    +--> workspaceLogic.ts (filtrare, validare, serializare)
    |
    +--> AsyncStorage (încărcare și persistență locală în App.tsx)
    |        |
    |        +--> offlineQueue.ts (outbox idempotent, flush local, eșec/retry)
    |        |
    |        +--> audit local în MobileStore
    |
    x--> apiClient.ts (graniță HTTP opțională, neconectată la datele UI)
```

Marcajul `x-->` indică o graniță definită, dar nefolosită pentru citirea sau scrierea datelor vizibile. [`App.tsx`](../App.tsx) construiește clientul numai pentru a afișa dacă variabila de mediu este configurată; nu apelează `getFields`, `getTasks` sau `postObservation`.

## Componente și responsabilități

### Interfață și spațiu de lucru local

[`App.tsx`](../App.tsx) deține `MobileStore` în starea React și compune panoul, lista filtrată, fișa parcelei, formularele, coada și auditul local. Acțiunile utilizatorului actualizează această stare în memorie înainte ca ea să fie serializată local.

La inițializare, `cloneInitialStore` pornește de la `fixtureTasks` și colecții goale pentru observații, outbox și audit. `parseMobileStore` acceptă numai structura locală așteptată și revine la fixtures atunci când valoarea salvată nu este utilizabilă.

### Date sintetice deterministe

[`src/fixtures.ts`](../src/fixtures.ts) definește tipurile și valorile inițiale: `farms`, `fields`, `fixtureTasks`, `DEMO_TODAY`, `emptyMobileStore`, `farmById`, `fieldById` și `isToday`. Identificatorii de parcelă `FR-SYN-*`, localitățile, suprafețele, operatorii și metadatele foto sunt date demonstrative, nu înregistrări reale.

### Logică de lucru

[`src/workspaceLogic.ts`](../src/workspaceLogic.ts) separă trei operații pure:

- `filterFields` aplică interogarea și filtrele locale pentru azi, acțiune și sync;
- `validateObservation` cere o notă de minimum 10 caractere și o condiție;
- `serializeMobileStore` transformă întregul store local în JSON.

### Persistență locală

Persistența este implementată direct în [`App.tsx`](../App.tsx), nu într-un fișier `src/persistence.ts` în starea curentă a depozitului. `AsyncStorage.getItem(STORAGE_KEY)` restaurează store-ul, iar `AsyncStorage.setItem(STORAGE_KEY, serializeMobileStore(store))` persistă sarcinile, observațiile, outbox-ul și auditul pe dispozitiv.

Aceasta este persistență locală a clientului. Nu dovedește persistență într-un backend, replicare între dispozitive, livrare către server sau garanții de producție.

### Outbox, idempotency și audit local

[`src/offlineQueue.ts`](../src/offlineQueue.ts) definește `OutboxItem` și stările `pending`, `synced` și `failed`:

- `enqueueOutbox` refuză încă o intrare cu același `clientActionId`, reprezentarea din cod a conceptului `client_action_id`;
- `syncOutbox` procesează numai intrările `pending`, incrementează `attempts` și le marchează local `synced` sau `failed`;
- `retryFailedOutbox` mută intrările `failed` înapoi în `pending` și elimină eroarea locală;
- `pendingOutboxCount` numără intrările care încă necesită atenție.

Flush-ul este un adaptor exclusiv local. Nu face request HTTP; eticheta `synced` înseamnă doar că simularea locală a reușit. [`App.tsx`](../App.tsx) adaugă intrări `AuditEntry` în același `MobileStore`, iar AsyncStorage le persistă împreună cu restul stării locale.

### Graniță HTTP opțională și deconectată

[`src/apiClient.ts`](../src/apiClient.ts) expune `createApiClient` și contractul `FarmRegistryApi`. Baza poate proveni din `EXPO_PUBLIC_FARM_REGISTRY_API_URL`, iar metodele disponibile sunt `getFields`, `getTasks` și `postObservation`.

În fluxul vizibil actual, [`App.tsx`](../App.tsx) folosește doar valoarea booleană rezultată din `createApiClient()` pentru bannerul de configurare. Metodele contractului nu sunt apelate, outbox-ul nu este transmis prin acest client, iar configurarea variabilei nu schimbă sursa locală de date.

## Ce poate fi afirmat

Implementarea demonstrează un spațiu de lucru mobil local, fixtures sintetice, validare și filtrare, persistență AsyncStorage, coadă idempotentă după `clientActionId`, stări locale de succes/eșec, retry și audit local.

Implementarea nu demonstrează sincronizare cu serverul, conectivitate Render, backend persistent, integrare API activă, funcționare de producție ori captură și stocare de date reale GPS, cadastrale, foto sau private.
