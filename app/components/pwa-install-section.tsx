"use client";

import { useState } from "react";
import { usePWAInstall } from "../hooks/use-pwa-install";

export function PWAInstallSection() {
  const { isInstallable, isInstalled, isStandalone, install } = usePWAInstall();
  const [isInstalling, setIsInstalling] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleInstall = async () => {
    setIsInstalling(true);
    const accepted = await install();
    setIsInstalling(false);
    
    if (!accepted && !isInstallable) {
      setShowInstructions(true);
    }
  };

  // If already installed/standalone, show success state
  if (isStandalone || isInstalled) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-emerald-600">check_circle</span>
          <div>
            <h3 className="text-sm font-semibold text-emerald-800">App Installed</h3>
            <p className="text-xs text-emerald-600 mt-0.5">
              AmanahVault is running as an installed app
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <span className="material-symbols-outlined text-emerald-600">install_desktop</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Install App</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Add AmanahVault to your home screen
            </p>
          </div>
        </div>
        
        {isInstallable ? (
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {isInstalling ? (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                Installing...
              </span>
            ) : (
              "Install"
            )}
          </button>
        ) : (
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            How to
          </button>
        )}
      </div>

      {/* Installation Instructions */}
      {showInstructions && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            Your browser doesn&apos;t support automatic installation. Follow these steps:
          </p>
          
          <div className="space-y-2">
            {/* iOS Safari */}
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <span className="material-symbols-outlined text-slate-500">apple</span>
                iPhone / iPad (Safari)
              </div>
              <ol className="mt-2 ml-5 list-decimal text-xs text-slate-600 space-y-1">
                <li>Tap the <strong>Share</strong> button in Safari</li>
                <li>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></li>
                <li>Tap <strong>Add</strong> to confirm</li>
              </ol>
            </div>

            {/* Android Chrome */}
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <span className="material-symbols-outlined text-slate-500">android</span>
                Android (Chrome)
              </div>
              <ol className="mt-2 ml-5 list-decimal text-xs text-slate-600 space-y-1">
                <li>Tap the <strong>menu</strong> (three dots)</li>
                <li>Tap <strong>&quot;Add to Home Screen&quot;</strong> or <strong>&quot;Install App&quot;</strong></li>
                <li>Follow the prompts to install</li>
              </ol>
            </div>

            {/* Desktop Chrome/Edge */}
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <span className="material-symbols-outlined text-slate-500">computer</span>
                Desktop (Chrome/Edge)
              </div>
              <ol className="mt-2 ml-5 list-decimal text-xs text-slate-600 space-y-1">
                <li>Click the <strong>install icon</strong> in the address bar</li>
                <li>Or click the menu → <strong>&quot;Install AmanahVault&quot;</strong></li>
                <li>Click <strong>Install</strong> to confirm</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
