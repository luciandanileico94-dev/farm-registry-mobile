# Matrice de dovezi verificabile

Această matrice descrie numai comportamentul observabil în starea curentă a codului. Comenzile se rulează din rădăcina depozitului.

| Capability | Verified evidence | Exact path/symbol | Verification command | Claim boundary |
| --- | --- | --- | --- | --- |
| Spațiu de lucru local în UI | Interfața citește fermele și parcelele din fixtures și ține sarcinile, observațiile, outbox-ul și auditul în starea React `store`. | [`App.tsx`](../App.tsx): `useState`, `cloneInitialStore`, `selectedTasks`, `selectedObservations`, `filterFields` | `rg -n "useState\(cloneInitialStore|selectedTasks|selectedObservations|filterFields\(fields" App.tsx` | Dovedește fluxul local vizibil; nu dovedește citirea datelor prin API. |
| Fixtures sintetice deterministe | Fermele, parcelele și sarcinile inițiale sunt constante în sursă; ID-urile parcelelor folosesc prefixul `FR-SYN-`. | [`src/fixtures.ts`](../src/fixtures.ts): `farms`, `fields`, `fixtureTasks`, `DEMO_TODAY` | `rg -n "export const (DEMO_TODAY|farms|fields|fixtureTasks)|FR-SYN-" src/fixtures.ts` | Sunt date demonstrative; nu sunt GPS, cadastru, fotografii sau date private reale. |
| Filtrare, validare și serializare | Funcții pure filtrează lista, validează observația și serializează întregul `MobileStore`. | [`src/workspaceLogic.ts`](../src/workspaceLogic.ts): `filterFields`, `validateObservation`, `serializeMobileStore` | `rg -n "export const (filterFields|validateObservation|serializeMobileStore)" src/workspaceLogic.ts` | Serializarea JSON pregătește persistența locală; nu trimite și nu validează date pe server. |
| Coadă offline | Elementele outbox au tip, payload, stare și număr de încercări; numai cele `pending` sunt procesate de flush-ul local. | [`src/offlineQueue.ts`](../src/offlineQueue.ts): `OutboxItem`, `enqueueOutbox`, `syncOutbox`, `pendingOutboxCount` | `rg -n "type OutboxItem|enqueueOutbox|syncOutbox|pendingOutboxCount" src/offlineQueue.ts` | „Offline” descrie coada locală; funcția nu contactează un server. |
| Idempotency prin `client_action_id` | `enqueueOutbox` returnează coada neschimbată dacă există deja același `clientActionId`; testul acoperă deduplicarea. | [`src/offlineQueue.ts`](../src/offlineQueue.ts): `OutboxItem.clientActionId`, `enqueueOutbox`; [`__tests__/workspaceLogic.test.js`](../__tests__/workspaceLogic.test.js): testul `outbox deduplicates...` | `npm test` | Idempotency este locală și limitată la coada curentă; codul folosește `clientActionId` pentru conceptul `client_action_id`, fără garanție server-side. |
| Stări `pending` / `synced` / `failed` | `SyncStatus` definește stările, iar `syncOutbox` mută local intrările `pending` în `synced` sau `failed` și incrementează `attempts`. | [`src/offlineQueue.ts`](../src/offlineQueue.ts): `SyncStatus`, `syncOutbox` | `rg -n "type SyncStatus|status: 'failed'|status: 'synced'|attempts: item.attempts" src/offlineQueue.ts` | `synced` este rezultatul adaptorului local, nu confirmarea unui server. |
| Eșec și retry | `forceFailure` produce o eroare simulată; `retryFailedOutbox` revine din `failed` în `pending`, iar UI expune acțiunea Retry. | [`src/offlineQueue.ts`](../src/offlineQueue.ts): `syncOutbox`, `retryFailedOutbox`; [`App.tsx`](../App.tsx): `forceSyncFailure`, `retry`, `QueueCard` | `rg -n "forceFailure|retryFailedOutbox|Retry" src/offlineQueue.ts App.tsx` | Eșecul și retry-ul sunt simulate local; nu demonstrează erori de rețea sau reluarea unui request HTTP. |
| Persistență AsyncStorage | Store-ul este restaurat cu `getItem` și salvat după schimbări cu `setItem` și `serializeMobileStore`; include `tasks`, `observations`, `outbox` și `audit`. | [`App.tsx`](../App.tsx): `STORAGE_KEY`, `parseMobileStore`, `AsyncStorage.getItem`, `AsyncStorage.setItem`; [`src/fixtures.ts`](../src/fixtures.ts): `MobileStore` | `rg -n "STORAGE_KEY|AsyncStorage\.(getItem|setItem)|type MobileStore" App.tsx src/fixtures.ts` | Persistența este locală pe client, implementată în `App.tsx`. În depozitul curent nu există `src/persistence.ts`; nu există dovadă de backend persistent. |
| Audit local | Acțiunile creează `AuditEntry` și le adaugă în `store.audit`, care este inclus în store-ul serializat. | [`App.tsx`](../App.tsx): `audit`, actualizările `store.audit`; [`src/fixtures.ts`](../src/fixtures.ts): `AuditEntry`, `MobileStore.audit` | `rg -n "const audit|audit: \[\.\.\.current\.audit|type AuditEntry|audit: AuditEntry" App.tsx src/fixtures.ts` | Jurnalul este local și controlat de UI; nu este un audit server-side sau de securitate. |
| API HTTP opțional, neconectat la datele UI | Clientul poate fi creat din `EXPO_PUBLIC_FARM_REGISTRY_API_URL`; `App.tsx` verifică doar dacă există pentru banner și nu apelează metodele de date. | [`src/apiClient.ts`](../src/apiClient.ts): `getConfiguredApiBaseUrl`, `createApiClient`, `getFields`, `getTasks`, `postObservation`; [`App.tsx`](../App.tsx): `apiClient`, `apiConfigured` | `rg -n "EXPO_PUBLIC_FARM_REGISTRY_API_URL|createApiClient|getFields|getTasks|postObservation|apiConfigured" src/apiClient.ts App.tsx` | Configurarea URL-ului nu conectează UI-ul sau outbox-ul și nu dovedește conectivitate Render ori sync cu serverul. |
| Comenzi de proiect | Manifestul definește pornirea Expo, verificarea TypeScript, testele locale și exportul web. | [`package.json`](../package.json): `scripts.start`, `scripts.typecheck`, `scripts.test`, `scripts.export:web` | `node -e "const s=require('./package.json').scripts; for (const k of ['start','typecheck','test','export:web']) console.log(k, s[k])"` | Existența scripturilor nu constituie rezultat de test sau dovadă de pregătire pentru producție. |

## Verificarea documentației

Linkurile Markdown relative și titlurile goale se verifică determinist cu această comandă, fără acces la rețea:

```bash
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const files = ['README.md', 'docs/architecture.md', 'docs/evidence-matrix.md'];
let failed = false;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  text.split(/\r?\n/).forEach((line, index) => {
    if (/^#{1,6}\s*$/.test(line)) {
      console.error(`${file}:${index + 1}: titlu gol`);
      failed = true;
    }
  });
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].split('#', 1)[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(target));
    if (!fs.existsSync(resolved)) {
      console.error(`${file}: link inexistent: ${match[1]}`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log(`OK: ${files.length} fișiere, linkuri relative existente, fără titluri goale`);
NODE
```

Rezultatul efectiv al acestei verificări pentru commitul curent trebuie raportat împreună cu rezultatele celorlalte comenzi executate; comanda prezentă aici nu presupune automat succesul lor.
