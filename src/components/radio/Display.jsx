import React, { useState, useEffect } from "react";
import { Lock } from "lucide-react";
import MenuScreen from "./MenuScreen";

/* =========================
   Helpers
   ========================= */

// 44.225 (MHz) -> "44 225.000" (kHz, MHz digits separated like the real unit)
const formatKhz = (mhz) => {
  const hz = Math.round(mhz * 1e6);
  const mhzPart = Math.floor(hz / 1e6);
  const kHzPart = ((hz - mhzPart * 1e6) / 1000).toFixed(3).padStart(7, "0");
  return `${mhzPart} ${kHzPart}`;
};

// Tick row used by the ΔF and RF level scales
function Scale({ ticks, unit }) {
  return (
    <div className="flex justify-between text-[8px] leading-none text-slate-700">
      {ticks.map((t) => (
        <span key={t}>{t}</span>
      ))}
      <span>{unit}</span>
    </div>
  );
}

export default function Display({
  frequency,
  mode,
  isPowered,
  isBooting,
  settings,
  leftMenu,
  rightMenu,
  bottomMenu,
  menu,
  inputBuffer,
  freqLocked = false,
  presetOpen = false,
  presetOptions = [],
  presetIdx = 0,
  presetLoading = false,
  squelch = 0,
}) {
  /* =========================
     RF level meter (simulated)
     ========================= */
  const [rfLevel, setRfLevel] = useState(30);

  useEffect(() => {
    const interval = setInterval(() => {
      const noise = Math.random() * 20;
      const squelchBoost = settings.squelchState === "Open" ? 10 : 0;
      const squelchPenalty = (100 - squelch) * 0.1;
      setRfLevel(Math.min(100, noise + squelchBoost + 10 - squelchPenalty + 20));
    }, 500);
    return () => clearInterval(interval);
  }, [settings.squelchState, squelch]);

  /* =========================
     Power-off / boot screens
     ========================= */
  if (!isPowered && !isBooting) {
    return <div className="w-full h-full bg-black" />;
  }

  if (isBooting) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="text-green-500 font-mono text-sm tracking-widest animate-pulse">
          ROHDE & SCHWARZ
        </div>
      </div>
    );
  }

  /* =========================
     Sub-menu screens (Fill Gun, CU / Radio Maintenance, GPS, FF)
     ========================= */
  if (menu) return <MenuScreen menu={menu} />;

  /* =========================
     Home screen (0001 Home)
     ========================= */
  const freqText = inputBuffer ? `${inputBuffer}_` : formatKhz(frequency);
  const freqUnit = inputBuffer ? "MHz" : "kHz";
  const freqColor = inputBuffer ? "text-amber-600 animate-pulse" : "text-blue-700";

  const body = (
    <div className="h-full flex flex-col text-[10px] text-slate-800">
      {/* Preset page listbox / loading window (manual Fig. 3.27, p. 3.45) */}
      {(presetOpen || presetLoading) && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/70">
          <div className="w-[92%] border border-slate-500 bg-slate-200 shadow-xl font-mono text-[10px] text-slate-900">
            <div className="bg-slate-300 border-b border-slate-500 px-2 py-1 text-center font-bold">
              {presetLoading ? "Change Preset Page" : "Preset Page Selection"}
            </div>
            {presetLoading ? (
              <div className="h-24 flex flex-col items-center justify-center gap-2">
                <span className="text-2xl animate-pulse">⌛</span>
                <span>Loading...</span>
              </div>
            ) : (
              <div className="p-1 max-h-40 overflow-y-auto">
                {presetOptions.map((preset, index) => (
                  <div
                    key={preset.number}
                    className={`grid grid-cols-[20px_1fr_1fr] gap-1 px-1 py-px leading-tight ${
                      index === presetIdx ? "bg-blue-700 text-white" : "text-slate-800"
                    }`}
                  >
                    <span>{preset.number}:</span>
                    <span>{preset.mode}</span>
                    <span className="truncate">{preset.label}</span>
                  </div>
                ))}
              </div>
            )}
            {!presetLoading && (
              <div className="border-t border-slate-400 px-2 py-1 text-[9px] text-slate-600">
                Turn knob to select · ENT to confirm · ESC to cancel
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tx / Rx frequency */}
      {["Tx", "Rx"].map((line) => (
        <div key={line} className="flex items-baseline">
          <span className="w-6">{line}:</span>
          <span className={`font-digital text-[22px] leading-6 px-0.5 ${freqColor}`}>
            {freqText}
          </span>
          <span className="ml-1 text-[9px] text-blue-700">{freqUnit}</span>
          {freqLocked && line === "Rx" && <Lock size={10} className="ml-auto text-slate-600" />}
        </div>
      ))}

      {/* Modulation / scan state */}
      <div className="flex items-end gap-2 mt-1">
        <div className="leading-snug">
          <div>Modulation:</div>
          <div>Scan State:</div>
        </div>
        <div className="leading-snug">
          <div className="text-[20px] leading-5 text-blue-700">{mode}</div>
          <div className="text-blue-700">{settings.scanning ? "active" : "inactive"}</div>
        </div>
      </div>

      {/* ΔF scale */}
      <div className="mt-auto">
        <div className="flex items-end gap-1">
          <span className="text-[9px] w-6">ΔF</span>
          <div className="grow">
            <Scale ticks={["-2.0", "0", "2.0"]} unit="kHz" />
            <div className="relative h-2 border-b border-slate-700">
              <span className="absolute left-1/2 -translate-x-1/2 top-0 w-0.5 h-2 bg-blue-700" />
            </div>
          </div>
        </div>

        {/* RF level */}
        <div className="flex items-end gap-1 mt-1.5">
          <span className="text-[8px] leading-tight w-6">
            RF
            <br />
            LEVEL
          </span>
          <div className="grow">
            <div className="h-2 border border-slate-400 bg-slate-100 relative">
              <div
                className="h-full bg-green-500 transition-[width] duration-150"
                style={{ width: `${rfLevel}%` }}
              />
            </div>
            <Scale ticks={["0", "30", "60", "90"]} unit="dBµV" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <MenuScreen
      menu={{
        title: "0001 Home",
        icon: "home",
        rname: "SPCONT_8",
        gpsFix: settings.gps ? "3d" : "none",
        left: leftMenu,
        right: rightMenu,
        bottom: bottomMenu,
        body,
      }}
    />
  );
}
