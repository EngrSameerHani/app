import React from 'react';
import {
  CreditCard,
  DollarSign,
  Users,
  AlertTriangle,
  TrendingUp,
  Clock,
  ArrowUpRight,
  PlusCircle,
  FileText,
  BookOpen,
  Send,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Client, Invoice, Payment, Installment, StoreSettings } from '../types';
import { calculateStoreMetrics } from '../utils/calculations';

interface DashboardProps {
  clients: Client[];
  invoices: Invoice[];
  payments: Payment[];
  installments: Installment[];
  settings: StoreSettings;
  onNavigate: (tab: string) => void;
  onSelectClient: (client: Client) => void;
  onOpenNewPayment: (client?: Client) => void;
  onOpenPaperMigration: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  clients,
  invoices,
  payments,
  installments,
  settings,
  onNavigate,
  onSelectClient,
  onOpenNewPayment,
  onOpenPaperMigration,
}) => {
  const metrics = calculateStoreMetrics(clients, invoices, payments, installments);
  const curr = settings.currencySymbol;

  // Find top clients by balance
  const topOwingClients = [...clients]
    .filter((c) => c.currentBalance > 0)
    .sort((a, b) => b.currentBalance - a.currentBalance)
    .slice(0, 5);

  // Recent invoices & payments combined
  const recentActivities = [
    ...invoices.slice(-5).map((inv) => ({
      id: inv.id,
      type: 'invoice' as const,
      title: `Invoice ${inv.invoiceNumber} - ${inv.clientName}`,
      desc: `${inv.items.length} items • Down: ${curr}${inv.downPayment.toLocaleString()} • Credit: +${curr}${inv.creditAmountAdded.toLocaleString()}`,
      time: inv.createdAt,
      clientName: inv.clientName,
      amount: inv.grandTotal,
    })),
    ...payments.slice(-5).map((pay) => ({
      id: pay.id,
      type: 'payment' as const,
      title: `Payment Receipt ${pay.receiptNumber} - ${pay.clientName}`,
      desc: `Paid via ${pay.paymentMethod.replace('_', ' ').toUpperCase()} • Rem. Bal: ${curr}${pay.remainingBalance.toLocaleString()}`,
      time: pay.createdAt,
      clientName: pay.clientName,
      amount: pay.amount,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 6);

  // Calculate aging percentages
  const agingTotal = metrics.aging.current + metrics.aging.days30 + metrics.aging.days60 + metrics.aging.days90 + metrics.aging.daysOver90 || 1;
  const pCurrent = Math.round((metrics.aging.current / agingTotal) * 100);
  const p30 = Math.round((metrics.aging.days30 / agingTotal) * 100);
  const p60 = Math.round((metrics.aging.days60 / agingTotal) * 100);
  const p90 = Math.round((metrics.aging.days90 / agingTotal) * 100);
  const pOver90 = Math.round((metrics.aging.daysOver90 / agingTotal) * 100);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Action Buttons */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-amber-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Clothing Retail Credit Operations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Revolving Installment & Credit Overview
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Currently managing <strong className="text-white">{metrics.totalClientsCount} digitized client profiles</strong> with active 0% interest monthly installment plans.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('pos')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New POS Invoice</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenNewPayment()}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition"
            >
              <DollarSign className="w-4 h-4" />
              <span>Record Client Payment</span>
            </button>

            <button
              type="button"
              onClick={onOpenPaperMigration}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold text-xs transition"
            >
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Migrate Paper Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outstanding Credit */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Total Outstanding Credit</span>
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {curr}{metrics.totalOutstandingCredit.toLocaleString()}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Revolving installment debt</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">{metrics.activeClientsWithCredit} clients owing</span>
          </p>
        </div>

        {/* Total Cash Collected */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Total Cash Collected</span>
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {curr}{metrics.totalCashCollected.toLocaleString()}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Down payments + installment receipts
          </p>
        </div>

        {/* Overdue Installments */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Overdue Amount</span>
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {curr}{metrics.overdueAmount.toLocaleString()}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{metrics.overdueCount} overdue installments</span>
            <button
              type="button"
              onClick={() => onNavigate('reminders')}
              className="text-xs text-rose-600 dark:text-rose-400 underline font-semibold hover:text-rose-700"
            >
              Remind Now
            </button>
          </p>
        </div>

        {/* Total Clients in Registry */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Digitized Client Accounts</span>
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {metrics.totalClientsCount}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
              100% Digitized
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Physical ledger register books synced
          </p>
        </div>
      </div>

      {/* Credit Aging Analysis & Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Aging Breakdown Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Credit Aging Schedule (Installment Health)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Categorization of outstanding balances by days past payment due date
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center space-x-1"
            >
              <span>Full Aging Report</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Segmented Progress Bar */}
          <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800 mb-6">
            <div style={{ width: `${Math.max(pCurrent, 2)}%` }} title={`Current (0-30): ${curr}${metrics.aging.current}`} className="bg-emerald-500 h-full" />
            <div style={{ width: `${Math.max(p30, 2)}%` }} title={`1-30d Overdue: ${curr}${metrics.aging.days30}`} className="bg-amber-400 h-full" />
            <div style={{ width: `${Math.max(p60, 2)}%` }} title={`31-60d Overdue: ${curr}${metrics.aging.days60}`} className="bg-orange-500 h-full" />
            <div style={{ width: `${Math.max(p90, 2)}%` }} title={`61-90d Overdue: ${curr}${metrics.aging.days90}`} className="bg-rose-500 h-full" />
            <div style={{ width: `${Math.max(pOver90, 2)}%` }} title={`>90d Overdue: ${curr}${metrics.aging.daysOver90}`} className="bg-red-800 h-full" />
          </div>

          {/* Aging Categories Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
              <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400">Current (Not Due)</div>
              <div className="text-sm font-bold text-emerald-950 dark:text-emerald-200 mt-1">
                {curr}{metrics.aging.current.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-500 mt-0.5">{pCurrent}% of credit</div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
              <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-400">1 - 30 Days</div>
              <div className="text-sm font-bold text-amber-950 dark:text-amber-200 mt-1">
                {curr}{metrics.aging.days30.toLocaleString()}
              </div>
              <div className="text-[10px] text-amber-700 dark:text-amber-500 mt-0.5">{p30}% overdue</div>
            </div>

            <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40">
              <div className="text-[11px] font-semibold text-orange-800 dark:text-orange-400">31 - 60 Days</div>
              <div className="text-sm font-bold text-orange-950 dark:text-orange-200 mt-1">
                {curr}{metrics.aging.days60.toLocaleString()}
              </div>
              <div className="text-[10px] text-orange-700 dark:text-orange-500 mt-0.5">{p60}% overdue</div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
              <div className="text-[11px] font-semibold text-rose-800 dark:text-rose-400">61 - 90 Days</div>
              <div className="text-sm font-bold text-rose-950 dark:text-rose-200 mt-1">
                {curr}{metrics.aging.days90.toLocaleString()}
              </div>
              <div className="text-[10px] text-rose-700 dark:text-rose-500 mt-0.5">{p90}% overdue</div>
            </div>

            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
              <div className="text-[11px] font-semibold text-red-800 dark:text-red-400">&gt; 90 Days (Critical)</div>
              <div className="text-sm font-bold text-red-950 dark:text-red-200 mt-1">
                {curr}{metrics.aging.daysOver90.toLocaleString()}
              </div>
              <div className="text-[10px] text-red-700 dark:text-red-500 mt-0.5">{pOver90}% high risk</div>
            </div>
          </div>
        </div>

        {/* Paper Ledger Migration Callout Card */}
        <div className="bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-6 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <BookOpen className="w-4 h-4" />
              <span>Paper Ledger Digitizer</span>
            </div>
            <h3 className="text-lg font-bold">Fast Paper Book Migration</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Have handwritten customer registers? Digitize them in seconds with paper folio book/page tracking, historical balance migration, and instant installment creation.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onOpenPaperMigration}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 transition"
            >
              <BookOpen className="w-4 h-4" />
              <span>Launch Paper Migration Wizard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Credit Clients & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Clients by Credit Balance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Top Outstanding Client Balances</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Clients with highest running installment balance</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('clients')}
              className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline"
            >
              View All ({metrics.totalClientsCount})
            </button>
          </div>

          <div className="space-y-3">
            {topOwingClients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 hover:border-amber-500/40 transition"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                      {client.name}
                    </span>
                    {client.paperFolioNumber && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                        {client.paperFolioNumber}
                      </span>
                    )}
                    {client.previousPaperFolioNumber && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                        Prev: {client.previousPaperFolioNumber}
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-2 py-0.2 rounded-full font-semibold ${
                        client.rating === 'Overdue' || client.rating === 'High Risk'
                          ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                      }`}
                    >
                      {client.rating}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Phone: {client.phone} • Target: {curr}{client.monthlyInstallmentTarget.toLocaleString()}/mo
                  </div>
                </div>

                <div className="text-right flex items-center space-x-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {curr}{client.currentBalance.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">Balance</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectClient(client)}
                    className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-200 transition"
                    title="View client ledger & installments"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Store Transactions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Counter Activity</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Real-time invoices and payment receipts</p>
            </div>
            <span className="text-xs text-emerald-500 font-medium flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Live Terminal</span>
            </span>
          </div>

          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No transactions recorded yet.</p>
            ) : (
              recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl text-xs font-bold ${
                        act.type === 'invoice'
                          ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                          : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {act.type === 'invoice' ? <FileText className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {act.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {act.desc}
                      </div>
                    </div>
                  </div>

                  <div className="text-right pl-2">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {curr}{act.amount.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
