import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  UserCheck,
  Crown,
  User,
  Store,
  Wifi,
  WifiOff,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  Delete,
  CheckCircle2,
} from 'lucide-react';
import { UserAccount, StoreSettings } from '../types';
import { playRetailSound } from '../utils/storage';

interface StartupLoginModalProps {
  isOpen: boolean;
  users: UserAccount[];
  settings: StoreSettings;
  onLoginSuccess: (user: UserAccount) => void;
  isOnline: boolean;
}

export const StartupLoginModal: React.FC<StartupLoginModalProps> = ({
  isOpen,
  users,
  settings,
  onLoginSuccess,
  isOnline,
}) => {
  if (!isOpen) return null;

  // Selected operator
  const [selectedUser, setSelectedUser] = useState<UserAccount>(() => {
    // Prefer admin or first user
    return users.find((u) => u.role === 'admin') || users[0];
  });

  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isMasterOverride, setIsMasterOverride] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
          ' • ' +
          now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmitPin();
      } else if (e.key === 'Escape') {
        setEnteredPin('');
        setPinError(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, enteredPin, selectedUser, isMasterOverride]);

  const handleDigitPress = (digit: string) => {
    if (enteredPin.length >= 6) return;
    const newPin = enteredPin + digit;
    setEnteredPin(newPin);
    setPinError(null);
    if (settings.soundEnabled) playRetailSound('beep');

    // Auto-submit on 4th digit if standard 4-digit PIN
    if (newPin.length === 4) {
      validatePin(newPin);
    }
  };

  const handleBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  const handleClear = () => {
    setEnteredPin('');
    setPinError(null);
  };

  const validatePin = (pinToTest: string) => {
    const masterPin = settings.masterAdminPin || '1234';

    if (isMasterOverride) {
      if (pinToTest === masterPin) {
        // Unlock as Master Admin
        const adminUser = users.find((u) => u.role === 'admin') || {
          id: 'master-admin',
          name: settings.masterAdminName || 'Usman (Owner)',
          role: 'admin',
          pin: masterPin,
          shift: 'Master Admin / Owner',
        };
        if (settings.soundEnabled) playRetailSound('success');
        onLoginSuccess(adminUser);
        return;
      } else {
        setPinError('Invalid Master Admin PIN. Default is 1234.');
        if (settings.soundEnabled) playRetailSound('beep');
        setEnteredPin('');
        return;
      }
    }

    // Normal operator check (or Master PIN override for any account)
    if (pinToTest === selectedUser.pin || pinToTest === masterPin) {
      if (settings.soundEnabled) playRetailSound('success');
      onLoginSuccess(selectedUser);
    } else {
      setPinError(`Incorrect PIN for ${selectedUser.name}. Try again or use Master Admin PIN.`);
      if (settings.soundEnabled) playRetailSound('beep');
      setEnteredPin('');
    }
  };

  const handleSubmitPin = () => {
    if (enteredPin.length === 0) {
      setPinError('Please enter your 4-digit PIN');
      return;
    }
    validatePin(enteredPin);
  };

  const handleSelectUser = (user: UserAccount) => {
    setSelectedUser(user);
    setIsMasterOverride(false);
    setEnteredPin('');
    setPinError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/95 backdrop-blur-md select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col text-white animate-fadeIn">
        {/* Top Header & Branding */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center space-x-2">
                  <span>{settings.storeName}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase tracking-wider">
                    POS Security
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Clothing Retail Credit Ledger & Touch Counter Terminal
                </p>
              </div>
            </div>

            {/* Time & Connectivity */}
            <div className="text-right hidden sm:block">
              <div className="text-xs font-mono text-slate-300 font-bold">{currentTime}</div>
              <div className="flex items-center justify-end space-x-1.5 text-[11px] text-slate-400 mt-0.5">
                {isOnline ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Online Sync</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-400 font-medium">Offline POS Ready</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Body: Operator Selector + Keypad */}
        <div className="p-5 sm:p-6 space-y-5 flex-1">
          {/* Operator Selection Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <UserCheck className="w-4 h-4 text-amber-400" />
                <span>Select Operator or Admin</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setIsMasterOverride(!isMasterOverride);
                  setEnteredPin('');
                  setPinError(null);
                }}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition flex items-center space-x-1 ${
                  isMasterOverride
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>{isMasterOverride ? '✓ Master Admin Mode' : 'Master Override'}</span>
              </button>
            </div>

            {/* Operator Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {users.map((u) => {
                const isSelected = !isMasterOverride && selectedUser.id === u.id;
                const isAdmin = u.role === 'admin';

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className={`p-3 rounded-2xl text-left border transition relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/40'
                        : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                        style={{ backgroundColor: u.avatarColor || (isAdmin ? '#f59e0b' : '#3b82f6') }}
                      >
                        {isAdmin ? <Crown className="w-4 h-4 text-white" /> : <User className="w-4 h-4" />}
                      </div>

                      <span
                        className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                          isAdmin
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white truncate">{u.name}</div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {u.shift || (isAdmin ? 'Store Owner' : 'Counter Cashier')}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Log-In Banner */}
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center space-x-2">
                  <span>
                    Logging in as:{' '}
                    <strong className="text-amber-400">
                      {isMasterOverride ? 'Master Admin (Store Owner)' : selectedUser.name}
                    </strong>
                  </span>
                  {isMasterOverride && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-rose-500/20 text-rose-300 font-bold rounded">
                      SUPERVISOR
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  {isMasterOverride
                    ? 'Enter 4-digit Master Admin PIN to unlock full administrative access.'
                    : `Enter 4-digit PIN for ${selectedUser.name} or use touch keypad below.`}
                </p>
              </div>
            </div>

            {/* Default PIN reminder for convenience */}
            <button
              type="button"
              onClick={() => {
                const targetPin = isMasterOverride ? settings.masterAdminPin || '1234' : selectedUser.pin;
                setEnteredPin(targetPin);
                validatePin(targetPin);
              }}
              className="text-[11px] text-amber-400 hover:text-amber-300 underline font-mono shrink-0 pl-2"
              title="Click to auto-fill PIN for quick test"
            >
              Auto-Fill PIN
            </button>
          </div>

          {/* Masked PIN Display */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="flex items-center justify-center space-x-3 py-2">
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = enteredPin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 transition-all ${
                      isFilled
                        ? 'bg-amber-400 border-amber-400 scale-110 shadow-lg shadow-amber-400/50'
                        : 'border-slate-600 bg-slate-800'
                    }`}
                  />
                );
              })}
            </div>

            {pinError && (
              <div className="flex items-center space-x-1.5 text-xs text-rose-400 font-medium animate-pulse">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}
          </div>

          {/* Touch-Friendly Numeric Keypad (Optimized for Android Touch & POS) */}
          <div className="max-w-xs mx-auto grid grid-cols-3 gap-2.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigitPress(digit)}
                className="h-13 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-lg font-black text-white shadow transition flex items-center justify-center cursor-pointer"
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClear}
              className="h-13 rounded-2xl bg-slate-800/60 hover:bg-slate-700 text-xs font-bold text-slate-400 border border-slate-700 transition flex items-center justify-center"
            >
              CLEAR
            </button>

            <button
              type="button"
              onClick={() => handleDigitPress('0')}
              className="h-13 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-lg font-black text-white shadow transition flex items-center justify-center cursor-pointer"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleBackspace}
              className="h-13 rounded-2xl bg-slate-800/60 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center justify-center"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Submit Action Bar */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSubmitPin}
              disabled={enteredPin.length === 0}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/25 transition disabled:opacity-50 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Store Terminal</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-[11px] text-slate-500">
          <span>Master Admin Default PIN: <strong className="font-mono text-slate-400">1234</strong></span>
          <span>Press Enter ↵ to Unlock</span>
        </div>
      </div>
    </div>
  );
};
