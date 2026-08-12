import type { SyncStatus } from './offlineQueue';

export type FieldStatus = 'validat' | 'în verificare' | 'necesită acțiune';
export type TaskState = 'de început' | 'în lucru' | 'finalizat';

export type Farm = {
  id: string;
  name: string;
  locality: string;
};

export type Field = {
  id: string;
  farmId: string;
  name: string;
  crop: string;
  areaHa: number;
  status: FieldStatus;
  assignedTo: string;
};

export type Task = {
  id: string;
  fieldId: string;
  title: string;
  dueDate: string;
  priority: 'ridicată' | 'normală' | 'scăzută';
  state: TaskState;
  syncStatus: SyncStatus;
  assignedTo: string;
};

export type Observation = {
  id: string;
  fieldId: string;
  note: string;
  condition: FieldStatus;
  photoMetadata?: {
    fileName: string;
    width: number;
    height: number;
    source: 'synthetic-fixture';
  };
  createdAt: string;
  clientActionId: string;
  syncStatus: Exclude<SyncStatus, 'draft'>;
};

export type AuditEntry = {
  id: string;
  fieldId: string;
  label: string;
  detail: string;
  createdAt: string;
};

export type MobileStore = {
  tasks: Task[];
  observations: Observation[];
  outbox: import('./offlineQueue').OutboxItem[];
  audit: AuditEntry[];
};

export const DEMO_TODAY = '2026-08-12';

export const farms: Farm[] = [
  { id: 'farm-01', name: 'Ferma Dealul Verde', locality: 'Călărași' },
  { id: 'farm-02', name: 'Gospodăria Valea Lină', locality: 'Ialoveni' },
  { id: 'farm-03', name: 'Agro Lunca Mică', locality: 'Orhei' },
  { id: 'farm-04', name: 'Cooperativa Mesteacăn', locality: 'Hîncești' },
  { id: 'farm-05', name: 'Ferma Soarelui Sintetic', locality: 'Ungheni' },
  { id: 'farm-06', name: 'Loturile Nordului', locality: 'Bălți' },
];

export const fields: Field[] = [
  { id: 'FR-SYN-0001', farmId: 'farm-01', name: 'Parcela Stejar', crop: 'Grâu de toamnă', areaHa: 42.8, status: 'validat', assignedTo: 'Ana M.' },
  { id: 'FR-SYN-0002', farmId: 'farm-01', name: 'Parcela Izvor', crop: 'Porumb', areaHa: 18.3, status: 'în verificare', assignedTo: 'Ana M.' },
  { id: 'FR-SYN-0003', farmId: 'farm-02', name: 'Lotul Livezii', crop: 'Măr', areaHa: 12.6, status: 'necesită acțiune', assignedTo: 'Radu P.' },
  { id: 'FR-SYN-0004', farmId: 'farm-02', name: 'Lotul Fagului', crop: 'Floarea-soarelui', areaHa: 64.1, status: 'validat', assignedTo: 'Radu P.' },
  { id: 'FR-SYN-0005', farmId: 'farm-03', name: 'Tarlaua Morii', crop: 'Orz', areaHa: 27.4, status: 'în verificare', assignedTo: 'Mihai C.' },
  { id: 'FR-SYN-0006', farmId: 'farm-03', name: 'Tarlaua Mică', crop: 'Viță-de-vie', areaHa: 9.8, status: 'validat', assignedTo: 'Mihai C.' },
  { id: 'FR-SYN-0007', farmId: 'farm-04', name: 'Câmpul Alb', crop: 'Soia', areaHa: 36.2, status: 'necesită acțiune', assignedTo: 'Ioana D.' },
  { id: 'FR-SYN-0008', farmId: 'farm-04', name: 'Câmpul Nou', crop: 'Lucernă', areaHa: 21.7, status: 'validat', assignedTo: 'Ioana D.' },
  { id: 'FR-SYN-0009', farmId: 'farm-05', name: 'Răsărit 1', crop: 'Rapiță', areaHa: 48.5, status: 'în verificare', assignedTo: 'Victor T.' },
  { id: 'FR-SYN-0010', farmId: 'farm-05', name: 'Răsărit 2', crop: 'Porumb', areaHa: 51.9, status: 'validat', assignedTo: 'Victor T.' },
  { id: 'FR-SYN-0011', farmId: 'farm-06', name: 'Nordul Mare', crop: 'Grâu de primăvară', areaHa: 73.3, status: 'în verificare', assignedTo: 'Elena S.' },
  { id: 'FR-SYN-0012', farmId: 'farm-06', name: 'Nordul Mic', crop: 'Cartof', areaHa: 14.2, status: 'necesită acțiune', assignedTo: 'Elena S.' },
];

