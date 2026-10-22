import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Printer,
  CheckCircle2,
  X,
  CreditCard,
  User,
  AlertCircle,
} from 'lucide-react';
import { Client, Payment, PaymentMethod, StoreSettings, UserAccount } from '../types';
import { playRetailSound } from '../utils/storage';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  initialClient?: Client;
  currentUser: UserAccount;
  settings: StoreSettings;
  onRecordPayment: (payment: Payment, client: Client) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  clients,
  initialClient,
  currentUser,
  settings,
  onRecordPayment,
}) => {
  if (!isOpen) return null;

  const curr = settings.currencySymbol;
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClient?.id || '');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [referenceNote, setReferenceNote] = useState('');

  const selectedClient = clients.find((c) => c.id === selectedClientId) || initialClient;

  useEffect(() => {
    if (selectedClient) {
      // Default to monthly installment target or current balance
      const defaultAmt = Math.min(
        selectedClient.currentBalance,
        selectedClient.monthlyInstallmentTarget > 0
          ? selectedClient.monthlyInstallmentTarget
          : selectedClient.currentBalance
      );
      setAmount(defaultAmt);
    }
  }, [selectedClient]);

  const previousBalance = selectedClient ? selectedClient.currentBalance : 0;
  const remainingBalance = Math.max(0, Math.round((previousBalance - amount) * 100) / 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) {
      alert('Please select a client.');
      return;
    }
    if (amount <= 0) {
      alert('Payment amount must be greater than zero.');
      return;
    }

    const receiptNum = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payment: Payment = {
      id: `pay-${Date.now()}`,
      receiptNumber: receiptNum,
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      amount,
      paymentMethod,
      referenceNote: referenceNote.trim() || undefined,
      previousBalance,
      remainingBalance,
      cashierName: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    if (settings.soundEnabled) playRetailSound('success');
    onRecordPayment(payment, selectedClient);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Record Installment Payment
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Collect monthly credit installment & generate thermal slip
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Client Selection */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Select Client Account
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">-- Choose from 2,000+ Clients --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone}) - Bal: {curr}{c.currentBalance.toLocaleString()} {c.paperFolioNumber ? `[${c.paperFolioNumber}]` : ''} {c.previousPaperFolioNumber ? `[Prev: ${c.previousPaperFolioNumber}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedClient && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>{selectedClient.name}</span>
                  {selectedClient.paperFolioNumber && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold">
                      {selectedClient.paperFolioNumber}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {selectedClient.previousPaperFolioNumber && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium mr-1.5">
                      📖 Prev Physical Pg: {selectedClient.previousPaperFolioNumber} •
                    </span>
                  )}
                  Target: {curr}{selectedClient.monthlyInstallmentTarget.toLocaleString()}/mo
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">Current Balance</div>
                <div className="text-sm font-black text-amber-600 dark:text-amber-400">
                  {curr}{selectedClient.currentBalance.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Amount Received ({curr}) *
            </label>
            <input
              type="number"
              min={1}
              required
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full text-lg font-black px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            {/* Quick buttons */}
            {selectedClient && (
              <div className="flex space-x-2 mt-2">
                <button
                  type="button"
                  onClick={() => setAmount(selectedClient.monthlyInstallmentTarget)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex-1"
                >
                  Monthly Target ({curr}{selectedClient.monthlyInstallmentTarget.toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(selectedClient.currentBalance)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex-1"
                >
                  Full Balance ({curr}{selectedClient.currentBalance.toLocaleString()})
                </button>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Payment Method
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['cash', 'card', 'bank_transfer', 'mobile_wallet'] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`py-2 text-[11px] font-bold rounded-lg border capitalize transition ${
                    paymentMethod === m
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {m.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Reference Notes */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Reference / Note (Optional)
            </label>
            <input
              type="text"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              placeholder="e.g. Paid in cash at counter / Online deposit slip #..."
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          {/* Balance Preview */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-500">Remaining Balance:</span>
              <div className="text-base font-black text-slate-900 dark:text-white">
                {curr}{remainingBalance.toLocaleString()}
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              Cashier: <strong>{currentUser.name}</strong>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Confirm & Print Payment Receipt</span>
          </button>
        </form>
      </div>
    </div>
  );
};
