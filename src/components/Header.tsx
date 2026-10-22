import React, { useState, useEffect } from 'react';
import {
  Store,
  Wifi,
  WifiOff,
  RefreshCw,
  UserCheck,
  Printer,
  Settings as SettingsIcon,
  BookOpen,
  FileText,
  Users,
  LayoutDashboard,
  BellRing,
  Package,
  FileSpreadsheet,
  Lock,
  Bluetooth,
  Smartphone,
} from 'lucide-react';
import { StoreSettings, UserAccount, SyncQueueItem } from '../types';
import { bluetoothPrinter } from '../utils/bluetoothPrinter';
import { AndroidAppModal } from './AndroidAppModal';

interface HeaderProps {
  settings: StoreSettings;
  currentUser: UserAccount;
  allUsers: UserAccount[];
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isOnline: boolean;
  onToggleOnline: () => void;
  syncQueue: SyncQueueItem[];
  onTriggerSync: () => void;
  isSyncing: boolean;
  onSwitchUser: (user: UserAccount) => void;
  onOpenSettings: () => void;
  onOpenPaperMigration: () => void;
  clientCount: number;
  overdueCount: number;
  onLockTerminal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  currentUser,
  allUsers,
  activeTab,
  onSelectTab,
  isOnline,
  onToggleOnline,
  syncQueue,
  onTriggerSync,
  isSyncing,
  onSwitchUser,
  onOpenSettings,
  onOpenPaperMigration,
  clientCount,
  overdueCount,
  onLockTerminal,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [pinPromptUser, setPinPromptUser] = useState<UserAccount | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);
  const [btConnected, setBtConnected] = useState<boolean>(bluetoothPrinter.isConnected());
  const [btName, setBtName] = useState<string | null>(bluetoothPrinter.getConnectedDeviceName());

  useEffect(() => {
    return bluetoothPrinter.subscribe((status) => {
      setBtConnected(status.connected);
      setBtName(status.deviceName);
    });
  }, []);

  const handleSelectUser = (user: UserAccount) => {
    if (user.id === currentUser.id) {
      setShowUserMenu(false);
      return;
    }
    setPinPromptUser(user);
    setEnteredPin('');
    setPinError(false);
    setShowUserMenu(false);
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinPromptUser) return;
    if (enteredPin === pinPromptUser.pin) {
      onSwitchUser(pinPromptUser);
      setPinPromptUser(null);
      setEnteredPin('');
    } else {
      setPinError(true);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'New Invoice (POS)', icon: FileText, highlight: true },
    { id: 'clients', label: `Clients & Credit (${clientCount})`, icon: Users },
    { id: 'reminders', label: 'Reminders', icon: BellRing, badge: overdueCount > 0 ? overdueCount : undefined },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
  ];

  return (
    <>
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        {/* Top bar with store info & status */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Store Branding */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0 pr-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base sm:text-lg tracking-tight text-white truncate max-w-[150px] sm:max-w-none">{settings.storeName}</span>
                  <span className="hidden sm:inline-flex text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                    Clothing Credit Suite
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  {settings.tagline} • {clientCount} Client Installment Ledger
                </p>
              </div>
            </div>

            {/* Quick Actions & Status */}
            <div className="flex items-center space-x-3">
              {/* Paper Ledger Migration Button */}
              <button
                type="button"
                onClick={onOpenPaperMigration}
                className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition"
                title="Migrate old paper ledger book accounts"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Paper Ledger Import</span>
              </button>

              {/* Bluetooth Thermal Printer Indicator */}
              <button
                type="button"
                onClick={() => setIsAndroidModalOpen(true)}
                className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition border ${
                  btConnected
                    ? 'bg-blue-950/60 text-blue-400 border-blue-700/50'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="Bluetooth Thermal Printer Connection"
              >
                <Bluetooth className={`w-3.5 h-3.5 ${btConnected ? 'text-blue-400 animate-pulse' : 'text-slate-400'}`} />
                <span className="hidden md:inline">{btConnected ? (btName || 'BT Printer') : 'BT Thermal'}</span>
              </button>

              {/* Android App Companion */}
              <button
                type="button"
                onClick={() => setIsAndroidModalOpen(true)}
                className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-700/50 text-xs font-medium hover:bg-emerald-900/40 transition"
                title="Install Android App & Mobile POS Setup"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android App</span>
              </button>

              {/* Offline / Online Network Indicator */}
              <button
                type="button"
                onClick={onToggleOnline}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition border ${
                  isOnline
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/50'
                    : 'bg-rose-950/60 text-rose-400 border-rose-700/50'
                }`}
                title={`Click to simulate ${isOnline ? 'offline' : 'online'} mode`}
              >
                {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 animate-pulse" />}
                <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline Mode'}</span>
              </button>

              {/* Sync Status Button */}
              <button
                type="button"
                onClick={onTriggerSync}
                disabled={isSyncing || !isOnline}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition border ${
                  syncQueue.length > 0
                    ? 'bg-amber-950/70 text-amber-300 border-amber-600/50'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="Cloud synchronization status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
                <span className="hidden sm:inline">
                  {isSyncing
                    ? 'Syncing...'
                    : syncQueue.length > 0
                    ? `${syncQueue.length} Pending Sync`
                    : 'Cloud Synced'}
                </span>
              </button>

              {/* Active Role Switcher */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium transition"
                  aria-expanded={showUserMenu}
                >
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                  <div className="text-left hidden sm:block">
                    <span className="text-white block font-semibold leading-tight">{currentUser.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">{currentUser.role}</span>
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 z-50">
                    <div className="px-3 py-2 border-b border-slate-700 text-xs text-slate-400 flex items-center justify-between">
                      <span>Switch Operator:</span>
                      <span className="text-[10px] text-amber-400 font-bold">{currentUser.role.toUpperCase()}</span>
                    </div>

                    <div className="max-h-48 overflow-y-auto">
                      {allUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSelectUser(user)}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700 transition ${
                            user.id === currentUser.id ? 'bg-slate-700/60 font-semibold text-amber-400' : 'text-slate-200'
                          }`}
                        >
                          <div>
                            <div className="font-semibold">{user.name}</div>
                            <div className="text-[10px] text-slate-400">{user.shift || user.role}</div>
                          </div>
                          {user.id !== currentUser.id && <Lock className="w-3 h-3 text-slate-400" />}
                        </button>
                      ))}
                    </div>

                    {onLockTerminal && (
                      <div className="p-1 border-t border-slate-700 bg-slate-900/50">
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            onLockTerminal();
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 flex items-center space-x-2 transition"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Lock POS Terminal</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Direct 1-Tap Lock Terminal Button */}
              {onLockTerminal && (
                <button
                  type="button"
                  onClick={onLockTerminal}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/40 border border-slate-700 text-slate-400 hover:text-rose-300 transition"
                  title="Lock Terminal Screen (Require PIN to unlock)"
                >
                  <Lock className="w-4 h-4" />
                </button>
              )}

              {/* Store & Thermal Settings */}
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition"
                title="Store Settings & Thermal Printer Configuration"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Bar */}
          <nav className="flex space-x-1 pb-2 overflow-x-auto scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                      : item.highlight
                      ? 'bg-slate-800/80 text-amber-400 hover:bg-slate-800'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* PIN Verification Modal */}
      {pinPromptUser && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-white shadow-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Enter PIN for {pinPromptUser.name}</h3>
                <p className="text-xs text-slate-400">Role: {pinPromptUser.role.toUpperCase()}</p>
              </div>
            </div>

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Terminal Access PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  value={enteredPin}
                  onChange={(e) => {
                    setEnteredPin(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="Enter 4-digit PIN"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {pinError && (
                  <p className="text-xs text-rose-400 mt-1">
                    Incorrect PIN. Default demo PINs: Usman (1234), Cashier (0000), Farhan (8888).
                  </p>
                )}
                <p className="text-[11px] text-slate-500 mt-2">
                  Hint: Usman: 1234 | Counter: 0000 | Farhan: 8888
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPinPromptUser(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition"
                >
                  Authenticate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Android POS & Bluetooth Printer Setup Modal */}
      <AndroidAppModal
        isOpen={isAndroidModalOpen}
        onClose={() => setIsAndroidModalOpen(false)}
        settings={settings}
      />
    </>
  );
};
