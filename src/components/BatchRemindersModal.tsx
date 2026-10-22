import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  MessageSquare,
  Smartphone,
  Clock,
  ShieldCheck,
  Pause,
  Play,
  SkipForward,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  Settings,
  Sparkles,
  Download,
  Info,
} from 'lucide-react';
import { Client, Installment, StoreSettings } from '../types';

export interface BatchItem {
  client: Client;
  installment?: Installment;
  amountDue: number;
  dueDate: string;
  status: 'pending' | 'sending' | 'sent' | 'skipped' | 'failed';
  dispatchedAt?: string;
  channel?: 'whatsapp' | 'sms';
}

interface BatchRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  installments: Installment[];
  settings: StoreSettings;
  initialMonth?: string; // e.g. "2026-11"
}

export const BatchRemindersModal: React.FC<BatchRemindersModalProps> = ({
  isOpen,
  onClose,
  clients,
  installments,
  settings,
  initialMonth = '2026-11',
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [delaySeconds, setDelaySeconds] = useState<number>(settings.antiBanDefaultDelay || 30);
  const [customDelay, setCustomDelay] = useState<string>((settings.antiBanDefaultDelay || 30).toString());
  const [showCustomDelayInput, setShowCustomDelayInput] = useState<boolean>(false);
  const [queue, setQueue] = useState<BatchItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [countdown, setCountdown] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [skippedCount, setSkippedCount] = useState<number>(0);

  const timerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);

  // Format seconds to mm:ss or s
  const formatDelayTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s === 0 ? `${m}m` : `${m}m ${s}s`;
  };

  // Available Months Generator (Current, Next, Previous)
  const availableMonths = [
    { value: '2026-11', label: 'November 2026 (Upcoming Next Month)' },
    { value: '2026-10', label: 'October 2026 (Current Active Month)' },
    { value: '2026-12', label: 'December 2026 (Year-End Installments)' },
    { value: '2026-09', label: 'September 2026 (Past Overdue Installments)' },
    { value: 'all', label: 'All Outstanding Clients (Regardless of Month)' },
  ];

  // Helper to compose message
  const composeMessage = (client: Client, amountDue: number, dueDate: string, targetChannel: 'whatsapp' | 'sms') => {
    const rawTemplate =
      targetChannel === 'whatsapp'
        ? settings.whatsappTemplate ||
          'Dear {{client_name}}, warm greetings from Usman Cloth Rehra. Your monthly installment of {{currency}}{{monthly_amount}} is due on {{due_date}}. Current total balance: {{currency}}{{total_balance}} (Khata: {{paper_folio}}). Kindly deposit to Bank: Meezan Bank A/C: 0102-39281920 or visit our cash counter at Main Bazaar Rehra. Thank you!'
        : settings.smsTemplate ||
          'Usman Cloth Rehra: Dear {{client_name}}, monthly installment of {{currency}}{{monthly_amount}} is due on {{due_date}}. Total Balance: {{currency}}{{total_balance}} (Khata: {{paper_folio}}). Pay at counter or Meezan Bank 0102-39281920.';

    return rawTemplate
      .replace(/\{\{client_name\}\}/g, client.name)
      .replace(/\{\{store_name\}\}/g, settings.storeName)
      .replace(/\{\{currency\}\}/g, settings.currencySymbol)
      .replace(/\{\{monthly_amount\}\}/g, amountDue.toLocaleString())
      .replace(/\{\{due_date\}\}/g, dueDate)
      .replace(/\{\{total_balance\}\}/g, client.currentBalance.toLocaleString())
      .replace(/\{\{paper_folio\}\}/g, client.paperFolioNumber || 'N/A')
      .replace(/\{\{prev_paper_folio\}\}/g, client.previousPaperFolioNumber || 'None');
  };

  // Re-build queue when month or data changes
  useEffect(() => {
    if (!isOpen) return;

    const items: BatchItem[] = [];

    // Index pending installments by clientId: O(installments)
    const pendingByClient = new Map<string, Installment[]>();
    for (let idx = 0; idx < installments.length; idx++) {
      const inst = installments[idx];
      if (inst.status !== 'paid') {
        const arr = pendingByClient.get(inst.clientId);
        if (arr) arr.push(inst);
        else pendingByClient.set(inst.clientId, [inst]);
      }
    }

    clients.forEach((client) => {
      if (client.currentBalance <= 0) return;

      const clientPendingInsts = pendingByClient.get(client.id);

      if (clientPendingInsts && clientPendingInsts.length > 0) {
        if (selectedMonth === 'all') {
          // Take earliest pending
          const earliest = clientPendingInsts.length === 1
            ? clientPendingInsts[0]
            : [...clientPendingInsts].sort(
                (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
              )[0];
          items.push({
            client,
            installment: earliest,
            amountDue: earliest.amount,
            dueDate: earliest.dueDate,
            status: 'pending',
          });
        } else {
          // Find installments matching the selected month (e.g., '2026-11')
          const monthInst = clientPendingInsts.find((i) => i.dueDate.startsWith(selectedMonth));
          if (monthInst) {
            items.push({
              client,
              installment: monthInst,
              amountDue: monthInst.amount,
              dueDate: monthInst.dueDate,
              status: 'pending',
            });
          }
        }
      } else if (selectedMonth === 'all' || client.createdAt.startsWith(selectedMonth)) {
        // Fallback for migrated paper balances
        items.push({
          client,
          amountDue: client.monthlyInstallmentTarget > 0 ? client.monthlyInstallmentTarget : Math.round(client.currentBalance / 3),
          dueDate: `${selectedMonth === 'all' ? '2026-11' : selectedMonth}-15`,
          status: 'pending',
        });
      }
    });

    setQueue(items);
    setSelectedIds(new Set(items.map((i) => i.client.id)));
    setIsRunning(false);
    setIsPaused(false);
    setCurrentIndex(-1);
    setCompletedCount(0);
    setSkippedCount(0);
    setCountdown(0);
  }, [isOpen, selectedMonth, clients, installments]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  if (!isOpen) return null;

  // Toggle item in queue selection
  const handleToggleSelect = (clientId: string) => {
    if (isRunning) return;
    const next = new Set(selectedIds);
    if (next.has(clientId)) {
      next.delete(clientId);
    } else {
      next.add(clientId);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (isRunning) return;
    if (selectedIds.size === queue.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(queue.map((i) => i.client.id)));
    }
  };

  // Dispatch a single item
  const dispatchItem = (index: number) => {
    const item = queue[index];
    if (!item) {
      // Completed entire queue
      setIsRunning(false);
      setIsPaused(false);
      setCurrentIndex(-1);
      return;
    }

    if (!selectedIds.has(item.client.id) || item.status === 'skipped') {
      // Skip this item
      setSkippedCount((c) => c + 1);
      setQueue((prev) =>
        prev.map((it, idx) => (idx === index ? { ...it, status: 'skipped' } : it))
      );
      advanceQueue(index + 1);
      return;
    }

    // Set sending status
    setCurrentIndex(index);
    setQueue((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, status: 'sending', channel } : it))
    );

    const message = composeMessage(item.client, item.amountDue, item.dueDate, channel);
    const cleanPhone = item.client.phone.replace(/[^0-9]/g, '');

    // Execute actual dispatch based on channel
    if (channel === 'whatsapp') {
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // SMS
      if (settings.smsGatewayProvider === 'device_sms') {
        const url = `sms:${cleanPhone}?body=${encodeURIComponent(message)}`;
        const link = document.createElement('a');
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }

    // Mark sent
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setQueue((prev) =>
      prev.map((it, idx) =>
        idx === index
          ? { ...it, status: 'sent', dispatchedAt: nowTime, channel }
          : it
      )
    );
    setCompletedCount((c) => c + 1);

    // Schedule next dispatch after delay
    scheduleNext(index + 1);
  };

  const scheduleNext = (nextIndex: number) => {
    if (nextIndex >= queue.length) {
      setIsRunning(false);
      setIsPaused(false);
      setCurrentIndex(-1);
      return;
    }

    const effectiveDelay = Math.max(2, delaySeconds);
    setCountdown(effectiveDelay);

    // Countdown tick every second
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    let remaining = effectiveDelay;
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current);
      }
    }, 1000);

    timerRef.current = setTimeout(() => {
      dispatchItem(nextIndex);
    }, effectiveDelay * 1000);
  };

  const advanceQueue = (nextIndex: number) => {
    if (nextIndex >= queue.length) {
      setIsRunning(false);
      setIsPaused(false);
      setCurrentIndex(-1);
      return;
    }
    dispatchItem(nextIndex);
  };

  // Start Batch
  const handleStartBatch = () => {
    if (queue.length === 0 || selectedIds.size === 0) return;
    setIsRunning(true);
    setIsPaused(false);
    setCompletedCount(0);
    setSkippedCount(0);
    dispatchItem(0);
  };

  // Pause Batch
  const handlePauseBatch = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setIsPaused(true);
  };

  // Resume Batch
  const handleResumeBatch = () => {
    setIsPaused(false);
    if (currentIndex >= 0 && currentIndex < queue.length - 1) {
      scheduleNext(currentIndex + 1);
    } else {
      dispatchItem(0);
    }
  };

  // Skip Current
  const handleSkipCurrent = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (currentIndex >= 0 && currentIndex < queue.length) {
      setQueue((prev) =>
        prev.map((it, idx) => (idx === currentIndex ? { ...it, status: 'skipped' } : it))
      );
      setSkippedCount((c) => c + 1);
      dispatchItem(currentIndex + 1);
    }
  };

  // Stop / Cancel Batch
  const handleStopBatch = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setIsRunning(false);
    setIsPaused(false);
    setCurrentIndex(-1);
    setCountdown(0);
  };

  // Export report of dispatches
  const handleExportBatchCSV = () => {
    const headers = ['Client Name', 'Phone', 'Folio #', 'Amount Due', 'Due Date', 'Status', 'Channel', 'Timestamp'];
    const rows = queue.map((q) => [
      `"${q.client.name.replace(/"/g, '""')}"`,
      `"${q.client.phone}"`,
      `"${q.client.paperFolioNumber || ''}"`,
      q.amountDue,
      `"${q.dueDate}"`,
      `"${q.status}"`,
      `"${q.channel || channel}"`,
      `"${q.dispatchedAt || ''}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly_reminders_${selectedMonth}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedCount = selectedIds.size;
  const totalAmountDue = queue
    .filter((i) => selectedIds.has(i.client.id))
    .reduce((sum, i) => sum + i.amountDue, 0);

  const monthLabel =
    availableMonths.find((m) => m.value === selectedMonth)?.label || selectedMonth;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-transparent">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Monthly Payment Reminders & Anti-Ban Batch Dispatcher
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
                  Rate-Limited
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Filter clients due in November (or any month), set protective anti-block delays, and dispatch with 1 click.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isRunning}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Row */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Month Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>Target Month</span>
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                disabled={isRunning}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
              >
                {availableMonths.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Channel Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Send className="w-3.5 h-3.5 text-blue-500" />
                <span>Dispatch Channel</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setChannel('whatsapp')}
                  disabled={isRunning}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                    channel === 'whatsapp'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('sms')}
                  disabled={isRunning}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                    channel === 'sms'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>SMS Text</span>
                </button>
              </div>
            </div>

            {/* 3. Anti-Ban Delay Timer Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-rose-500" />
                  <span>Anti-Ban Timing Slabs (Up to 3 Mins)</span>
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    {formatDelayTime(delaySeconds)} ({delaySeconds}s delay)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCustomDelayInput(!showCustomDelayInput)}
                    className="text-[10px] text-blue-500 hover:underline"
                  >
                    {showCustomDelayInput ? 'Show Slabs' : 'Custom'}
                  </button>
                </div>
              </div>

              {!showCustomDelayInput ? (
                <div className="space-y-1.5">
                  {/* Primary 30-second interval slabs up to 3 minutes (180s) */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {[
                      { sec: 30, label: '30s', min: '0.5 min' },
                      { sec: 60, label: '60s', min: '1.0 min' },
                      { sec: 90, label: '90s', min: '1.5 min' },
                      { sec: 120, label: '120s', min: '2.0 min' },
                      { sec: 150, label: '150s', min: '2.5 min' },
                      { sec: 180, label: '180s', min: '3.0 min (Max)' },
                    ].map((slab) => (
                      <button
                        key={slab.sec}
                        type="button"
                        onClick={() => {
                          setDelaySeconds(slab.sec);
                          setCustomDelay(slab.sec.toString());
                        }}
                        disabled={isRunning}
                        className={`py-2 px-1 text-center rounded-xl transition flex flex-col items-center justify-center border ${
                          delaySeconds === slab.sec
                            ? 'bg-amber-500 text-slate-950 font-extrabold border-amber-600 shadow-sm ring-2 ring-amber-400/30'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        <span className="text-xs font-black">{slab.label}</span>
                        <span className={`text-[10px] ${delaySeconds === slab.sec ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                          {slab.min}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Fast Testing Presets */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <span>Quick Test Presets:</span>
                    <div className="flex space-x-1">
                      {[5, 15].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => {
                            setDelaySeconds(sec);
                            setCustomDelay(sec.toString());
                          }}
                          disabled={isRunning}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            delaySeconds === sec
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {sec}s Test
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500 font-medium">Custom Delay:</span>
                  <input
                    type="number"
                    min={2}
                    max={600}
                    value={customDelay}
                    onChange={(e) => {
                      setCustomDelay(e.target.value);
                      const num = parseInt(e.target.value, 10);
                      if (!isNaN(num) && num >= 2) {
                        setDelaySeconds(num);
                      }
                    }}
                    className="w-24 px-2 py-1 text-xs font-mono font-bold rounded bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                  />
                  <span className="text-xs text-slate-500">seconds ({formatDelayTime(delaySeconds)})</span>
                </div>
              )}
            </div>
          </div>

          {/* Anti-Ban Explanation Notice */}
          <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
            <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-snug space-y-1">
              <div>
                <span className="font-bold">Carrier & WhatsApp Spam Protection Active: </span>
                A delay timer of <strong>{formatDelayTime(delaySeconds)} ({delaySeconds} seconds)</strong> between client dispatches prevents cellular SMS networks and WhatsApp algorithms from blocking or rate-limiting your store phone number when sending reminders in bulk.
              </div>
              {selectedCount > 0 && (
                <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400/90 pt-0.5">
                  ⏱ Estimated queue duration for {selectedCount} selected clients: <strong>~{Math.ceil((selectedCount * delaySeconds) / 60)} minutes</strong>.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Active Progress Bar if Running */}
        {isRunning && (
          <div className="p-4 bg-slate-900 text-white border-b border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>
                  {isPaused ? 'Queue Paused' : `Dispatching queue (${completedCount} of ${selectedCount} sent)`}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {!isPaused && countdown > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[11px]">
                    Next in: {formatDelayTime(countdown)} ({countdown}s)
                  </span>
                )}
                <span>{Math.round(((completedCount + skippedCount) / Math.max(1, selectedCount)) * 100)}%</span>
              </div>
            </div>

            {/* Progress Track */}
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.round(((completedCount + skippedCount) / Math.max(1, selectedCount)) * 100)}%`,
                }}
              />
            </div>

            {/* In-Flight Controls */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-[11px] text-slate-400">
                Current:{' '}
                <strong className="text-white">
                  {currentIndex >= 0 && queue[currentIndex]
                    ? queue[currentIndex].client.name
                    : 'Preparing...'}
                </strong>
              </div>
              <div className="flex items-center space-x-1.5">
                {isPaused ? (
                  <button
                    type="button"
                    onClick={handleResumeBatch}
                    className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold flex items-center space-x-1"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePauseBatch}
                    className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold flex items-center space-x-1"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSkipCurrent}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Skip</span>
                </button>
                <button
                  type="button"
                  onClick={handleStopBatch}
                  className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Client Queue List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {/* List Stats & Quick Action Bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={isRunning}
                className="font-bold text-amber-600 dark:text-amber-400 hover:underline"
              >
                {selectedIds.size === queue.length ? 'Deselect All' : 'Select All'}
              </button>
              <span>•</span>
              <span>
                {selectedCount} of {queue.length} clients selected
              </span>
            </div>
            <div className="font-semibold text-slate-700 dark:text-slate-300">
              Total Due in {selectedMonth === 'all' ? 'All Months' : selectedMonth}:{' '}
              <strong className="text-amber-600 dark:text-amber-400">
                {settings.currencySymbol}
                {totalAmountDue.toLocaleString()}
              </strong>
            </div>
          </div>

          {queue.length === 0 ? (
            <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-semibold">No clients pending in {monthLabel}</p>
              <p className="text-xs text-slate-500 mt-1">Try switching to another month above.</p>
            </div>
          ) : (
            queue.map((item, index) => {
              const isSelected = selectedIds.has(item.client.id);
              const isCurrent = currentIndex === index;

              return (
                <div
                  key={item.client.id}
                  className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 text-xs ${
                    isCurrent
                      ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 ring-2 ring-amber-500/30'
                      : item.status === 'sent'
                      ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-500/5'
                      : isSelected
                      ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      : 'border-slate-100 dark:border-slate-800/40 opacity-50 bg-slate-50 dark:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(item.client.id)}
                      disabled={isRunning}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 cursor-pointer disabled:cursor-not-allowed"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          {item.client.name}
                        </span>
                        {item.client.paperFolioNumber && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[10px] font-bold">
                            {item.client.paperFolioNumber}
                          </span>
                        )}
                        {item.client.previousPaperFolioNumber && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                            Prev: {item.client.previousPaperFolioNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-2 mt-0.5">
                        <span>{item.client.phone}</span>
                        <span>•</span>
                        <span>Due: {item.dueDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial & Status */}
                  <div className="text-right shrink-0">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {settings.currencySymbol}
                      {item.amountDue.toLocaleString()}
                    </div>
                    <div>
                      {item.status === 'sent' ? (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Sent ({item.channel?.toUpperCase()}) {item.dispatchedAt}</span>
                        </span>
                      ) : item.status === 'sending' ? (
                        <span className="text-[10px] text-amber-500 font-bold animate-pulse">
                          Dispatching...
                        </span>
                      ) : item.status === 'skipped' ? (
                        <span className="text-[10px] text-slate-400">Skipped</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Queued</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleExportBatchCSV}
              disabled={queue.length === 0}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center space-x-1.5 hover:bg-slate-100 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Queue CSV</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isRunning}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              Close
            </button>

            {!isRunning ? (
              <button
                type="button"
                onClick={handleStartBatch}
                disabled={selectedCount === 0}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition"
              >
                <Send className="w-4 h-4" />
                <span>
                  Start Batch Sending ({selectedCount} via {channel.toUpperCase()})
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopBatch}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition"
              >
                Stop Batch Dispatch
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
