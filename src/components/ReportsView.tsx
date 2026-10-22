import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Table,
  Filter,
  CreditCard,
  TrendingUp,
  DollarSign,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Client, Invoice, Payment, Installment, StoreSettings, ClothingProduct } from '../types';
import { convertToCSV, downloadFile, exportToExcelXML, printFormattedReport } from '../utils/exportUtils';
import { calculateAgingBuckets } from '../utils/calculations';

interface ReportsViewProps {
  clients: Client[];
  invoices: Invoice[];
  payments: Payment[];
  installments: Installment[];
  products: ClothingProduct[];
  settings: StoreSettings;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  clients,
  invoices,
  payments,
  installments,
  products,
  settings,
}) => {
  const curr = settings.currencySymbol;
  const [selectedReport, setSelectedReport] = useState<
    'balances' | 'sales' | 'payments' | 'aging' | 'inventory'
  >('balances');

  const aging = calculateAgingBuckets(installments);

  // Generate Report Data
  const getReportData = () => {
    switch (selectedReport) {
      case 'balances': {
        const title = 'Customer Credit Ledger & Balances Report';
        const headers = [
          'Client ID',
          'Current Folio #',
          'Previous Physical Page Ref',
          'Client Name',
          'Phone',
          'Credit Balance',
          'Credit Limit',
          'Monthly Target',
          'Status',
        ];
        const rows = clients.map((c) => [
          c.id,
          c.paperFolioNumber || 'N/A',
          c.previousPaperFolioNumber || 'None',
          c.name,
          c.phone,
          c.currentBalance,
          c.creditLimit,
          c.monthlyInstallmentTarget,
          c.rating,
        ]);
        const totalBal = clients.reduce((sum, c) => sum + c.currentBalance, 0);
        const summary = `Total Active Clients: ${clients.length} • Total Outstanding Credit Portfolio: ${curr}${totalBal.toLocaleString()}`;
        return { title, headers, rows, summary };
      }
      case 'sales': {
        const title = 'Clothing Sales & Invoicing Audit Report';
        const headers = ['Invoice #', 'Date', 'Client Name', 'Phone', 'Grand Total', 'Down Payment', 'Credit Added', 'Installment Months', 'Cashier'];
        const rows = invoices.map((inv) => [
          inv.invoiceNumber,
          new Date(inv.createdAt).toLocaleDateString(),
          inv.clientName,
          inv.clientPhone,
          inv.grandTotal,
          inv.downPayment,
          inv.creditAmountAdded,
          `${inv.installmentMonths} Months`,
          inv.cashierName,
        ]);
        const totalSales = invoices.reduce((s, i) => s + i.grandTotal, 0);
        const totalDown = invoices.reduce((s, i) => s + i.downPayment, 0);
        const totalCredit = invoices.reduce((s, i) => s + i.creditAmountAdded, 0);
        const summary = `Total Sales Volume: ${curr}${totalSales.toLocaleString()} • Down Payments Received: ${curr}${totalDown.toLocaleString()} • Credit Financed: ${curr}${totalCredit.toLocaleString()}`;
        return { title, headers, rows, summary };
      }
      case 'payments': {
        const title = 'Installment Collections & Cash Ledger Report';
        const headers = ['Receipt #', 'Date', 'Client Name', 'Amount Received', 'Payment Method', 'Previous Balance', 'Remaining Balance', 'Cashier'];
        const rows = payments.map((p) => [
          p.receiptNumber,
          new Date(p.createdAt).toLocaleDateString(),
          p.clientName,
          p.amount,
          p.paymentMethod.replace('_', ' ').toUpperCase(),
          p.previousBalance,
          p.remainingBalance,
          p.cashierName,
        ]);
        const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
        const summary = `Total Payments Recorded: ${payments.length} • Total Installment Cash Recovered: ${curr}${totalCollected.toLocaleString()}`;
        return { title, headers, rows, summary };
      }
      case 'aging': {
        const title = 'Credit Aging & Risk Analysis Report';
        const headers = ['Aging Category', 'Risk Classification', 'Outstanding Amount', 'Status'];
        const rows = [
          ['Current (Not Due)', 'Healthy / On-Time', aging.current, 'Normal'],
          ['1 - 30 Days Overdue', 'Moderate Notice', aging.days30, 'Follow Up'],
          ['31 - 60 Days Overdue', 'Elevated Risk', aging.days60, 'Urgent Call'],
          ['61 - 90 Days Overdue', 'High Delinquency', aging.days90, 'Action Required'],
          ['> 90 Days Past Due', 'Default / Critical', aging.daysOver90, 'Legal / Restructure'],
        ];
        const summary = `Total Delinquent Overdue Amount: ${curr}${aging.totalOverdue.toLocaleString()}`;
        return { title, headers, rows, summary };
      }
      case 'inventory': {
        const title = 'Clothing Stock & Valuation Report';
        const headers = ['SKU', 'Clothing Product Name', 'Category', 'Size', 'Color', 'Selling Price', 'Cost Price', 'Stock Qty', 'Total Valuation'];
        const rows = products.map((p) => [
          p.sku,
          p.name,
          p.category,
          p.size,
          p.color,
          p.price,
          p.costPrice,
          p.stock,
          p.price * p.stock,
        ]);
        const totalVal = products.reduce((s, p) => s + p.price * p.stock, 0);
        const summary = `Total Inventory Catalog Items: ${products.length} • Total Retail Stock Valuation: ${curr}${totalVal.toLocaleString()}`;
        return { title, headers, rows, summary };
      }
    }
  };

  const currentReport = getReportData();

  const handleExportCSV = () => {
    const csv = convertToCSV(currentReport.headers, currentReport.rows);
    downloadFile(csv, `${selectedReport}_report_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  };

  const handleExportExcel = () => {
    exportToExcelXML(
      `${selectedReport}_report_${new Date().toISOString().split('T')[0]}`,
      selectedReport.toUpperCase(),
      currentReport.headers,
      currentReport.rows
    );
  };

  const handlePrintPDF = () => {
    printFormattedReport(
      currentReport.title,
      settings.storeName,
      currentReport.headers,
      currentReport.rows,
      currentReport.summary
    );
  };

  return (
    <div className="space-y-6">
      {/* Header and Report Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-amber-500 font-bold text-xs uppercase tracking-wider mb-1">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Financial Analytics & Business Intelligence</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Exportable Reports & Auditing Center
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Export client balances, sales, installment recoveries, and aging reports to CSV, Excel, or formatted PDF.
            </p>
          </div>

          {/* Export Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel (.xls)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPDF}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Report Category Tabs */}
        <div className="flex space-x-2 overflow-x-auto pt-4 scrollbar-none">
          {[
            { id: 'balances', label: 'Client Credit Balances', count: clients.length },
            { id: 'sales', label: 'Sales & Invoices', count: invoices.length },
            { id: 'payments', label: 'Installment Collections', count: payments.length },
            { id: 'aging', label: 'Credit Aging & Overdue', count: 5 },
            { id: 'inventory', label: 'Inventory Valuation', count: products.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedReport(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center space-x-2 ${
                selectedReport === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] opacity-75 font-mono">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Summary Callout */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {currentReport.title}
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          {currentReport.summary}
        </span>
      </div>

      {/* Report Data Preview Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[550px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
              <tr>
                {currentReport.headers.map((h, i) => (
                  <th key={i} className="py-3 px-4 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentReport.rows.slice(0, 50).map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-2.5 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300">
                      {typeof cell === 'number' ? cell.toLocaleString() : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {currentReport.rows.length > 50 && (
          <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            Showing first 50 of {currentReport.rows.length} rows in live preview. Click "Export CSV" or "Export Excel" to view all records.
          </div>
        )}
      </div>
    </div>
  );
};
