import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  DollarSign,
  FileText,
  Send,
  Plus,
  BookOpen,
  ArrowUpDown,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  CreditCard,
  Smartphone,
  MessageSquare,
} from 'lucide-react';
import { Client, Invoice, Payment, Installment, StoreSettings } from '../types';
import { calculateRunningLedger } from '../utils/calculations';
import { convertToCSV, downloadFile, exportToExcelXML, printFormattedReport } from '../utils/exportUtils';

interface ClientsViewProps {
  clients: Client[];
  invoices: Invoice[];
  payments: Payment[];
  installments: Installment[];
  settings: StoreSettings;
  onSelectClientForInvoice: (client: Client) => void;
  onOpenPaymentModal: (client: Client) => void;
  onOpenPaperMigration: () => void;
  onSendWhatsAppReminder: (client: Client, installment?: Installment) => void;
  onSendSMSReminder: (client: Client, installment?: Installment) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  invoices,
  payments,
  installments,
  settings,
  onSelectClientForInvoice,
  onOpenPaymentModal,
  onOpenPaperMigration,
  onSendWhatsAppReminder,
  onSendSMSReminder,
}) => {
  const curr = settings.currencySymbol;

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'balance' | 'overdue' | 'settled'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Active Ledger Detail Drawer
  const [selectedClientForLedger, setSelectedClientForLedger] = useState<Client | null>(null);
  const [ledgerActiveTab, setLedgerActiveTab] = useState<'statement' | 'installments' | 'invoices'>('statement');

  // Filter Logic
  const filteredClients = useMemo(() => {
    let result = [...clients];

    if (activeFilter === 'balance') {
      result = result.filter((c) => c.currentBalance > 0);
    } else if (activeFilter === 'overdue') {
      result = result.filter((c) => c.rating === 'Overdue' || c.rating === 'High Risk');
    } else if (activeFilter === 'settled') {
      result = result.filter((c) => c.currentBalance <= 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.address.toLowerCase().includes(q) ||
          (c.paperFolioNumber && c.paperFolioNumber.toLowerCase().includes(q)) ||
          (c.previousPaperFolioNumber && c.previousPaperFolioNumber.toLowerCase().includes(q))
      );
    }

    return result;
  }, [clients, activeFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / pageSize) || 1;
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClients.slice(start, start + pageSize);
  }, [filteredClients, currentPage]);

  // Client Specific Ledger Computation
  const clientInvoices = useMemo(() => {
    if (!selectedClientForLedger) return [];
    return invoices.filter((inv) => inv.clientId === selectedClientForLedger.id);
  }, [selectedClientForLedger, invoices]);

  const clientPayments = useMemo(() => {
    if (!selectedClientForLedger) return [];
    return payments.filter((p) => p.clientId === selectedClientForLedger.id);
  }, [selectedClientForLedger, payments]);

  const clientInstallments = useMemo(() => {
    if (!selectedClientForLedger) return [];
    return installments.filter((i) => i.clientId === selectedClientForLedger.id);
  }, [selectedClientForLedger, installments]);

  const runningLedger = useMemo(() => {
    if (!selectedClientForLedger) return [];
    return calculateRunningLedger(
      clientInvoices,
      clientPayments,
      0,
      selectedClientForLedger.paperFolioNumber
    );
  }, [selectedClientForLedger, clientInvoices, clientPayments]);

  // Export Full Client List
  const handleExportClientsCSV = () => {
    const headers = [
      'Client ID',
      'Current Folio #',
      'Previous Physical Page Ref',
      'Client Name',
      'Phone',
      'Address',
      'Credit Balance',
      'Credit Limit',
      'Monthly Target',
      'Rating',
    ];
    const rows = clients.map((c) => [
      c.id,
      c.paperFolioNumber || 'N/A',
      c.previousPaperFolioNumber || 'None',
      c.name,
      c.phone,
      c.address,
      c.currentBalance,
      c.creditLimit,
      c.monthlyInstallmentTarget,
      c.rating,
    ]);
    const csv = convertToCSV(headers, rows);
    downloadFile(csv, `usman_cloth_rehra_clients_2000_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  };

  // Export Individual Statement
  const handleExportClientStatement = () => {
    if (!selectedClientForLedger) return;
    const headers = ['Date', 'Type', 'Reference #', 'Description', 'Debit (Purchase)', 'Credit (Payment)', 'Running Balance'];
    const rows = runningLedger.map((l) => [
      l.date,
      l.type.toUpperCase(),
      l.refNumber,
      l.description,
      l.debit || 0,
      l.credit || 0,
      l.balance,
    ]);
    printFormattedReport(
      `Customer Account Statement - ${selectedClientForLedger.name}`,
      settings.storeName,
      headers,
      rows,
      `Phone: ${selectedClientForLedger.phone} • Current Folio: ${selectedClientForLedger.paperFolioNumber || 'None'} • Prev Physical Page Ref: ${selectedClientForLedger.previousPaperFolioNumber || 'None'} • Current Balance: ${curr}${selectedClientForLedger.currentBalance.toLocaleString()} • Credit Limit: ${curr}${selectedClientForLedger.creditLimit.toLocaleString()}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Search, Filter Bar and Bulk Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Users className="w-5 h-5 text-amber-500" />
              <span>Client Ledger Directory ({clients.length} Registered Accounts)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Digitized revolving credit records with paper folio book references, previous physical record links & monthly installment tracking
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenPaperMigration}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Digitize Paper Folio</span>
            </button>

            <button
              type="button"
              onClick={handleExportClientsCSV}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV ({clients.length} Clients)</span>
            </button>
          </div>
        </div>

        {/* Search Input & Filter Chips */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search 2,000+ digitized clients by name, phone, address, current folio (e.g. B2-P045) or prev physical page (e.g. B1-P180)..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setActiveFilter('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeFilter === 'all'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All Clients ({clients.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveFilter('balance');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeFilter === 'balance'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              With Balance ({clients.filter((c) => c.currentBalance > 0).length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveFilter('overdue');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeFilter === 'overdue'
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Overdue / Risk ({clients.filter((c) => c.rating === 'Overdue' || c.rating === 'High Risk').length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveFilter('settled');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeFilter === 'settled'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Settled / $0 Bal ({clients.filter((c) => c.currentBalance <= 0).length})
            </button>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Paper Folio #</th>
                <th className="py-3 px-4">Client Name & Phone</th>
                <th className="py-3 px-4">Address / Market</th>
                <th className="py-3 px-4">Credit Balance</th>
                <th className="py-3 px-4">Credit Limit</th>
                <th className="py-3 px-4">Status / Rating</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No clients found matching your search.
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    {/* Folio */}
                    <td className="py-3 px-4 font-mono font-semibold text-slate-600 dark:text-slate-300">
                      {client.paperFolioNumber ? (
                        <div>
                          <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 font-bold">
                            {client.paperFolioNumber}
                          </span>
                          {client.previousPaperFolioNumber && (
                            <div className="text-[10px] text-slate-400 font-sans mt-0.5 flex items-center space-x-1" title="Carried over from physical record">
                              <span>Prev:</span>
                              <span className="font-mono font-medium text-slate-600 dark:text-slate-300">{client.previousPaperFolioNumber}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>

                    {/* Name & Phone */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{client.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{client.phone}</div>
                    </td>

                    {/* Address */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
                      {client.address}
                    </td>

                    {/* Balance */}
                    <td className="py-3 px-4">
                      <div className={`font-extrabold ${client.currentBalance > 0 ? 'text-amber-600 dark:text-amber-400 text-sm' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {curr}{client.currentBalance.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Target: {curr}{client.monthlyInstallmentTarget.toLocaleString()}/mo
                      </div>
                    </td>

                    {/* Limit */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      <div>{curr}{client.creditLimit.toLocaleString()}</div>
                      <div className="w-20 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full ${
                            client.currentBalance > client.creditLimit * 0.9
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (client.currentBalance / client.creditLimit) * 100)}%`,
                          }}
                        />
                      </div>
                    </td>

                    {/* Rating */}
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          client.rating === 'A+'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : client.rating === 'Good'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                            : client.rating === 'Fair'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                        }`}
                      >
                        {client.rating}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* View Ledger */}
                        <button
                          type="button"
                          onClick={() => setSelectedClientForLedger(client)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] transition"
                          title="Open digitized running ledger"
                        >
                          Ledger
                        </button>

                        {/* Record Payment */}
                        <button
                          type="button"
                          onClick={() => onOpenPaymentModal(client)}
                          className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-600 dark:text-emerald-400 transition"
                          title="Record payment & print receipt"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                        </button>

                        {/* New Invoice */}
                        <button
                          type="button"
                          onClick={() => onSelectClientForInvoice(client)}
                          className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 text-amber-600 dark:text-amber-400 transition"
                          title="Create new shopping invoice"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        {/* 1-Click WhatsApp & SMS Reminders */}
                        {client.currentBalance > 0 && (
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => onSendWhatsAppReminder(client)}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-600 transition"
                              title="1-Click WhatsApp payment reminder"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onSendSMSReminder(client)}
                              className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-600 transition"
                              title="1-Click SMS payment reminder"
                            >
                              <Smartphone className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredClients.length)} of {filteredClients.length} clients
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Client Detail & Running Balance Ledger Modal */}
      {selectedClientForLedger && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center font-bold text-lg shadow-md">
                  {selectedClientForLedger.name[0]}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedClientForLedger.name}
                    </h3>
                    {selectedClientForLedger.paperFolioNumber && (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold">
                        Folio: {selectedClientForLedger.paperFolioNumber}
                      </span>
                    )}
                    {selectedClientForLedger.previousPaperFolioNumber && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                        Prev Physical Record: {selectedClientForLedger.previousPaperFolioNumber}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Phone: {selectedClientForLedger.phone} • {selectedClientForLedger.address}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedClientForLedger(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                <div className="text-slate-500 dark:text-slate-400">Current Outstanding</div>
                <div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  {curr}{selectedClientForLedger.currentBalance.toLocaleString()}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                <div className="text-slate-500 dark:text-slate-400">Credit Limit</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {curr}{selectedClientForLedger.creditLimit.toLocaleString()}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                <div className="text-slate-500 dark:text-slate-400">Agreed Monthly Payment</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {curr}{selectedClientForLedger.monthlyInstallmentTarget.toLocaleString()}/mo
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                <div className="text-slate-500 dark:text-slate-400">Credit Rating</div>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedClientForLedger.rating}
                </div>
              </div>
            </div>

            {/* Tabs for Drawer */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setLedgerActiveTab('statement')}
                  className={`py-2 px-3 text-xs font-bold border-b-2 transition ${
                    ledgerActiveTab === 'statement'
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Running Balance Statement ({runningLedger.length})
                </button>

                <button
                  type="button"
                  onClick={() => setLedgerActiveTab('installments')}
                  className={`py-2 px-3 text-xs font-bold border-b-2 transition ${
                    ledgerActiveTab === 'installments'
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Active Installments ({clientInstallments.length})
                </button>

                <button
                  type="button"
                  onClick={() => setLedgerActiveTab('invoices')}
                  className={`py-2 px-3 text-xs font-bold border-b-2 transition ${
                    ledgerActiveTab === 'invoices'
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Shopping Invoices ({clientInvoices.length})
                </button>
              </div>

              <div className="flex items-center space-x-2">
                {selectedClientForLedger.currentBalance > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => onSendWhatsAppReminder(selectedClientForLedger)}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition"
                      title="1-Click WhatsApp monthly installment reminder"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>1-Click WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSendSMSReminder(selectedClientForLedger)}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition"
                      title="1-Click SMS monthly installment reminder"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>1-Click SMS</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleExportClientStatement}
                  className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-medium"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Statement Slip</span>
                </button>
              </div>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto">
              {ledgerActiveTab === 'statement' && (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Ref #</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Debit (+)</th>
                      <th className="py-2.5 px-3 text-right">Credit (-)</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {runningLedger.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400">
                          No transactions recorded yet for this client.
                        </td>
                      </tr>
                    ) : (
                      runningLedger.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                            {new Date(row.date).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                row.type === 'invoice'
                                  ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                  : row.type === 'payment'
                                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400'
                              }`}
                            >
                              {row.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                            {row.refNumber}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 max-w-[240px] truncate">
                            {row.description}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-amber-600 dark:text-amber-400">
                            {row.debit > 0 ? `${curr}${row.debit.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                            {row.credit > 0 ? `${curr}${row.credit.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                            {curr}{row.balance.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {ledgerActiveTab === 'installments' && (
                <div className="space-y-2.5">
                  {clientInstallments.length === 0 ? (
                    <p className="text-center py-6 text-slate-400 text-xs">No active installment plans.</p>
                  ) : (
                    clientInstallments.map((inst) => (
                      <div
                        key={inst.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            Installment #{inst.installmentNumber} of {inst.totalInstallments} • Invoice {inst.invoiceNumber}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Due Date: <strong>{inst.dueDate}</strong>
                            {inst.paidAt && ` • Paid on ${new Date(inst.paidAt).toLocaleDateString()}`}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {curr}{inst.amount.toLocaleString()}
                            </div>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                inst.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : inst.status === 'overdue'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                              }`}
                            >
                              {inst.status.toUpperCase()}
                            </span>
                          </div>

                          {inst.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => {
                                onSendWhatsAppReminder(selectedClientForLedger, inst);
                              }}
                              className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition"
                              title="Send WhatsApp Reminder for this installment"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {ledgerActiveTab === 'invoices' && (
                <div className="space-y-3">
                  {clientInvoices.length === 0 ? (
                    <p className="text-center py-6 text-slate-400 text-xs">No invoices found.</p>
                  ) : (
                    clientInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                          <span>{inv.invoiceNumber}</span>
                          <span>{curr}{inv.grandTotal.toLocaleString()}</span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                          {inv.items.map((i) => `${i.description} [${i.size}] x${i.quantity}`).join(', ')}
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700">
                          <span>Down Payment: {curr}{inv.downPayment.toLocaleString()} ({inv.downPaymentMethod})</span>
                          <span>Credit Added: +{curr}{inv.creditAmountAdded.toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => onOpenPaymentModal(selectedClientForLedger)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition"
              >
                <DollarSign className="w-4 h-4" />
                <span>Receive Payment</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const client = selectedClientForLedger;
                  setSelectedClientForLedger(null);
                  onSelectClientForInvoice(client);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition"
              >
                <FileText className="w-4 h-4" />
                <span>New Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
