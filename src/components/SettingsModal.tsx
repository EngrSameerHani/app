import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Printer,
  Shield,
  Download,
  Upload,
  RefreshCw,
  X,
  Check,
  Volume2,
  VolumeX,
  CreditCard,
  Building,
  KeyRound,
  Smartphone,
  MessageSquare,
  Bluetooth,
  Radio,
  ShieldCheck,
  Clock,
  Crown,
  Plus,
  Trash2,
  UserPlus,
  Lock,
} from 'lucide-react';
import { StoreSettings, UserAccount } from '../types';
import { downloadFile } from '../utils/exportUtils';
import { exportBackupJSON, restoreBackupJSON, AppDatabase } from '../utils/storage';
import { bluetoothPrinter } from '../utils/bluetoothPrinter';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  onUpdateSettings: (newSettings: StoreSettings) => void;
  allUsers: UserAccount[];
  onUpdateUsers: (users: UserAccount[]) => void;
  db: AppDatabase;
  onRestoreDatabase: (restored: AppDatabase) => void;
  onResetSeedData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  allUsers,
  onUpdateUsers,
  db,
  onRestoreDatabase,
  onResetSeedData,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'store' | 'printer' | 'backup' | 'users' | 'reminders'>('printer');
  const [formData, setFormData] = useState<StoreSettings>({ ...settings });
  const [usersData, setUsersData] = useState<UserAccount[]>([...allUsers]);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [btConnected, setBtConnected] = useState<boolean>(bluetoothPrinter.isConnected());
  const [btDeviceName, setBtDeviceName] = useState<string | null>(bluetoothPrinter.getConnectedDeviceName());
  const [btStatusMsg, setBtStatusMsg] = useState<string | null>(null);
  const [isBtBusy, setIsBtBusy] = useState<boolean>(false);

  // Operator Management State
  const [newOpName, setNewOpName] = useState('');
  const [newOpRole, setNewOpRole] = useState<'operator' | 'cashier' | 'accountant'>('operator');
  const [newOpShift, setNewOpShift] = useState('Counter Shift (9am - 6pm)');
  const [newOpPin, setNewOpPin] = useState('');
  const [showAddOpForm, setShowAddOpForm] = useState(false);

  const handleAddOperator = () => {
    if (!newOpName.trim()) {
      alert('Please enter operator name');
      return;
    }
    if (!newOpPin || newOpPin.length < 4) {
      alert('Please enter a 4-digit PIN');
      return;
    }

    const newOp: UserAccount = {
      id: `usr-op-${Date.now()}`,
      name: newOpName.trim(),
      role: newOpRole,
      pin: newOpPin,
      shift: newOpShift.trim() || 'Counter Shift',
      avatarColor: ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'][usersData.length % 5],
      createdAt: new Date().toISOString(),
    };

    setUsersData((prev) => [...prev, newOp]);
    setNewOpName('');
    setNewOpPin('');
    setShowAddOpForm(false);
  };

  const handleDeleteOperator = (id: string) => {
    const target = usersData.find((u) => u.id === id);
    if (!target) return;
    if (target.role === 'admin') {
      alert('Cannot delete the Master Admin account.');
      return;
    }
    if (confirm(`Are you sure you want to delete operator "${target.name}"?`)) {
      setUsersData((prev) => prev.filter((u) => u.id !== id));
    }
  };

  React.useEffect(() => {
    return bluetoothPrinter.subscribe((status) => {
      setBtConnected(status.connected);
      setBtDeviceName(status.deviceName);
    });
  }, []);

  const handleConnectBt = async () => {
    try {
      setIsBtBusy(true);
      setBtStatusMsg('Searching for Bluetooth thermal printers...');
      const name = await bluetoothPrinter.connect();
      setBtStatusMsg(`✓ Connected to ${name}`);
    } catch (err: any) {
      setBtStatusMsg(`Bluetooth: ${err.message || 'Cancelled'}`);
    } finally {
      setIsBtBusy(false);
    }
  };

  const handleTestPrintBt = async () => {
    try {
      setIsBtBusy(true);
      setBtStatusMsg('Sending test slip to Bluetooth printer...');
      await bluetoothPrinter.printTestSlip(formData.storeName);
      setBtStatusMsg(`✓ Test receipt printed on ${bluetoothPrinter.getConnectedDeviceName()}!`);
    } catch (err: any) {
      setBtStatusMsg(`Print error: ${err.message || 'Failed'}`);
    } finally {
      setIsBtBusy(false);
    }
  };

  const handleDisconnectBt = async () => {
    await bluetoothPrinter.disconnect();
    setBtStatusMsg('Bluetooth printer disconnected.');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
    onUpdateUsers(usersData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleDownloadBackup = () => {
    const json = exportBackupJSON(db);
    downloadFile(
      json,
      `usman_cloth_rehra_backup_${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    );
    setBackupMsg('Full backup file downloaded securely.');
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const restored = restoreBackupJSON(text);
        onRestoreDatabase(restored);
        setBackupMsg(`Successfully restored ${restored.clients.length} clients and transactions!`);
      } catch (err: any) {
        setBackupMsg(`Restore failed: ${err.message || 'Invalid backup file'}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Store Settings & Hardware Configuration
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thermal printer specifications, automated reminder templates & cloud backup
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

        {/* Tab Navigation */}
        <div className="flex space-x-1 border-b border-slate-200 dark:border-slate-800 text-xs font-bold overflow-x-auto">
          {[
            { id: 'printer', label: 'Thermal Printer (58/80mm)', icon: Printer },
            { id: 'store', label: 'Store Profile', icon: Building },
            { id: 'reminders', label: 'SMS & WhatsApp (1-Click)', icon: MessageSquare },
            { id: 'users', label: 'Operators & Master Security', icon: KeyRound },
            { id: 'backup', label: 'Cloud Backup & Data', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-3 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Printer Tab */}
          {activeTab === 'printer' && (
            <div className="space-y-4">
              {/* Bluetooth Thermal Printer Pairing Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 via-slate-50 to-transparent dark:from-blue-900/20 dark:via-slate-800/40 dark:to-transparent border border-blue-500/20 dark:border-blue-700/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-blue-500/20 text-blue-500">
                      <Bluetooth className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">
                        Bluetooth Thermal Printer (Android & Mobile POS)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Connect mobile ESC/POS Bluetooth printers (PT-210, MPT-II, POS-5802, XP-58, Rongta).
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center space-x-1 ${
                      btConnected
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Radio className={`w-3 h-3 ${btConnected ? 'animate-pulse text-emerald-500' : ''}`} />
                    <span>{btConnected ? `Paired: ${btDeviceName}` : 'No Printer Paired'}</span>
                  </span>
                </div>

                {btStatusMsg && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-200">
                    {btStatusMsg}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {!btConnected ? (
                    <button
                      type="button"
                      onClick={handleConnectBt}
                      disabled={isBtBusy}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-blue-500/20 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Bluetooth className="w-3.5 h-3.5" />
                      <span>{isBtBusy ? 'Pairing...' : 'Pair Bluetooth Printer'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleTestPrintBt}
                        disabled={isBtBusy}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 transition disabled:opacity-50 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{isBtBusy ? 'Printing...' : 'Print Test Receipt'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDisconnectBt}
                        className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <label className="block font-bold text-slate-900 dark:text-white">
                  Default Thermal Paper Width
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setFormData({ ...formData, printerWidth: '58mm' })}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      formData.printerWidth === '58mm'
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-slate-900 dark:text-white">58mm (2-Inch / 32 Cols)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Standard compact POS roll (XP-58, Rongta, Bluetooth mobile printers)
                    </div>
                  </div>

                  <div
                    onClick={() => setFormData({ ...formData, printerWidth: '80mm' })}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      formData.printerWidth === '80mm'
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-slate-900 dark:text-white">80mm (3-Inch / 48 Cols)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Standard full-size POS roll (Epson TM-T88, Star Micronics, Citizen)
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Receipt Policy & Footer Note
                </label>
                <textarea
                  rows={2}
                  value={formData.receiptFooterText}
                  onChange={(e) => setFormData({ ...formData, receiptFooterText: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    Sound Feedback on Counter Actions
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Audio chimes for barcode scans, receipt printing, and payment completion
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, soundEnabled: !formData.soundEnabled })}
                  className={`p-2 rounded-xl transition ${
                    formData.soundEnabled ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  {formData.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Store Tab */}
          {activeTab === 'store' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Store Name
                  </label>
                  <input
                    type="text"
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tagline / Subheading
                  </label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Store Phone
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tax / NTN Registration #
                  </label>
                  <input
                    type="text"
                    value={formData.taxNumber}
                    onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Store Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Currency Symbol
                  </label>
                  <select
                    value={formData.currencySymbol}
                    onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="Rs.">Rs. (Pakistani Rupee / INR)</option>
                    <option value="$">$ (US Dollar)</option>
                    <option value="₹">₹ (Indian Rupee)</option>
                    <option value="£">£ (British Pound)</option>
                    <option value="€">€ (Euro)</option>
                    <option value="AED">AED (UAE Dirham)</option>
                    <option value="SAR">SAR (Saudi Riyal)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SMS & WhatsApp Reminders Tab */}
          {activeTab === 'reminders' && (
            <div className="space-y-5">
              {/* WhatsApp Section */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <MessageSquare className="w-4 h-4" />
                  <span>1-Click WhatsApp Template Configuration</span>
                </div>

                <p className="text-[11px] text-slate-500">
                  Dynamic tags automatically populated for each client:{' '}
                  <code className="text-amber-600 dark:text-amber-400 font-mono">&#123;&#123;client_name&#125;&#125;</code>,{' '}
                  <code className="text-amber-600 dark:text-amber-400 font-mono">&#123;&#123;store_name&#125;&#125;</code>,{' '}
                  <code className="text-amber-600 dark:text-amber-400 font-mono">&#123;&#123;currency&#125;&#125;</code>,{' '}
                  <code className="text-amber-600 dark:text-amber-400 font-mono">&#123;&#123;monthly_amount&#125;&#125;</code>,{' '}
                  <code className="text-amber-600 dark:text-amber-400 font-mono">&#123;&#123;due_date&#125;&#125;</code>,{' '}
                  <code className="text-amber-600 dark:text-amber-400 font-mono">&#123;&#123;total_balance&#125;&#125;</code>,{' '}
                  <code className="text-amber-600 dark:text-amber-400 font-mono">&#123;&#123;paper_folio&#125;&#125;</code>,{' '}
                  <code className="text-amber-600 dark:text-amber-400 font-mono">&#123;&#123;prev_paper_folio&#125;&#125;</code>
                </p>

                <textarea
                  rows={3}
                  value={formData.whatsappTemplate}
                  onChange={(e) => setFormData({ ...formData, whatsappTemplate: e.target.value })}
                  placeholder="WhatsApp message template..."
                  className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-sans leading-relaxed text-xs"
                />
              </div>

              {/* SMS Gateway Section */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-4">
                <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
                  <Smartphone className="w-4 h-4" />
                  <span>1-Click SMS Gateway Integration</span>
                </div>

                {/* Provider Selector */}
                <div>
                  <label className="block font-bold text-slate-900 dark:text-white mb-1.5">
                    SMS Dispatch Method
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div
                      onClick={() => setFormData({ ...formData, smsGatewayProvider: 'device_sms' })}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        formData.smsGatewayProvider === 'device_sms'
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-bold text-slate-900 dark:text-white">Direct Native SMS</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        1-Click free native SMS via phone, tablet, or PC messaging app. Zero API costs.
                      </div>
                    </div>

                    <div
                      onClick={() => setFormData({ ...formData, smsGatewayProvider: 'custom_api' })}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        formData.smsGatewayProvider === 'custom_api'
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-bold text-slate-900 dark:text-white">Custom SMS HTTP API</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        BrandSMS, Lifetimesms, Zong/Jazz Business, or local GSM modem webhook.
                      </div>
                    </div>

                    <div
                      onClick={() => setFormData({ ...formData, smsGatewayProvider: 'twilio' })}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        formData.smsGatewayProvider === 'twilio'
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-bold text-slate-900 dark:text-white">Twilio SMS</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        International Cloud Gateway with Account SID & Auth Token.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      SMS Sender ID / Masking Title
                    </label>
                    <input
                      type="text"
                      value={formData.smsSenderId || 'USMAN-CLOTH'}
                      onChange={(e) => setFormData({ ...formData, smsSenderId: e.target.value })}
                      placeholder="e.g. USMAN-CLOTH"
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-xs"
                    />
                  </div>

                  {formData.smsGatewayProvider !== 'device_sms' && (
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                        API Key / Auth Token
                      </label>
                      <input
                        type="password"
                        value={formData.smsApiKey || ''}
                        onChange={(e) => setFormData({ ...formData, smsApiKey: e.target.value })}
                        placeholder="Gateway API Secret Key..."
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs"
                      />
                    </div>
                  )}
                </div>

                {formData.smsGatewayProvider === 'custom_api' && (
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      SMS Gateway Endpoint URL (HTTP POST / GET)
                    </label>
                    <input
                      type="text"
                      value={formData.smsApiUrl || ''}
                      onChange={(e) => setFormData({ ...formData, smsApiUrl: e.target.value })}
                      placeholder="e.g. https://api.lifetimesms.com/json/sms/send"
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs"
                    />
                  </div>
                )}

                {/* SMS Template */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-900 dark:text-white">
                      1-Click SMS Message Template
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {(formData.smsTemplate || '').length} chars (~{Math.ceil(((formData.smsTemplate || '').length || 1) / 160)} SMS)
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={formData.smsTemplate || ''}
                    onChange={(e) => setFormData({ ...formData, smsTemplate: e.target.value })}
                    placeholder="Concise SMS reminder text..."
                    className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-sans leading-relaxed text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Tip: Keep under 160 characters to send as 1 single SMS part.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Operators & Master Security Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* 1. Master Admin Setup Card */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
                      <Crown className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                        <span>Master Admin Security (Store Owner)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black">
                          MASTER
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Admin has unrestricted permission to manage operators, configure printer, view all khata ledgers, and override any PIN.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Master Admin Name
                    </label>
                    <input
                      type="text"
                      value={formData.masterAdminName || 'Usman (Owner)'}
                      onChange={(e) => setFormData({ ...formData, masterAdminName: e.target.value })}
                      placeholder="e.g. Usman (Owner)"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Master Admin 4-Digit PIN
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={formData.masterAdminPin || '1234'}
                      onChange={(e) => setFormData({ ...formData, masterAdminPin: e.target.value })}
                      placeholder="Master PIN (Default 1234)"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-amber-600 dark:text-amber-400 font-mono font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Startup Login & Security Flags */}
                <div className="space-y-2 pt-2 border-t border-amber-500/20">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.requireStartupLogin !== false}
                      onChange={(e) => setFormData({ ...formData, requireStartupLogin: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300 dark:border-slate-700"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Require Operator / Admin PIN on Android App Startup & Launch
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                    When enabled, the app opens with a secure keypad login gate so unauthorized store visitors cannot view client credit accounts or cash records.
                  </p>
                </div>

                {/* Anti-Ban Default Delay Slab */}
                <div className="pt-2 border-t border-amber-500/20">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-rose-500" />
                    <span>Default Anti-Ban Delay Slab for Reminders</span>
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {[30, 60, 90, 120, 150, 180].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setFormData({ ...formData, antiBanDefaultDelay: sec })}
                        className={`py-1.5 px-1 text-center rounded-lg text-xs font-bold transition border ${
                          (formData.antiBanDefaultDelay || 60) === sec
                            ? 'bg-amber-500 text-slate-950 border-amber-600'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {sec}s ({sec / 60}m)
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Store Operators Roster */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      Store Operator Accounts ({usersData.length})
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Counter staff, cashiers, and khata ledger operators.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddOpForm(!showAddOpForm)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add New Operator</span>
                  </button>
                </div>

                {/* Add Operator Form */}
                {showAddOpForm && (
                  <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-3 animate-fadeIn">
                    <div className="font-bold text-xs text-blue-900 dark:text-blue-300">
                      Register New Counter Operator
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                          Operator Name
                        </label>
                        <input
                          type="text"
                          value={newOpName}
                          onChange={(e) => setNewOpName(e.target.value)}
                          placeholder="e.g. Tariq (Evening Cashier)"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                          Terminal Role
                        </label>
                        <select
                          value={newOpRole}
                          onChange={(e) => setNewOpRole(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="operator">Operator (Billing & Sales)</option>
                          <option value="cashier">Cashier (Counter Cash)</option>
                          <option value="accountant">Accountant (Ledger Audit)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                          Shift Description
                        </label>
                        <input
                          type="text"
                          value={newOpShift}
                          onChange={(e) => setNewOpShift(e.target.value)}
                          placeholder="e.g. Counter Shift (3pm - 10pm)"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center space-x-2">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Set 4-Digit Access PIN:
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={newOpPin}
                          onChange={(e) => setNewOpPin(e.target.value)}
                          placeholder="e.g. 5555"
                          className="w-24 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-center"
                        />
                      </div>

                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setShowAddOpForm(false)}
                          className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAddOperator}
                          className="px-4 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow"
                        >
                          Save Operator
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Operator Cards List */}
                <div className="space-y-2">
                  {usersData.map((u, idx) => {
                    const isAdmin = u.role === 'admin';
                    return (
                      <div
                        key={u.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white"
                            style={{ backgroundColor: u.avatarColor || (isAdmin ? '#f59e0b' : '#3b82f6') }}
                          >
                            {isAdmin ? <Crown className="w-4 h-4 text-white" /> : <Lock className="w-3.5 h-3.5" />}
                          </div>

                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                              <span>{u.name}</span>
                              <span
                                className={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded ${
                                  isAdmin
                                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                    : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                                }`}
                              >
                                {u.role}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {u.shift || (isAdmin ? 'Master Store Administrator' : 'Counter Staff')}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1.5">
                            <label className="text-[11px] font-mono text-slate-400">PIN:</label>
                            <input
                              type="text"
                              maxLength={6}
                              value={u.pin}
                              onChange={(e) => {
                                const copy = [...usersData];
                                copy[idx].pin = e.target.value;
                                setUsersData(copy);
                              }}
                              className="w-20 px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-center text-xs font-bold"
                            />
                          </div>

                          {!isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteOperator(u.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                              title="Delete operator"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Backup Tab */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Export Secure Database Snapshot (.json)
                </h4>
                <p className="text-slate-500 text-[11px]">
                  Includes all {db.clients.length} clients, paper folio records, invoices, payments, and product data.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Backup File</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Restore from Backup File
                </h4>
                <p className="text-slate-500 text-[11px]">
                  Restore a previously downloaded JSON backup file to overwrite current storage.
                </p>
                <label className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Backup File (.json)</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreFile}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2">
                <h4 className="font-bold text-rose-800 dark:text-rose-400">
                  Reset & Re-seed 500+ Client Database
                </h4>
                <p className="text-rose-700 dark:text-rose-300 text-[11px]">
                  Re-generates fresh sample database with 512 clothing shop clients and 3 paper books.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to re-seed the 500+ client database? Current changes will be replaced.')) {
                      onResetSeedData();
                      setBackupMsg('Database re-seeded with 512 clients!');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset & Seed 500+ Clients</span>
                </button>
              </div>

              {backupMsg && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  {backupMsg}
                </p>
              )}
            </div>
          )}

          {/* Bottom Save Bar */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            {saveSuccess ? (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>Settings saved successfully!</span>
              </span>
            ) : (
              <span />
            )}

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
              >
                Save Settings
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
