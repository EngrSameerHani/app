import React, { useState, useMemo } from 'react';
import {
  BellRing,
  Send,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Smartphone,
  ExternalLink,
  Users,
  Search,
  Filter,
  Check,
  Sparkles,
  Zap,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { Client, Installment, StoreSettings } from '../types';
import { BatchRemindersModal } from './BatchRemindersModal';

interface RemindersHubProps {
  clients: Client[];
  installments: Installment[];
  settings: StoreSettings;
  onSendWhatsApp: (client: Client, installment?: Installment) => void;
  onSendSMS: (client: Client, installment?: Installment) => void;
}

export const RemindersHub: React.FC<RemindersHubProps> = ({
  clients,
  installments,
  settings,
  onSendWhatsApp,
  onSendSMS,
}) => {
  const curr = settings.currencySymbol;
  const [filter, setFilter] = useState<'overdue' | 'nov' | 'oct' | 'dueSoon' | 'all'>('nov');
  const [search, setSearch] = useState('');
  const [previewMode, setPreviewMode] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [remindedStatus, setRemindedStatus] = useState<Record<string, { type: 'whatsapp' | 'sms'; time: string }>>({});
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchMonth, setBatchMonth] = useState('2026-11');

  // Compute clients needing reminders
  const reminderItems = useMemo(() => {
    const today = new Date();
    const items: Array<{
      client: Client;
      installment?: Installment;
      dueDate: string;
      amountDue: number;
      isOverdue: boolean;
      daysDiff: number;
    }> = [];

    // Index pending installments by clientId once: O(installments)
    const pendingByClient = new Map<string, Installment[]>();
    for (let idx = 0; idx < installments.length; idx++) {
      const inst = installments[idx];
      if (inst.status !== 'paid') {
        const arr = pendingByClient.get(inst.clientId);
        if (arr) arr.push(inst);
        else pendingByClient.set(inst.clientId, [inst]);
      }
    }

    // Map clients with pending or overdue installments: O(clients)
    clients.forEach((client) => {
      if (client.currentBalance <= 0) return;

      const clientPendingInsts = pendingByClient.get(client.id);

      if (clientPendingInsts && clientPendingInsts.length > 0) {
        // Find earliest due installment
        const earliest = clientPendingInsts.length === 1
          ? clientPendingInsts[0]
          : [...clientPendingInsts].sort(
              (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
            )[0];
        const dueTime = new Date(earliest.dueDate).getTime();
        const diffDays = Math.floor((today.getTime() - dueTime) / (1000 * 60 * 60 * 24));

        items.push({
          client,
          installment: earliest,
          dueDate: earliest.dueDate,
          amountDue: earliest.amount,
          isOverdue: diffDays > 0,
          daysDiff: diffDays,
        });
      } else {
        // Has balance from paper ledger or general balance without strict installment breakdown
        items.push({
          client,
          dueDate: client.createdAt,
          amountDue: client.monthlyInstallmentTarget > 0 ? client.monthlyInstallmentTarget : Math.round(client.currentBalance / 3),
          isOverdue: client.rating === 'Overdue' || client.rating === 'High Risk',
          daysDiff: 15,
        });
      }
    });

    return items;
  }, [clients, installments]);

  // November specific clients
  const novClientsCount = useMemo(() => {
    return reminderItems.filter(
      (i) => i.installment?.dueDate.startsWith('2026-11') || (!i.installment && i.client.currentBalance > 0)
    ).length;
  }, [reminderItems]);

  const filteredItems = useMemo(() => {
    let result = reminderItems;

    if (filter === 'overdue') {
      result = result.filter((i) => i.isOverdue);
    } else if (filter === 'nov') {
      result = result.filter(
        (i) => i.installment?.dueDate.startsWith('2026-11') || (!i.installment && i.client.currentBalance > 0)
      );
    } else if (filter === 'oct') {
      result = result.filter((i) => i.installment?.dueDate.startsWith('2026-10'));
    } else if (filter === 'dueSoon') {
      result = result.filter((i) => !i.isOverdue);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.client.name.toLowerCase().includes(q) ||
          i.client.phone.includes(q) ||
          (i.client.paperFolioNumber && i.client.paperFolioNumber.toLowerCase().includes(q)) ||
          (i.client.previousPaperFolioNumber && i.client.previousPaperFolioNumber.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => b.daysDiff - a.daysDiff);
  }, [reminderItems, filter, search]);

  const composeWhatsAppMessage = (client: Client, amountDue: number, dueDate: string) => {
    let text = settings.whatsappTemplate || 'Dear {{client_name}}, warm greetings from Usman Cloth Rehra. Your monthly installment of {{currency}}{{monthly_amount}} is due on {{due_date}}. Current total balance: {{currency}}{{total_balance}} (Khata: {{paper_folio}}). Kindly deposit to Bank: Meezan Bank A/C: 0102-39281920 or visit our cash counter at Main Bazaar Rehra. Thank you!';
    text = text.replace(/\{\{client_name\}\}/g, client.name);
    text = text.replace(/\{\{store_name\}\}/g, settings.storeName);
    text = text.replace(/\{\{currency\}\}/g, curr);
    text = text.replace(/\{\{monthly_amount\}\}/g, amountDue.toLocaleString());
    text = text.replace(/\{\{due_date\}\}/g, dueDate);
    text = text.replace(/\{\{total_balance\}\}/g, client.currentBalance.toLocaleString());
    text = text.replace(/\{\{paper_folio\}\}/g, client.paperFolioNumber || 'N/A');
    text = text.replace(/\{\{prev_paper_folio\}\}/g, client.previousPaperFolioNumber || 'None');
    return text;
  };

  const composeSMSMessage = (client: Client, amountDue: number, dueDate: string) => {
    let text = settings.smsTemplate || 'Usman Cloth Rehra: Dear {{client_name}}, monthly installment of {{currency}}{{monthly_amount}} is due on {{due_date}}. Total Balance: {{currency}}{{total_balance}} (Khata: {{paper_folio}}). Pay at counter or Meezan Bank 0102-39281920.';
    text = text.replace(/\{\{client_name\}\}/g, client.name);
    text = text.replace(/\{\{store_name\}\}/g, settings.storeName);
    text = text.replace(/\{\{currency\}\}/g, curr);
    text = text.replace(/\{\{monthly_amount\}\}/g, amountDue.toLocaleString());
    text = text.replace(/\{\{due_date\}\}/g, dueDate);
    text = text.replace(/\{\{total_balance\}\}/g, client.currentBalance.toLocaleString());
    text = text.replace(/\{\{paper_folio\}\}/g, client.paperFolioNumber || 'N/A');
    text = text.replace(/\{\{prev_paper_folio\}\}/g, client.previousPaperFolioNumber || 'None');
    return text;
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTriggerWhatsApp = (item: typeof reminderItems[0]) => {
    onSendWhatsApp(item.client, item.installment);
    setRemindedStatus((prev) => ({
      ...prev,
      [item.client.id]: {
        type: 'whatsapp',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    }));
  };

  const handleTriggerSMS = (item: typeof reminderItems[0]) => {
    onSendSMS(item.client, item.installment);
    setRemindedStatus((prev) => ({
      ...prev,
      [item.client.id]: {
        type: 'sms',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-rose-500 font-bold text-xs uppercase tracking-wider mb-1">
              <BellRing className="w-4 h-4" />
              <span>Automated 1-Click Monthly Reminders</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              WhatsApp & SMS Payment Recovery Hub
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              Send instant single-click payment reminders via WhatsApp or SMS. Each reminder automatically includes the client's name, monthly installment due, total balance, and physical register page reference.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold">
              {reminderItems.filter((i) => i.isOverdue).length} Overdue Accounts
            </span>

            <span className="text-xs px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold flex items-center space-x-1">
              <Smartphone className="w-3.5 h-3.5" />
              <span>SMS Mode: {settings.smsGatewayProvider === 'device_sms' ? 'Native 1-Click (Free)' : settings.smsGatewayProvider.toUpperCase()}</span>
            </span>
          </div>
        </div>

        {/* Batch Monthly Recovery Action Banner */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-blue-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[11px] uppercase tracking-wider flex items-center space-x-1 shadow-sm">
                <Calendar className="w-3.5 h-3.5" />
                <span>Next Month: November 2026</span>
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {novClientsCount} Clients Pending in November
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
              Open and send reminders to all clients pending in November with an <strong>Anti-Ban Delay Timer</strong> (30s - 3 mins) to avoid WhatsApp or cellular SMS network blockages.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setBatchMonth('2026-11');
                setIsBatchModalOpen(true);
              }}
              className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-md shadow-amber-500/20 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Send November Reminders to All ({novClientsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setBatchMonth('all');
                setIsBatchModalOpen(true);
              }}
              className="py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>Batch Other Months</span>
            </button>
          </div>
        </div>

        {/* Global Controls & Format Switcher */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search 2,000+ clients by name, phone, current folio or prev physical page..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Filter Status */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFilter('nov')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                filter === 'nov'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>Nov 2026 ({novClientsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('oct')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                filter === 'oct'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Oct 2026
            </button>
            <button
              type="button"
              onClick={() => setFilter('overdue')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                filter === 'overdue'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Overdue ({reminderItems.filter((i) => i.isOverdue).length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('dueSoon')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                filter === 'dueSoon'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Due Soon ({reminderItems.filter((i) => !i.isOverdue).length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                filter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All Owing ({reminderItems.length})
            </button>
          </div>

          {/* Template View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPreviewMode('whatsapp')}
              className={`px-3 py-1 rounded-lg transition flex items-center space-x-1 ${
                previewMode === 'whatsapp'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp View</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('sms')}
              className={`px-3 py-1 rounded-lg transition flex items-center space-x-1 ${
                previewMode === 'sms'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>SMS View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reminder Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            No clients in this reminder queue. All installments are up to date!
          </div>
        ) : (
          filteredItems.map((item) => {
            const waMessage = composeWhatsAppMessage(item.client, item.amountDue, item.dueDate);
            const smsMessage = composeSMSMessage(item.client, item.amountDue, item.dueDate);
            const currentMessage = previewMode === 'whatsapp' ? waMessage : smsMessage;
            const status = remindedStatus[item.client.id];

            return (
              <div
                key={item.client.id}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm space-y-3.5 transition flex flex-col justify-between ${
                  item.isOverdue
                    ? 'border-rose-200 dark:border-rose-900/60'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  {/* Top info */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {item.client.name}
                        </span>
                        {item.client.paperFolioNumber && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono font-bold">
                            {item.client.paperFolioNumber}
                          </span>
                        )}
                        {item.client.previousPaperFolioNumber && (
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-medium"
                            title="Previous Physical Record Reference"
                          >
                            Prev: {item.client.previousPaperFolioNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.client.phone} • {item.client.address}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.isOverdue
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}
                    >
                      {item.isOverdue ? `${item.daysDiff}d Overdue` : `Due: ${item.dueDate}`}
                    </span>
                  </div>

                  {/* Financial Stats */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/60">
                    <div>
                      <div className="text-[10px] text-slate-400">Installment Due:</div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {curr}{item.amountDue.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Total Account Debt:</div>
                      <div className="font-bold text-amber-600 dark:text-amber-400">
                        {curr}{item.client.currentBalance.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Message Preview Box */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-[11px] text-slate-700 dark:text-slate-300 font-sans leading-relaxed select-text border border-slate-200 dark:border-slate-700/60 relative group">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                      <span>{previewMode === 'whatsapp' ? 'WhatsApp Template Preview' : 'SMS Template Preview'}</span>
                      <span className="font-mono">{currentMessage.length} chars</span>
                    </div>
                    <p className="line-clamp-3 italic">"{currentMessage}"</p>
                  </div>
                </div>

                {/* 1-Click Action Buttons */}
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    {/* 1-Click WhatsApp Button */}
                    <button
                      type="button"
                      onClick={() => handleTriggerWhatsApp(item)}
                      className="py-2 px-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition"
                      title="1-Click WhatsApp reminder"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>1-Click WhatsApp</span>
                    </button>

                    {/* 1-Click SMS Button */}
                    <button
                      type="button"
                      onClick={() => handleTriggerSMS(item)}
                      className="py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition"
                      title="1-Click SMS reminder"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>1-Click SMS</span>
                    </button>
                  </div>

                  {/* Copy Button */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(item.client.id, currentMessage)}
                      className="w-full py-1.5 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center justify-center space-x-1 transition"
                      title="Copy reminder text to clipboard"
                    >
                      {copiedId === item.client.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Copy Text</span>
                        </>
                      )}
                    </button>
                  </div>

                  {status && (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 text-center font-semibold bg-emerald-500/10 py-1 rounded-lg">
                      ✓ Dispatched via {status.type.toUpperCase()} at {status.time}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Monthly Batch Dispatcher Modal with Anti-Ban Delay Timers */}
      <BatchRemindersModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        clients={clients}
        installments={installments}
        settings={settings}
        initialMonth={batchMonth}
      />
    </div>
  );
};
