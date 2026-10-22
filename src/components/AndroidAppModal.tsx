import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Bluetooth,
  Printer,
  CheckCircle2,
  AlertCircle,
  Download,
  Share2,
  Send,
  MessageSquare,
  ShieldCheck,
  Zap,
  HelpCircle,
  Radio,
} from 'lucide-react';
import { bluetoothPrinter } from '../utils/bluetoothPrinter';
import { StoreSettings } from '../types';

interface AndroidAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
}

export const AndroidAppModal: React.FC<AndroidAppModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  const [btConnected, setBtConnected] = useState<boolean>(bluetoothPrinter.isConnected());
  const [btDeviceName, setBtDeviceName] = useState<string | null>(bluetoothPrinter.getConnectedDeviceName());
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isTestPrinting, setIsTestPrinting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    const unsub = bluetoothPrinter.subscribe((status) => {
      setBtConnected(status.connected);
      setBtDeviceName(status.deviceName);
    });

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      unsub();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (!isOpen) return null;

  const handleConnectBluetooth = async () => {
    try {
      setIsConnecting(true);
      setTestResult(null);
      const name = await bluetoothPrinter.connect();
      setTestResult(`✓ Successfully connected to ${name}`);
    } catch (err: any) {
      setTestResult(`Bluetooth Error: ${err.message || 'Cancelled'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectBluetooth = async () => {
    await bluetoothPrinter.disconnect();
    setTestResult('Bluetooth printer disconnected.');
  };

  const handlePrintTestSlip = async () => {
    try {
      setIsTestPrinting(true);
      setTestResult('Sending test slip to Bluetooth printer...');
      await bluetoothPrinter.printTestSlip(settings.storeName);
      setTestResult(`✓ Test slip printed on ${bluetoothPrinter.getConnectedDeviceName()}!`);
    } catch (err: any) {
      setTestResult(`Print failed: ${err.message || 'Device disconnected'}`);
    } finally {
      setIsTestPrinting(false);
    }
  };

  const handleDownloadApk = () => {
    // The APK is built via GitHub Actions CI and downloaded from the Actions artifacts.
    // Direct users to the GitHub Actions page to download the latest build.
    const githubActionsUrl = 'https://github.com/search?q=UsmanClothPOS&type=repositories';
    const msg =
      'Your APK is built automatically on GitHub Actions.\n\n' +
      'Steps to get it:\n' +
      '1. Push this project to GitHub (see BUILD-APK-INSTRUCTIONS.md)\n' +
      '2. Go to your repo → Actions tab\n' +
      '3. Click "Build Android APK" → latest run\n' +
      '4. Download the "UsmanClothPOS-APK" artifact\n' +
      '5. Extract the zip → install the .apk on your phone\n\n' +
      'The APK is a real compiled Android app (not a web shortcut).\n' +
      'Full instructions are in BUILD-APK-INSTRUCTIONS.md in your project folder.';
    alert(msg);
  };

  const handleTriggerPWAInstall = async () => {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setInstallPromptEvent(null);
    } else {
      alert(
        'To install on Android:\n1. Tap "Download Android APK" above, OR\n2. Open Google Chrome on your Android phone.\n3. Tap (⋮) Menu > "Install app" or "Add to Home screen".\n\nThe Usman Cloth Rehra app icon will appear on your phone screen!'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-transparent">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-950 shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Android App & Bluetooth Printer Companion
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                  Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Turn your store terminal into a portable Android POS with direct Bluetooth thermal printing.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[75vh] space-y-4 flex-1 text-xs pb-12 scrollbar-thin">
          {/* Section 1: Bluetooth Thermal Printer */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <Bluetooth className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    Bluetooth Thermal POS Printer (58mm / 80mm)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pairs with portable receipt printers (PT-210, MPT-II, XP-58, POS-5802, Rongta, Goojprt).
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
                <span>{btConnected ? `Connected: ${btDeviceName}` : 'Disconnected'}</span>
              </span>
            </div>

            {testResult && (
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-200">
                {testResult}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {!btConnected ? (
                <button
                  type="button"
                  onClick={handleConnectBluetooth}
                  disabled={isConnecting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-2 shadow-md transition disabled:opacity-50"
                >
                  <Bluetooth className="w-4 h-4" />
                  <span>{isConnecting ? 'Searching Devices...' : 'Pair Bluetooth Printer'}</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handlePrintTestSlip}
                    disabled={isTestPrinting}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-2 shadow-md transition disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{isTestPrinting ? 'Printing...' : 'Print Test Receipt'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDisconnectBluetooth}
                    className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-300 transition"
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Section 2: Android APK Download & Direct Installation */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-slate-50 to-transparent dark:from-emerald-950/30 dark:via-slate-800/60 dark:to-transparent border border-emerald-500/30 dark:border-emerald-700/50 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-500 text-slate-950 font-bold">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>Android APK — Built via GitHub Actions</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                      v2.0.0 CI Ready
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Package: <code className="font-mono text-emerald-600 dark:text-emerald-400">com.usmanclothrehra.pos</code> • Real Capacitor WebView APK
                  </p>
                </div>
              </div>

              {isInstalled && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                  ✓ Installed
                </span>
              )}
            </div>

            {/* Action Buttons: Download APK & Add to Home Screen */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleDownloadApk}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/25 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Get APK from GitHub Actions</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerPWAInstall}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center justify-center space-x-2 shadow transition cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>Install App (1-Tap WebAPK)</span>
              </button>
            </div>

            {/* Step-by-Step Installation Guide */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>How to Get &amp; Install the APK on Your Android Phone:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">1. Push to GitHub:</span>
                  <div className="mt-0.5">Push this project to a GitHub repo. The APK builds automatically for free. See <code className="font-mono">BUILD-APK-INSTRUCTIONS.md</code>.</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">2. Download Artifact:</span>
                  <div className="mt-0.5">Go to your repo → Actions tab → "Build Android APK" → latest run → download "UsmanClothPOS-APK" artifact.</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">3. Install on Phone:</span>
                  <div className="mt-0.5">Extract the zip, transfer .apk to your phone, enable "Install unknown apps", tap to install. Then launch POS!</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: SMS & WhatsApp Reminders with Anti-Ban Delay Timers */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Anti-Ban Timing Slabs & Operator Security Features
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Built-in protection when sending monthly reminders and managing multi-operator shifts.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span><strong>Anti-Ban Slabs (30s - 180s):</strong> Spaced timing intervals up to 3 minutes (30s, 60s, 90s, 120s, 150s, 180s) prevent cellular carrier SMS throttle blocks and WhatsApp spam bans.</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span><strong>Startup Operator & Master Login:</strong> Touch keypad PIN screen for counter operators, with Master Admin override (Default PIN: 1234).</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span><strong>Bluetooth ESC/POS Thermal Printing:</strong> Direct pairing with 58mm & 80mm mobile Bluetooth printers.</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span><strong>1-Click WhatsApp & SMS Reminders:</strong> Opens WhatsApp or native Android SMS with pre-filled monthly installment balance and paper folio.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
