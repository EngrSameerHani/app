import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  CheckCircle,
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Client, StoreSettings } from '../types';
import { downloadFile, convertToCSV } from '../utils/exportUtils';
import { playRetailSound } from '../utils/storage';

interface PaperMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMigratedClient: (client: Client) => void;
  onBulkImportClients: (clients: Client[]) => void;
  settings: StoreSettings;
  existingClientCount: number;
}

export const PaperMigrationModal: React.FC<PaperMigrationModalProps> = ({
  isOpen,
  onClose,
  onAddMigratedClient,
  onBulkImportClients,
  settings,
  existingClientCount,
}) => {
  if (!isOpen) return null;

  const curr = settings.currencySymbol;

  // Single Record Entry State
  const [bookNumber, setBookNumber] = useState('1');
  const [pageNumber, setPageNumber] = useState('1');
  const [prevPaperFolio, setPrevPaperFolio] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [startingBalance, setStartingBalance] = useState<number>(15000);
  const [monthlyTarget, setMonthlyTarget] = useState<number>(5000);
  const [notes, setNotes] = useState('');
  const [savedCountThisSession, setSavedCountThisSession] = useState(0);

  // Bulk CSV Upload State
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);

  const handleSaveAndNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const folioStr = `B${bookNumber}-P${pageNumber.padStart(3, '0')}`;
    const newClient: Client = {
      id: `client-migrated-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim() || 'Local Customer',
      paperFolioNumber: folioStr,
      previousPaperFolioNumber: prevPaperFolio.trim() || undefined,
      creditLimit: Math.max(startingBalance + 30000, 50000),
      currentBalance: Math.max(0, startingBalance),
      monthlyInstallmentTarget: monthlyTarget > 0 ? monthlyTarget : Math.round(startingBalance / 3),
      notes: notes.trim()
        ? `[Paper Migrated from ${folioStr}${prevPaperFolio ? ` (Prev Ref: ${prevPaperFolio})` : ''}]: ${notes.trim()}`
        : `Migrated from Paper Book ${bookNumber} Page ${pageNumber}${prevPaperFolio ? ` (Carried from ${prevPaperFolio})` : ''}`,
      rating: startingBalance > 40000 ? 'Fair' : 'Good',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    if (settings.soundEnabled) playRetailSound('beep');
    onAddMigratedClient(newClient);
    setSavedCountThisSession((prev) => prev + 1);

    // Auto increment page number for rapid data entry!
    const nextPage = parseInt(pageNumber, 10) + 1;
    setPageNumber(nextPage.toString());
    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setPrevPaperFolio('');
  };

  const handleDownloadSampleCSV = () => {
    const headers = ['Client Name', 'Mobile Phone', 'Address', 'Current Folio Number', 'Opening Credit Balance', 'Monthly Installment Target', 'Notes', 'Previous Physical Page Reference'];
    const sampleRows = [
      ['Mohammad Aslam', '0300-8472910', 'Main Bazaar Rehra', 'B2-P001', '18000', '6000', 'Regular customer since 2022', 'B1-P180'],
      ['Rashid Minhas', '0321-4920194', 'Purana Bazaar Rehra', 'B2-P002', '24500', '8000', 'Purchased 2 winter suits', 'B1-P145'],
      ['Fatima Bibi', '0345-9827102', 'Station Road Rehra', 'B2-P003', '12000', '4000', 'Bridal suit installment', 'Old Khata Page 45'],
    ];
    const csv = convertToCSV(headers, sampleRows);
    downloadFile(csv, 'usman_cloth_rehra_paper_ledger_migration_template.csv', 'text/csv');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length <= 1) {
          setBulkStatus('CSV file has no data rows.');
          return;
        }

        const newClients: Client[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
          if (cols.length >= 2 && cols[0]) {
            const clientName = cols[0];
            const clientPhone = cols[1] || '0300-0000000';
            const clientAddress = cols[2] || 'Store Client';
            const folio = cols[3] || `FOLIO-${existingClientCount + i}`;
            const bal = parseFloat(cols[4]) || 0;
            const target = parseFloat(cols[5]) || Math.round(bal / 3);
            const clientNotes = cols[6] || 'Imported via CSV ledger';
            const prevFolioRef = cols[7] || undefined;

            newClients.push({
              id: `client-csv-${Date.now()}-${i}`,
              name: clientName,
              phone: clientPhone,
              address: clientAddress,
              paperFolioNumber: folio,
              previousPaperFolioNumber: prevFolioRef,
              creditLimit: Math.max(bal + 25000, 50000),
              currentBalance: bal,
              monthlyInstallmentTarget: target,
              notes: prevFolioRef ? `${clientNotes} [Carried from ${prevFolioRef}]` : clientNotes,
              rating: bal > 40000 ? 'Fair' : 'Good',
              createdAt: new Date().toISOString().split('T')[0],
              updatedAt: new Date().toISOString().split('T')[0],
            });
          }
        }

        onBulkImportClients(newClients);
        setBulkStatus(`Successfully imported ${newClients.length} client accounts!`);
        if (settings.soundEnabled) playRetailSound('success');
      } catch (err) {
        setBulkStatus('Error parsing CSV file. Please use the sample template.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Paper Register & Khata Book Digitizer
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transfer existing 2,000+ paper accounts into digital revolving installment profiles with previous physical page linking
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {savedCountThisSession > 0 && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between">
            <span className="font-semibold">
              ✓ Digitized {savedCountThisSession} paper account{savedCountThisSession > 1 ? 's' : ''} in this session!
            </span>
            <span className="text-[11px] text-slate-400">Next folio prefilled automatically</span>
          </div>
        )}

        {/* Rapid Single Entry Form */}
        <form onSubmit={handleSaveAndNext} className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Physical Paper Register & Page Reference</span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                Auto-links to Client Profile
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                  Current Register Book #
                </label>
                <input
                  type="text"
                  value={bookNumber}
                  onChange={(e) => setBookNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                  placeholder="e.g. 2"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                  Current Folio / Page # *
                </label>
                <input
                  type="text"
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                  placeholder="e.g. 45"
                />
              </div>
            </div>

            {/* Previous Physical Record Page Reference */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-amber-900 dark:text-amber-300 font-bold text-[11px] flex items-center space-x-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Reference Number of Previous Page of Physical Record *</span>
                </label>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  Physical Register Audit Trail
                </span>
              </div>

              <input
                type="text"
                value={prevPaperFolio}
                onChange={(e) => setPrevPaperFolio(e.target.value)}
                placeholder="e.g. B1-P180 or Register Book 1, Page 142 or Old Khata 2024 Page 85"
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700/60 text-slate-900 dark:text-white font-mono font-semibold"
              />

              {/* Quick Fill Helper Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Quick suggestions:</span>
                {parseInt(bookNumber) > 1 && (
                  <button
                    type="button"
                    onClick={() => setPrevPaperFolio(`B${parseInt(bookNumber) - 1}-P180`)}
                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] font-mono hover:bg-amber-50 hover:border-amber-400 text-slate-700 dark:text-slate-300 transition"
                  >
                    B{parseInt(bookNumber) - 1}-P180
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPrevPaperFolio(`Book 1, Page ${pageNumber}`)}
                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] font-mono hover:bg-amber-50 hover:border-amber-400 text-slate-700 dark:text-slate-300 transition"
                >
                  Book 1, Page {pageNumber}
                </button>
                <button
                  type="button"
                  onClick={() => setPrevPaperFolio(`Old Khata 2024 Page ${pageNumber}`)}
                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] font-mono hover:bg-amber-50 hover:border-amber-400 text-slate-700 dark:text-slate-300 transition"
                >
                  Old Khata 2024 Page {pageNumber}
                </button>
                <button
                  type="button"
                  onClick={() => setPrevPaperFolio(`Prev Page #${Math.max(1, parseInt(pageNumber) - 1)}`)}
                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[10px] font-mono hover:bg-amber-50 hover:border-amber-400 text-slate-700 dark:text-slate-300 transition"
                >
                  Prev Page #{Math.max(1, parseInt(pageNumber) - 1)}
                </button>
              </div>

              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Whenever a client balance is carried forward between paper registers, record the previous physical page reference here so Usman can pull up the physical book anytime.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Client Full Name *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name as written in paper book..."
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mobile Phone (for WhatsApp Reminders) *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0300-8472910"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Old Balance from Paper ({curr}) *
              </label>
              <input
                type="number"
                min={0}
                required
                value={startingBalance}
                onChange={(e) => setStartingBalance(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-amber-600 dark:text-amber-400 text-sm"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Agreed Monthly Installment ({curr})
              </label>
              <input
                type="number"
                min={0}
                value={monthlyTarget}
                onChange={(e) => setMonthlyTarget(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Address / Market Location
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Main Market, Faisalabad"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Handwritten Notes / Past Clothing Details
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bought 3 silk kurtas on Eid, always pays on 10th of every month"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Pressing "Save & Next Account" auto-increments page to #{parseInt(pageNumber || '0') + 1}
            </span>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-500/20 transition"
            >
              <span>Save & Next Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Bulk Spreadsheet Import Section */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                <span>Bulk Spreadsheet Import (2,000+ Accounts)</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Already have accounts in Excel? Upload CSV to import in bulk.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadSampleCSV}
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <label className="flex-1 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 text-center cursor-pointer hover:border-amber-500 transition">
              <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Click to upload filled CSV file
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {bulkStatus && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {bulkStatus}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
