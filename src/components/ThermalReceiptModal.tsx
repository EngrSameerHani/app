import React, { useState, useEffect } from 'react';
import {
  Printer,
  Download,
  Copy,
  Check,
  X,
  FileText,
  Sliders,
  Sparkles,
  Zap,
  Bluetooth,
} from 'lucide-react';
import { Invoice, Payment, Client, StoreSettings } from '../types';
import {
  formatThermalInvoice,
  formatThermalPayment,
  generateEscPosBinary,
  printThermalReceiptInBrowser,
} from '../utils/escpos';
import { downloadFile } from '../utils/exportUtils';
import { playRetailSound } from '../utils/storage';
import { bluetoothPrinter } from '../utils/bluetoothPrinter';

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice;
  payment?: Payment;
  client?: Client;
  settings: StoreSettings;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  isOpen,
  onClose,
  invoice,
  payment,
  client,
  settings,
}) => {
  if (!isOpen || (!invoice && !payment)) return null;

  const [printerWidth, setPrinterWidth] = useState<'58mm' | '80mm'>(settings.printerWidth || '58mm');
  const [copied, setCopied] = useState(false);
  const [serialStatus, setSerialStatus] = useState<string | null>(null);
  const [btConnected, setBtConnected] = useState<boolean>(bluetoothPrinter.isConnected());
  const [btDeviceName, setBtDeviceName] = useState<string | null>(bluetoothPrinter.getConnectedDeviceName());
  const [isBtPrinting, setIsBtPrinting] = useState<boolean>(false);

  useEffect(() => {
    const unsub = bluetoothPrinter.subscribe((status) => {
      setBtConnected(status.connected);
      setBtDeviceName(status.deviceName);
    });
    return unsub;
  }, []);

  // Active Store Settings with width override
  const activeSettings = { ...settings, printerWidth };

  // Generate Receipt Content
  const receiptText = invoice
    ? formatThermalInvoice(invoice, client, activeSettings)
    : payment
    ? formatThermalPayment(payment, client, activeSettings)
    : '';

  // Copy Raw Text
  const handleCopy = () => {
    navigator.clipboard.writeText(receiptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Browser Thermal Print
  const handlePrint = () => {
    if (settings.soundEnabled) playRetailSound('print');
    printThermalReceiptInBrowser(receiptText, printerWidth);
  };

  // Bluetooth ESC/POS Direct Print (for Android & Mobile POS Printers)
  const handleBluetoothPrint = async () => {
    try {
      setIsBtPrinting(true);
      setSerialStatus('Initiating Bluetooth Thermal Printer connection...');
      if (!bluetoothPrinter.isConnected()) {
        const name = await bluetoothPrinter.connect();
        setSerialStatus(`Connected to ${name}. Sending receipt data...`);
      } else {
        setSerialStatus(`Sending receipt data to ${bluetoothPrinter.getConnectedDeviceName()}...`);
      }

      const binary = generateEscPosBinary(receiptText, settings.autoCutPaper);
      await bluetoothPrinter.printRaw(binary);
      setSerialStatus(`✓ Receipt printed via Bluetooth to ${bluetoothPrinter.getConnectedDeviceName()}!`);
      if (settings.soundEnabled) playRetailSound('success');
    } catch (err: any) {
      setSerialStatus(`Bluetooth Error: ${err.message || 'Cancelled or printer unavailable'}`);
    } finally {
      setIsBtPrinting(false);
    }
  };

  // Download ESC/POS Raw Binary (.bin)
  const handleDownloadBinary = () => {
    const binary = generateEscPosBinary(receiptText, settings.autoCutPaper);
    const blob = new Blob([binary as unknown as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${invoice ? invoice.invoiceNumber : payment?.receiptNumber}_${printerWidth}.bin`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Web Serial Direct Print (for connected USB thermal receipt printers)
  const handleWebSerialPrint = async () => {
    try {
      if (!('serial' in navigator)) {
        setSerialStatus('Web Serial API is not supported in this browser. Please use "Print via Browser".');
        return;
      }
      setSerialStatus('Requesting USB / Serial Printer port...');
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      const writer = port.writable.getWriter();
      const binary = generateEscPosBinary(receiptText, settings.autoCutPaper);
      await writer.write(binary);
      writer.releaseLock();
      await port.close();
      setSerialStatus('Printed successfully to ESC/POS thermal printer!');
      if (settings.soundEnabled) playRetailSound('success');
    } catch (err: any) {
      setSerialStatus(`Printer connection: ${err.message || 'Cancelled or busy'}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Thermal POS Receipt Preview
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {invoice ? `Invoice: ${invoice.invoiceNumber}` : `Receipt: ${payment?.receiptNumber}`}
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

        {/* Printer Width Selector & Options */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Paper Roll Width:
          </span>
          <div className="flex space-x-1">
            <button
              type="button"
              onClick={() => setPrinterWidth('58mm')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                printerWidth === '58mm'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              58mm (2-Inch / 32-Col)
            </button>
            <button
              type="button"
              onClick={() => setPrinterWidth('80mm')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                printerWidth === '80mm'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              80mm (3-Inch / 48-Col)
            </button>
          </div>
        </div>

        {/* Monospace Thermal Receipt Visualizer */}
        <div className="flex justify-center bg-slate-100 dark:bg-slate-950/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 max-h-96 overflow-y-auto">
          <div
            className={`bg-white text-slate-950 font-mono shadow-md border-t-4 border-amber-500 p-4 rounded-sm text-[11px] leading-tight select-text ${
              printerWidth === '58mm' ? 'w-64 max-w-[58mm]' : 'w-96 max-w-[80mm]'
            }`}
          >
            <pre className="whitespace-pre-wrap font-mono">{receiptText}</pre>
            <div className="border-t border-dashed border-slate-400 mt-2 pt-2 text-center text-[10px] text-slate-400">
              ✂ [Auto Cut Paper Line]
            </div>
          </div>
        </div>

        {/* Status message */}
        {serialStatus && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium text-center">
            {serialStatus}
          </p>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          {/* Main Dual Print Buttons (Bluetooth Direct & Browser Print) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleBluetoothPrint}
              disabled={isBtPrinting}
              className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg transition ${
                btConnected
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
              } disabled:opacity-50`}
            >
              <Bluetooth className="w-4 h-4" />
              <span>
                {isBtPrinting
                  ? 'Printing to Bluetooth...'
                  : btConnected
                  ? `Print via Bluetooth (${btDeviceName || 'Connected'})`
                  : 'Pair & Print via Bluetooth'}
              </span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Browser Slip ({printerWidth})</span>
            </button>
          </div>

          {/* Secondary Options */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={handleWebSerialPrint}
              className="py-2 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium flex items-center justify-center space-x-1"
              title="Send directly over USB COM serial"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>USB Serial</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadBinary}
              className="py-2 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium flex items-center justify-center space-x-1"
              title="Download raw ESC/POS binary"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ESC/POS (.bin)</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="py-2 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium flex items-center justify-center space-x-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Slip'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