const task = (id: string, fieldId: string, title: string, dueDate: string, priority: Task['priority'], state: TaskState = 'de început'): Task => ({
  id, fieldId, title, dueDate, priority, state, syncStatus: 'synced', assignedTo: fields.find((field) => field.id === fieldId)?.assignedTo ?? 'Operator local',
});

export const fixtureTasks: Task[] = [
  task('task-001', 'FR-SYN-0001', 'Verifică limita de cultură', DEMO_TODAY, 'ridicată', 'în lucru'),
  task('task-002', 'FR-SYN-0001', 'Confirmă cultura declarată', '2026-08-14', 'normală', 'finalizat'),
  task('task-003', 'FR-SYN-0002', 'Notează starea culturii', DEMO_TODAY, 'ridicată'),
  task('task-004', 'FR-SYN-0002', 'Atașează observația operatorului', '2026-08-15', 'normală'),
  task('task-005', 'FR-SYN-0003', 'Revizuiește neconformitatea', DEMO_TODAY, 'ridicată'),
  task('task-006', 'FR-SYN-0004', 'Verifică suprafața raportată', '2026-08-13', 'normală'),
  task('task-007', 'FR-SYN-0005', 'Completează vizita de control', DEMO_TODAY, 'normală'),
  task('task-008', 'FR-SYN-0006', 'Închide fișa de teren', '2026-08-11', 'scăzută', 'finalizat'),
  task('task-009', 'FR-SYN-0007', 'Solicită clarificare fermier', DEMO_TODAY, 'ridicată'),
  task('task-010', 'FR-SYN-0008', 'Confirmă irigarea', '2026-08-16', 'normală'),
  task('task-011', 'FR-SYN-0009', 'Verifică data însămânțării', DEMO_TODAY, 'normală'),
  task('task-012', 'FR-SYN-0010', 'Fotografie sintetică de referință', '2026-08-14', 'scăzută'),
  task('task-013', 'FR-SYN-0011', 'Compară suprafața cu registrul local', DEMO_TODAY, 'ridicată'),
  task('task-014', 'FR-SYN-0011', 'Adaugă notă de sezon', '2026-08-17', 'scăzută'),
  task('task-015', 'FR-SYN-0012', 'Marchează acțiunea necesară', DEMO_TODAY, 'ridicată'),
  task('task-016', 'FR-SYN-0012', 'Programează revenirea', '2026-08-18', 'normală'),
  task('task-017', 'FR-SYN-0004', 'Controlează parcela vecină', '2026-08-19', 'scăzută'),
  task('task-018', 'FR-SYN-0009', 'Verifică starea solului', '2026-08-20', 'normală'),
];

export const emptyMobileStore: MobileStore = {
  tasks: fixtureTasks,
  observations: [],
  outbox: [],
  audit: [],
};

export const farmById = (farmId: string) => farms.find((farm) => farm.id === farmId);
export const fieldById = (fieldId: string) => fields.find((field) => field.id === fieldId);

export const isToday = (date: string) => date === DEMO_TODAY;
