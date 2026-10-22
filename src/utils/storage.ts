import {
  Client,
  ClothingProduct,
  Installment,
  Invoice,
  Payment,
  StoreSettings,
  SyncQueueItem,
  UserAccount,
} from '../types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_USERS,
  INITIAL_PRODUCTS,
  generateSeedClients,
  generateSeedTransactions,
} from './mockData';

const STORAGE_KEYS = {
  CLIENTS: 'velvet_clients_v2',
  INVOICES: 'velvet_invoices_v2',
  PAYMENTS: 'velvet_payments_v2',
  INSTALLMENTS: 'velvet_installments_v2',
  PRODUCTS: 'velvet_products_v2',
  SETTINGS: 'velvet_settings_v2',
  USERS: 'velvet_users_v2',
  CURRENT_USER: 'velvet_active_user_v2',
  SYNC_QUEUE: 'velvet_sync_queue_v2',
  LAST_SYNC: 'velvet_last_sync_timestamp_v2',
};

export interface AppDatabase {
  clients: Client[];
  invoices: Invoice[];
  payments: Payment[];
  installments: Installment[];
  products: ClothingProduct[];
  settings: StoreSettings;
  users: UserAccount[];
  currentUser: UserAccount;
  syncQueue: SyncQueueItem[];
  lastSyncTime: string;
}

export function loadDatabase(): AppDatabase {
  try {
    const clientsRaw = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    if (!clientsRaw) {
      // Initialize seed data for 2000 clients and Usman Cloth Rehra
      const seedClients = generateSeedClients();
      const { invoices: seedInvoices, payments: seedPayments, installments: seedInstallments } =
        generateSeedTransactions(seedClients);

      const db: AppDatabase = {
        clients: seedClients,
        invoices: seedInvoices,
        payments: seedPayments,
        installments: seedInstallments,
        products: INITIAL_PRODUCTS,
        settings: DEFAULT_SETTINGS,
        users: DEFAULT_USERS,
        currentUser: DEFAULT_USERS[0],
        syncQueue: [],
        lastSyncTime: new Date().toISOString(),
      };

      saveDatabase(db);
      return db;
    }

    const loadedClients: Client[] = JSON.parse(clientsRaw);
    if (loadedClients.length < 2000) {
      const seedClients = generateSeedClients();
      const { invoices: seedInvoices, payments: seedPayments, installments: seedInstallments } =
        generateSeedTransactions(seedClients);
      const db: AppDatabase = {
        clients: seedClients,
        invoices: seedInvoices,
        payments: seedPayments,
        installments: seedInstallments,
        products: INITIAL_PRODUCTS,
        settings: DEFAULT_SETTINGS,
        users: DEFAULT_USERS,
        currentUser: DEFAULT_USERS[0],
        syncQueue: [],
        lastSyncTime: new Date().toISOString(),
      };
      saveDatabase(db);
      return db;
    }

    return {
      clients: loadedClients,
      invoices: JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]'),
      payments: JSON.parse(localStorage.getItem(STORAGE_KEYS.PAYMENTS) || '[]'),
      installments: JSON.parse(localStorage.getItem(STORAGE_KEYS.INSTALLMENTS) || '[]'),
      products: JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || JSON.stringify(INITIAL_PRODUCTS)),
      settings: { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}') },
      users: (() => {
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.USERS);
          if (!raw) return DEFAULT_USERS;
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_USERS;
        } catch {
          return DEFAULT_USERS;
        }
      })(),
      currentUser: JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || JSON.stringify(DEFAULT_USERS[0])),
      syncQueue: JSON.parse(localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE) || '[]'),
      lastSyncTime: localStorage.getItem(STORAGE_KEYS.LAST_SYNC) || new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error loading database from local storage, generating fallback', err);
    const seedClients = generateSeedClients();
    const { invoices, payments, installments } = generateSeedTransactions(seedClients);
    return {
      clients: seedClients,
      invoices,
      payments,
      installments,
      products: INITIAL_PRODUCTS,
      settings: DEFAULT_SETTINGS,
      users: DEFAULT_USERS,
      currentUser: DEFAULT_USERS[0],
      syncQueue: [],
      lastSyncTime: new Date().toISOString(),
    };
  }
}

export function saveDatabase(db: AppDatabase): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(db.clients));
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(db.invoices));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(db.payments));
    localStorage.setItem(STORAGE_KEYS.INSTALLMENTS, JSON.stringify(db.installments));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(db.products));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(db.settings));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(db.users));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(db.currentUser));
    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(db.syncQueue));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, db.lastSyncTime);
  } catch (err) {
    console.error('Storage save error:', err);
  }
}

/**
 * Creates an exportable JSON cloud backup of all records
 */
export function exportBackupJSON(db: AppDatabase): string {
  const backupObject = {
    appName: 'VelvetLedger',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    recordCount: {
      clients: db.clients.length,
      invoices: db.invoices.length,
      payments: db.payments.length,
      installments: db.installments.length,
      products: db.products.length,
    },
    data: db,
  };
  return JSON.stringify(backupObject, null, 2);
}

/**
 * Restores database from a JSON backup
 */
export function restoreBackupJSON(jsonStr: string): AppDatabase {
  const parsed = JSON.parse(jsonStr);
  if (!parsed.data || !Array.isArray(parsed.data.clients)) {
    throw new Error('Invalid backup file structure: missing clients dataset.');
  }
  saveDatabase(parsed.data);
  return parsed.data;
}

/**
 * Plays clean Web Audio sound feedback for barcode scan, receipt print, and payment completion
 */
export function playRetailSound(type: 'beep' | 'success' | 'print' | 'alert') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'beep') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'success') {
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 chord
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.06);
        osc.stop(ctx.currentTime + idx * 0.06 + 0.2);
      });
    } else if (type === 'print') {
      // Subtle rhythmic thermal printer ticking
      for (let i = 0; i < 4; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800 + i * 50, ctx.currentTime + i * 0.05);
        gain.gain.setValueAtTime(0.04, ctx.currentTime + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.05 + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.05);
        osc.stop(ctx.currentTime + i * 0.05 + 0.03);
      }
    } else if (type === 'alert') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    // Audio context may be restricted before user gesture
  }
}
