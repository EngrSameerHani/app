import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { InvoiceCreator } from './components/InvoiceCreator';
import { ClientsView } from './components/ClientsView';
import { RemindersHub } from './components/RemindersHub';
import { ReportsView } from './components/ReportsView';
import { InventoryView } from './components/InventoryView';
import { ThermalReceiptModal } from './components/ThermalReceiptModal';
import { PaymentModal } from './components/PaymentModal';
import { PaperMigrationModal } from './components/PaperMigrationModal';
import { SettingsModal } from './components/SettingsModal';
import { StartupLoginModal } from './components/StartupLoginModal';
import {
  AppDatabase,
  loadDatabase,
  saveDatabase,
  playRetailSound,
} from './utils/storage';
import {
  Client,
  ClothingProduct,
  Installment,
  Invoice,
  Payment,
  StoreSettings,
  UserAccount,
} from './types';
import { allocatePaymentToInstallments, generateInstallmentSchedule } from './utils/calculations';
import { generateSeedClients, generateSeedTransactions, INITIAL_PRODUCTS, DEFAULT_SETTINGS, DEFAULT_USERS } from './utils/mockData';

export default function App() {
  const [db, setDb] = useState<AppDatabase>(() => loadDatabase());
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine ?? true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Thermal Receipt Modal State
  const [thermalReceiptState, setThermalReceiptState] = useState<{
    isOpen: boolean;
    invoice?: Invoice;
    payment?: Payment;
    client?: Client;
  }>({ isOpen: false });

  // Payment Recording Modal State
  const [paymentModalState, setPaymentModalState] = useState<{
    isOpen: boolean;
    client?: Client;
  }>({ isOpen: false });

  // Paper Migration Wizard Modal State
  const [isPaperMigrationOpen, setIsPaperMigrationOpen] = useState<boolean>(false);

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Startup Security Login Gate State
  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(() => {
    // If user explicitly disabled startup login in settings, don't lock
    const initialDb = loadDatabase();
    if (initialDb.settings.requireStartupLogin === false) {
      return false;
    }
    return sessionStorage.getItem('usman_cloth_pos_unlocked') !== 'true';
  });

  const handleLoginSuccess = (user: UserAccount) => {
    setDb((prev) => ({
      ...prev,
      currentUser: user,
    }));
    sessionStorage.setItem('usman_cloth_pos_unlocked', 'true');
    setIsSessionLocked(false);
  };

  const handleLockTerminal = () => {
    sessionStorage.removeItem('usman_cloth_pos_unlocked');
    setIsSessionLocked(true);
  };

  // Invoice POS Preselected Client
  const [posPreselectedClientId, setPosPreselectedClientId] = useState<string | undefined>();

  // Auto-save whenever db changes
  useEffect(() => {
    saveDatabase(db);
  }, [db]);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Trigger Cloud Sync
  const handleTriggerSync = () => {
    if (!isOnline) {
      alert('Cannot sync while offline. Please switch to online mode first.');
      return;
    }
    setIsSyncing(true);
    setTimeout(() => {
      setDb((prev) => ({
        ...prev,
        syncQueue: [],
        lastSyncTime: new Date().toISOString(),
      }));
      setIsSyncing(false);
      if (db.settings.soundEnabled) playRetailSound('beep');
    }, 1200);
  };

  // Save new invoice
  const handleSaveInvoice = (newInvoice: Invoice, client: Client) => {
    // Generate Installment Schedule
    const newSchedule = generateInstallmentSchedule(
      newInvoice.id,
      newInvoice.invoiceNumber,
      client.id,
      newInvoice.creditAmountAdded,
      newInvoice.installmentMonths,
      newInvoice.firstDueDate
    );

    // Update Client Balance & Installment Target
    const updatedClients = db.clients.map((c) => {
      if (c.id !== client.id) return c;
      return {
        ...c,
        currentBalance: newInvoice.newBalance,
        monthlyInstallmentTarget: newInvoice.monthlyInstallmentAmount > 0
          ? newInvoice.monthlyInstallmentAmount
          : c.monthlyInstallmentTarget,
        rating: (newInvoice.newBalance > c.creditLimit * 0.9 ? 'Fair' : 'Good') as Client['rating'],
        updatedAt: new Date().toISOString().split('T')[0],
      };
    });

    const updatedClient = updatedClients.find((c) => c.id === client.id) || client;

    // Sync queue item
    const syncItem = {
      id: `sync-${Date.now()}`,
      action: 'create_invoice' as const,
      entityId: newInvoice.id,
      payload: newInvoice,
      timestamp: new Date().toISOString(),
      status: isOnline ? ('synced' as const) : ('pending' as const),
    };

    setDb((prev) => ({
      ...prev,
      invoices: [newInvoice, ...prev.invoices],
      installments: [...newSchedule, ...prev.installments],
      clients: updatedClients,
      syncQueue: isOnline ? prev.syncQueue : [...prev.syncQueue, syncItem],
      lastSyncTime: isOnline ? new Date().toISOString() : prev.lastSyncTime,
    }));

    // Instantly prompt thermal printer receipt!
    setThermalReceiptState({
      isOpen: true,
      invoice: newInvoice,
      client: updatedClient,
    });
  };

  // Record payment
  const handleRecordPayment = (newPayment: Payment, client: Client) => {
    // Allocate payment to client's installments
    const clientInstallments = db.installments.filter((i) => i.clientId === client.id);
    const { updatedInstallments } = allocatePaymentToInstallments(
      newPayment.amount,
      clientInstallments,
      newPayment.createdAt
    );

    const mergedInstallments = db.installments.map((inst) => {
      const match = updatedInstallments.find((u) => u.id === inst.id);
      return match || inst;
    });

    // Update client balance
    const updatedClients = db.clients.map((c) => {
      if (c.id !== client.id) return c;
      const isZero = newPayment.remainingBalance <= 0;
      return {
        ...c,
        currentBalance: newPayment.remainingBalance,
        rating: (isZero ? 'A+' : 'Good') as Client['rating'],
        updatedAt: new Date().toISOString().split('T')[0],
      };
    });

    const updatedClient = updatedClients.find((c) => c.id === client.id) || client;

    const syncItem = {
      id: `sync-${Date.now()}`,
      action: 'record_payment' as const,
      entityId: newPayment.id,
      payload: newPayment,
      timestamp: new Date().toISOString(),
      status: isOnline ? ('synced' as const) : ('pending' as const),
    };

    setDb((prev) => ({
      ...prev,
      payments: [newPayment, ...prev.payments],
      installments: mergedInstallments,
      clients: updatedClients,
      syncQueue: isOnline ? prev.syncQueue : [...prev.syncQueue, syncItem],
      lastSyncTime: isOnline ? new Date().toISOString() : prev.lastSyncTime,
    }));

    // Instantly prompt thermal payment slip!
    setThermalReceiptState({
      isOpen: true,
      payment: newPayment,
      client: updatedClient,
    });
  };

  // Quick create client from POS
  const handleQuickCreateClient = (
    newClientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>
  ): Client => {
    const newClient: Client = {
      ...newClientData,
      id: `client-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setDb((prev) => ({
      ...prev,
      clients: [newClient, ...prev.clients],
    }));

    return newClient;
  };

  // Add Migrated Client from Paper Ledger Wizard
  const handleAddMigratedClient = (client: Client) => {
    // Generate synthetic initial installment if balance > 0
    let newInsts: Installment[] = [];
    if (client.currentBalance > 0) {
      newInsts = generateInstallmentSchedule(
        `paper-${client.id}`,
        client.paperFolioNumber || 'FOLIO',
        client.id,
        client.currentBalance,
        3,
        new Date().toISOString().split('T')[0]
      );
    }

    setDb((prev) => ({
      ...prev,
      clients: [client, ...prev.clients],
      installments: [...newInsts, ...prev.installments],
    }));
  };

  // Bulk Import
  const handleBulkImportClients = (imported: Client[]) => {
    setDb((prev) => ({
      ...prev,
      clients: [...imported, ...prev.clients],
    }));
  };

  // Add Product to Inventory
  const handleAddProduct = (prod: ClothingProduct) => {
    setDb((prev) => ({
      ...prev,
      products: [prod, ...prev.products],
    }));
  };

  // WhatsApp 1-Click Reminder Sender
  const handleSendWhatsAppReminder = (client: Client, installment?: Installment) => {
    let text = db.settings.whatsappTemplate;
    const amountDue = installment ? installment.amount : client.monthlyInstallmentTarget || client.currentBalance;
    const dueDate = installment ? installment.dueDate : new Date().toISOString().split('T')[0];

    text = text.replace(/\{\{client_name\}\}/g, client.name);
    text = text.replace(/\{\{store_name\}\}/g, db.settings.storeName);
    text = text.replace(/\{\{currency\}\}/g, db.settings.currencySymbol);
    text = text.replace(/\{\{monthly_amount\}\}/g, amountDue.toLocaleString());
    text = text.replace(/\{\{due_date\}\}/g, dueDate);
    text = text.replace(/\{\{total_balance\}\}/g, client.currentBalance.toLocaleString());
    text = text.replace(/\{\{paper_folio\}\}/g, client.paperFolioNumber || 'N/A');
    text = text.replace(/\{\{prev_paper_folio\}\}/g, client.previousPaperFolioNumber || 'None');

    const cleanPhone = client.phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // SMS 1-Click Reminder Sender
  const handleSendSMSReminder = (client: Client, installment?: Installment) => {
    let text = db.settings.smsTemplate || 'Usman Cloth Rehra: Dear {{client_name}}, monthly installment of {{currency}}{{monthly_amount}} is due on {{due_date}}. Total Balance: {{currency}}{{total_balance}} (Khata: {{paper_folio}}).';
    const amountDue = installment ? installment.amount : client.monthlyInstallmentTarget || client.currentBalance;
    const dueDate = installment ? installment.dueDate : new Date().toISOString().split('T')[0];

    text = text.replace(/\{\{client_name\}\}/g, client.name);
    text = text.replace(/\{\{store_name\}\}/g, db.settings.storeName);
    text = text.replace(/\{\{currency\}\}/g, db.settings.currencySymbol);
    text = text.replace(/\{\{monthly_amount\}\}/g, amountDue.toLocaleString());
    text = text.replace(/\{\{due_date\}\}/g, dueDate);
    text = text.replace(/\{\{total_balance\}\}/g, client.currentBalance.toLocaleString());
    text = text.replace(/\{\{paper_folio\}\}/g, client.paperFolioNumber || 'N/A');
    text = text.replace(/\{\{prev_paper_folio\}\}/g, client.previousPaperFolioNumber || 'None');

    const cleanPhone = client.phone.replace(/[^0-9]/g, '');

    if (db.settings.smsGatewayProvider === 'device_sms') {
      const url = `sms:${cleanPhone}?body=${encodeURIComponent(text)}`;
      window.location.href = url;
    } else {
      if (db.settings.soundEnabled) playRetailSound('beep');
      alert(`[SMS Gateway: ${db.settings.smsGatewayProvider.toUpperCase()}] 1-Click SMS dispatched to ${client.name} (${client.phone}) via Sender ID "${db.settings.smsSenderId}"!\n\nMessage: "${text}"`);
    }
  };

  // Reset to original 2,000+ client seed database for Usman Cloth Rehra
  const handleResetSeedData = () => {
    const seedClients = generateSeedClients();
    const { invoices, payments, installments } = generateSeedTransactions(seedClients);
    const freshDb: AppDatabase = {
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
    setDb(freshDb);
  };

  const overdueInstallmentsCount = db.installments.filter(
    (i) => i.status !== 'paid' && new Date(i.dueDate).getTime() < Date.now()
  ).length;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* App Header */}
      <Header
        settings={db.settings}
        currentUser={db.currentUser}
        allUsers={db.users}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOnline={isOnline}
        onToggleOnline={() => setIsOnline(!isOnline)}
        syncQueue={db.syncQueue}
        onTriggerSync={handleTriggerSync}
        isSyncing={isSyncing}
        onSwitchUser={(user) => setDb((prev) => ({ ...prev, currentUser: user }))}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPaperMigration={() => setIsPaperMigrationOpen(true)}
        clientCount={db.clients.length}
        overdueCount={overdueInstallmentsCount}
        onLockTerminal={handleLockTerminal}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            clients={db.clients}
            invoices={db.invoices}
            payments={db.payments}
            installments={db.installments}
            settings={db.settings}
            onNavigate={setActiveTab}
            onSelectClient={(c) => {
              setActiveTab('clients');
            }}
            onOpenNewPayment={(c) => setPaymentModalState({ isOpen: true, client: c })}
            onOpenPaperMigration={() => setIsPaperMigrationOpen(true)}
          />
        )}

        {activeTab === 'pos' && (
          <InvoiceCreator
            clients={db.clients}
            products={db.products}
            settings={db.settings}
            currentUser={db.currentUser}
            preselectedClientId={posPreselectedClientId}
            onSaveInvoice={handleSaveInvoice}
            onQuickCreateClient={handleQuickCreateClient}
          />
        )}

        {activeTab === 'clients' && (
          <ClientsView
            clients={db.clients}
            invoices={db.invoices}
            payments={db.payments}
            installments={db.installments}
            settings={db.settings}
            onSelectClientForInvoice={(client) => {
              setPosPreselectedClientId(client.id);
              setActiveTab('pos');
            }}
            onOpenPaymentModal={(client) => {
              setPaymentModalState({ isOpen: true, client });
            }}
            onOpenPaperMigration={() => setIsPaperMigrationOpen(true)}
            onSendWhatsAppReminder={handleSendWhatsAppReminder}
            onSendSMSReminder={handleSendSMSReminder}
          />
        )}

        {activeTab === 'reminders' && (
          <RemindersHub
            clients={db.clients}
            installments={db.installments}
            settings={db.settings}
            onSendWhatsApp={handleSendWhatsAppReminder}
            onSendSMS={handleSendSMSReminder}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            products={db.products}
            settings={db.settings}
            userRole={db.currentUser.role}
            onAddProduct={handleAddProduct}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            clients={db.clients}
            invoices={db.invoices}
            payments={db.payments}
            installments={db.installments}
            products={db.products}
            settings={db.settings}
          />
        )}
      </main>

      {/* Thermal Receipt Print Modal */}
      <ThermalReceiptModal
        isOpen={thermalReceiptState.isOpen}
        onClose={() => setThermalReceiptState({ isOpen: false })}
        invoice={thermalReceiptState.invoice}
        payment={thermalReceiptState.payment}
        client={thermalReceiptState.client}
        settings={db.settings}
      />

      {/* Record Payment Modal */}
      <PaymentModal
        isOpen={paymentModalState.isOpen}
        onClose={() => setPaymentModalState({ isOpen: false })}
        clients={db.clients}
        initialClient={paymentModalState.client}
        currentUser={db.currentUser}
        settings={db.settings}
        onRecordPayment={handleRecordPayment}
      />

      {/* Paper Register Book Migration Modal */}
      <PaperMigrationModal
        isOpen={isPaperMigrationOpen}
        onClose={() => setIsPaperMigrationOpen(false)}
        onAddMigratedClient={handleAddMigratedClient}
        onBulkImportClients={handleBulkImportClients}
        settings={db.settings}
        existingClientCount={db.clients.length}
      />

      {/* Store & Thermal Printer Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={db.settings}
        onUpdateSettings={(newSettings) => setDb((prev) => ({ ...prev, settings: newSettings }))}
        allUsers={db.users}
        onUpdateUsers={(users) => setDb((prev) => ({ ...prev, users }))}
        db={db}
        onRestoreDatabase={(restored) => setDb(restored)}
        onResetSeedData={handleResetSeedData}
      />

      {/* Startup & Operator Keypad Login Screen */}
      <StartupLoginModal
        isOpen={isSessionLocked}
        users={db.users}
        settings={db.settings}
        onLoginSuccess={handleLoginSuccess}
        isOnline={isOnline}
      />
    </div>
  );
}
