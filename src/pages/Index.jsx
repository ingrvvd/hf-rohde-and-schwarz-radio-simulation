// import React, { useState } from 'react';
// import Display from '@/components/radio/Display';
// import Knob from '@/components/radio/Knob';
// import Keypad from '@/components/radio/Keypad';
// import { Power, Menu, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, CornerDownLeft, GripVertical, Disc } from 'lucide-react';

// export default function Index() {
//    const [isBooting, setIsBooting] = useState(false);
//   const [isPowered, setIsPowered] = useState(false);
//   const [frequency, setFrequency] = useState(24.450);
//   const [volume, _setVolume] = useState(40);
//   const [inputBuffer, setInputBuffer] = useState('');

//   // Radio Settings State
//   const [settings, setSettings] = useState({
//     mode: 'F3E', // Modes: F3E (FM), A3E (AM), J3E (SSB)
//     bandwidth: '25k', // 12.5k, 25k
//     power: 'High', // Low, Med, High
//     scanning: false,
//     squelchState: 'Closed', // Open, Closed
//     encryption: 'Clear', // Clear, Secure
//     remote: false,
//     gps: true,
//   });

//   const MODES = ['F3E', 'A3E', 'J3E'];
//   const BW_OPTIONS = ['12.5k', '25k', '50k'];
//   const POWER_OPTIONS = ['Low', 'Med', 'High'];

//   // Dynamic Menu Labels
//   const leftMenuItems = [
//     { label: settings.remote ? 'Remote: ON' : 'Remote: OFF', active: settings.remote },
//     { label: settings.encryption, active: settings.encryption === 'Secure' },
//     { label: 'Disconnect', active: false },
//     { label: `Sql: ${settings.squelchState}`, active: settings.squelchState === 'Open' },
//     { label: 'Maintenance', active: false },
//     { label: 'Fill Gun', active: false },
//   ];

//   const rightMenuItems = [
//     { label: `Mode: ${settings.mode}`, active: true },
//     { label: `BW: ${settings.bandwidth}`, active: false },
//     { label: `Pwr: ${settings.power}`, active: false },
//     { label: settings.scanning ? 'Scan: RUN' : 'Scan: STOP', active: settings.scanning },
//     { label: settings.gps ? 'GPS: ON' : 'GPS: OFF', active: settings.gps },
//     { label: 'Radio Maint.', active: false },
//   ];

//   const handleSoftKey = (side, index) => {
//     if (!isPowered) return;

//     // Haptic feedback
//     if (navigator.vibrate) navigator.vibrate(10);

//     if (side === 'left') {
//       switch (index) {
//         case 0: // Remote
//           setSettings(s => ({ ...s, remote: !s.remote }));
//           break;
//         case 1: // Encryption
//           setSettings(s => ({ ...s, encryption: s.encryption === 'Clear' ? 'Secure' : 'Clear' }));
//           break;
//         case 3: // Squelch
//           setSettings(s => ({ ...s, squelchState: s.squelchState === 'Closed' ? 'Open' : 'Closed' }));
//           break;
//         default:
//           break;
//       }
//     } else if (side === 'right') {
//       switch (index) {
//         case 0: // Mode
//           setSettings(s => {
//             const currentIdx = MODES.indexOf(s.mode);
//             const nextIdx = (currentIdx + 1) % MODES.length;
//             return { ...s, mode: MODES[nextIdx] };
//           });
//           break;
//         case 1: // Bandwidth
//           setSettings(s => {
//             const currentIdx = BW_OPTIONS.indexOf(s.bandwidth);
//             const nextIdx = (currentIdx + 1) % BW_OPTIONS.length;
//             return { ...s, bandwidth: BW_OPTIONS[nextIdx] };
//           });
//           break;
//         case 2: // Power
//           setSettings(s => {
//             const currentIdx = POWER_OPTIONS.indexOf(s.power);
//             const nextIdx = (currentIdx + 1) % POWER_OPTIONS.length;
//             return { ...s, power: POWER_OPTIONS[nextIdx] };
//           });
//           break;
//         case 3: // Scan
//           setSettings(s => ({ ...s, scanning: !s.scanning }));
//           break;
//         case 4: // GPS
//           setSettings(s => ({ ...s, gps: !s.gps }));
//           break;
//         default:
//           break;
//       }
//     }
//   };

//   const handleKnobChange = (val) => {
//     setFrequency(val);
//   };

//   const handleKeypadPress = (key) => {
//     if (!isPowered) return;

//     // Stop scanning if active when typing starts
//     if (settings.scanning) {
//       setSettings(s => ({ ...s, scanning: false }));
//     }

//     if (key === '+/-') return; // Not implemented yet

//     // Limit length
//     if (inputBuffer.length > 9) return;

//     // Prevent multiple dots
//     if (key === '.' && inputBuffer.includes('.')) return;

//     setInputBuffer(prev => prev + key);
//   };

//   const handleEnter = () => {
//     if (!inputBuffer) return;

//     const newFreq = parseFloat(inputBuffer);
//     if (!isNaN(newFreq) && newFreq > 0) {
//       setFrequency(newFreq);
//     }
//     setInputBuffer('');
//   };

//   const handleEsc = () => {
//     setInputBuffer('');
//   };

//   const handlePowerToggle = () => {
//   if (isPowered) {
//     // Power OFF immediately
//     setIsPowered(false);
//     setIsBooting(false);
//   } else {
//     // Power ON with boot delay
//     setIsBooting(true);
//     setTimeout(() => {
//       setIsBooting(false);
//       setIsPowered(true);
//     }, 1200); // boot time (ms)
//   }
// };

//   return (
//     <div className="w-full max-w-400 mx-auto p-4 md:p-8 flex items-center justify-center">

//       {/* Rack Ears Container */}
//       <div className="relative flex w-full bg-white rounded-sm chassis-shadow">

//         {/* Left Rack Ear */}
//         <div className="w-20 bg-slate-200 border-r border-slate-300 flex flex-col items-center justify-between py-6 rounded-l-sm relative">
//             <div className="w-4 h-4 rounded-full bg-slate-300 shadow-inner border border-slate-400 " />
//             <div className="w-4 h-4 rounded-full bg-slate-300 shadow-inner border border-slate-400 gap-4" />
//             {/* Handle */}
//             <div className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-48 bg-slate-300 rounded border border-slate-400 shadow-lg" />
//         </div>

//         {/* Main Faceplate */}
//         <div className="grow flex flex-col md:flex-row bg-slate-50 relative gap-20">

//            {/* Branding Bar */}
//            <div className="absolute top-0 left-0 right-0 h-12 border-b border-slate-200 flex items-center px-8 gap-2 bg-white z-10">
//               <div className="w-8 h-8 border-2 border-blue-600 flex items-center justify-center transform rotate-45">
//                   <div className="w-4 h-4 bg-blue-600 transform -rotate-45" />
//               </div>
//               <span className="text-blue-600 font-bold text-xl tracking-wide ml-2">ROHDE&SCHWARZ</span>
//            </div>

//            {/* LEFT SECTION: Display & Soft Keys */}
//            <div className="w-full md:w-[55%] p-4 pt-16 border-r border-slate-200 flex flex-col gap-4">

//               {/* Screen Area */}
//               <div className="flex gap-2 justify-center">
//                  {/* Left Soft Keys */}
//                  <div className="flex flex-col gap-2 justify-center py-4">
//                     {[...Array(6)].map((_, i) => (
//                       <button key={`l-${i}`} onClick={() => handleSoftKey('left', i)} className="w-10 h-8 bg-slate-100 rounded-sm border border-slate-300 soft-key-shadow active:inset-shadow hover:bg-slate-50" />
//                     ))}
//                  </div>

//                  {/* LCD Display Frame */}
//                  <div className="w-130 h-75 bg-slate-200 p-2 rounded border border-slate-300 shadow-inner relative">
//                     <div className={`w-full h-full border-2 border-slate-300 rounded overflow-hidden bg-white
//       ${isPowered ? 'shadow-[0_0_25px_rgba(34,197,94,0.25)]' : ''}
//     `}>
//                        <Display
//                          frequency={frequency}
//                          mode={settings.mode}
//                          volume={volume}
//                          squelch={0}
//                          isPowered={isPowered}
//                          isBooting={isBooting}
//                          settings={settings}
//                          leftMenu={leftMenuItems}
//                          rightMenu={rightMenuItems}
//                          inputBuffer={inputBuffer}
//                        />
//                     </div>
//                  </div>

//                  {/* Right Soft Keys */}
//                  <div className="flex flex-col gap-2 justify-center py-4">
//                     {[...Array(6)].map((_, i) => (
//                       <button key={`r-${i}`} onClick={() => handleSoftKey('right', i)} className="w-10 h-8 bg-slate-100 rounded-sm border border-slate-300 soft-key-shadow active:inset-shadow hover:bg-slate-50" />
//                     ))}
//                  </div>
//               </div>

//               {/* Bottom Control Cluster */}
//               <div className="h-24 bg-blue-50 rounded border border-blue-100 p-2 flex items-center justify-between px-8">

//                  {/* Power Group */}
//                  <div className="flex flex-col items-center gap-1">
//                     <button onClick={handlePowerToggle} className="w-12 h-10 bg-slate-800 rounded shadow-md border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 text-white text-[10px] font-bold flex flex-col items-center justify-center leading-none">
//                        <span>ON</span>
//                        <span className="text-slate-400">OFF</span>
//                     </button>
//                  </div>

//                  <div className="w-px h-12 bg-blue-200" />

//                  {/* Menu / Home */}
//                  <div className="grid grid-cols-2 gap-2">
//                     <button className="w-12 h-10 bg-slate-700 rounded shadow text-white text-[10px] font-bold flex flex-col items-center justify-center">
//                        MENU
//                     </button>
//                     <button className="w-12 h-10 bg-slate-700 rounded shadow text-white text-[10px] font-bold flex flex-col items-center justify-center">
//                        HOME
//                     </button>
//                  </div>

//                  {/* Navigation Pad */}
//                  <div className="flex items-center gap-1">
//                     <button className="w-8 h-10 bg-slate-300 rounded shadow text-slate-700 flex items-center justify-center active:translate-y-0.5"><ChevronLeft size={16}/></button>
//                     <button className="w-8 h-10 bg-slate-300 rounded shadow text-slate-700 flex items-center justify-center active:translate-y-0.5"><ChevronUp size={16}/></button>
//                     <button className="w-8 h-10 bg-slate-300 rounded shadow text-slate-700 flex items-center justify-center active:translate-y-0.5"><ChevronDown size={16}/></button>
//                     <button className="w-8 h-10 bg-slate-300 rounded shadow text-slate-700 flex items-center justify-center active:translate-y-0.5"><ChevronRight size={16}/></button>
//                  </div>

//                  {/* Enter/Esc */}
//                  <div className="flex gap-2">
//                     <button
//                       onClick={handleEsc}
//                       className="w-12 h-10 bg-slate-800 text-white text-[10px] font-bold rounded shadow flex flex-col items-center justify-center active:translate-y-0.5"
//                     >
//                        ESC
//                     </button>
//                     <button
//                       onClick={handleEnter}
//                       className="w-12 h-10 bg-slate-800 text-white text-[10px] font-bold rounded shadow flex flex-col items-center justify-center active:translate-y-0.5"
//                     >
//                        ENT
//                     </button>
//                  </div>

//               </div>
//            </div>

//            {/* RIGHT SECTION: Keypad & Hardware */}
//            <div className="w-full md:w-[45%] p-4 pt-16 flex flex-col relative">

//               {/* Speaker Grille / Vent Area */}
//               <div className="absolute top-4 right-4 bottom-32 left-4 z-0 flex flex-col gap-3 opacity-10 pointer-events-none">
//                  {[...Array(8)].map((_,i) => (
//                     <div key={i} className="w-full h-2 bg-black rounded-full" />
//                  ))}
//               </div>

//               <div className="flex gap-8 z-10 h-full">
//                  {/* Keypad and Knob Column */}
//                  <div className="flex flex-col items-center gap-8 mt-4">
//                     <div className="bg-slate-200 p-3 rounded border border-slate-300 shadow-sm">
//                        <Keypad onKeyPress={handleKeypadPress} className="w-48" />
//                     </div>

//                     <div className="relative">
//                        <Knob value={frequency} min={20} max={30} onChange={handleKnobChange} size="large" />
//                        {/* Knob guard decoration */}
//                        <div className="absolute -bottom-2 -right-2 text-[10px] text-slate-400 font-mono">TUNING</div>
//                     </div>
//                  </div>

//                  {/* Connectors Area */}
//                  <div className="grow flex flex-col justify-end pb-8 items-end">

//                      {/* Connector Panel */}
//                      <div className="w-full h-32 bg-slate-100 rounded-lg border border-slate-300 inset-panel p-4 flex items-center justify-around relative">
//                         <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] text-slate-400 font-bold tracking-widest">HEADPHONE / SPEAKER</span>

//                         {/* Fill Connector */}
//                         <div className="flex flex-col items-center gap-1">
//                            <div className="w-12 h-12 rounded-full bg-slate-300 border-4 border-slate-400 flex items-center justify-center shadow-md">
//                               <div className="w-8 h-8 rounded-full border-2 border-slate-500 bg-black" />
//                            </div>
//                            <span className="text-[9px] text-slate-500">FILL</span>
//                         </div>

//                         {/* Audio Connector */}
//                         <div className="flex flex-col items-center gap-1">
//                            <div className="w-10 h-10 rounded-full bg-red-900 border-4 border-slate-400 flex items-center justify-center shadow-md relative">
//                               <div className="grid grid-cols-2 gap-0.5">
//                                  {[...Array(4)].map((_,i)=><div key={i} className="w-1 h-1 bg-gold-500 rounded-full bg-yellow-600"/>)}
//                               </div>
//                               {/* Chain */}
//                               <div className="absolute top-8 left-8 w-16 h-16 border-b-2 border-r-2 border-slate-400 rounded-br-full opacity-50 pointer-events-none" />
//                            </div>
//                            <span className="text-[9px] text-slate-500">AUDIO</span>
//                         </div>

//                         {/* Switch */}
//                         <div className="flex flex-col items-center gap-1">
//                            <div className="w-8 h-12 bg-black rounded px-1 py-2 flex flex-col justify-between items-center">
//                               <div className="text-[8px] text-white">INT</div>
//                               <div className="w-4 h-6 bg-slate-700 rounded-sm border border-slate-600" />
//                               <div className="text-[8px] text-white">EXT</div>
//                            </div>
//                         </div>

//                      </div>

//                      {/* Status LEDs */}
//                      <div className="mt-4 flex gap-4 pr-4">
//                         <div className="flex items-center gap-1">
//                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
//                            <span className="text-[9px] font-bold text-slate-600">Tx</span>
//                         </div>
//                         <div className="flex items-center gap-1">
//                            <div className="w-2 h-2 rounded-full bg-slate-300" />
//                            <span className="text-[9px] font-bold text-slate-600">Rx</span>
//                         </div>
//                         <div className="flex items-center gap-1">
//                            <div className="w-2 h-2 rounded-full bg-green-500" />
//                            <span className="text-[9px] font-bold text-slate-600">BATT</span>
//                         </div>
//                      </div>

//                      {/* Model Label */}
//                      <div className="mt-2 text-right">
//                         <span className="font-serif italic text-slate-500 text-lg pr-2">M3SR</span>
//                         <span className="text-[10px] font-bold bg-slate-800 text-white px-1 py-0.5">SERIES 4100</span>
//                      </div>
//                  </div>
//               </div>
//            </div>

//         </div>

//         {/* Right Rack Ear */}
//         <div className="w-20 bg-slate-200 border-r border-slate-300 flex flex-col items-center justify-between py-6 rounded-l-sm relative">
//             <div className="w-4 h-4 rounded-full bg-slate-300 shadow-inner border border-slate-400" />
//             <div className="w-4 h-4 rounded-full bg-slate-300 shadow-inner border border-slate-400" />
//             {/* Handle */}
//             <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-48 bg-slate-300 rounded border border-slate-400 shadow-lg" />
//         </div>
//       </div>

//     </div>
//   );
// }

import React, { useState, useEffect, useRef } from "react";
import Display from "@/components/radio/Display";
import Knob from "@/components/radio/Knob";
import Keypad from "@/components/radio/Keypad";
import useCuMaintenance from "@/components/radio/useCuMaintenance";
import useGpsMenu from "@/components/radio/useGpsMenu";
import useRadioMaintenance from "@/components/radio/useRadioMaintenance";
import useFfOperation from "@/components/radio/useFfOperation";
import {
} from "lucide-react";

export default function Index() {
  // --- State ---
  const [isBooting, setIsBooting] = useState(false);
  const [isPowered, setIsPowered] = useState(false);
  const [frequency, setFrequency] = useState(24.45);
  const [volume, _setVolume] = useState(40);
  const [inputBuffer, setInputBuffer] = useState("");

  const [settings, setSettings] = useState({
    mode: "F3E",
    bandwidth: "25k",
    power: "High",
    scanning: false,
    squelchState: "Closed",
    encryption: "Clear",
    remote: true,
    gps: true,
    session: "ADVANCED"
  });

  // Control Unit Maintenance domain (manual sect. 3.5)
  const cu = useCuMaintenance({ connected: settings.remote });

  // GPS operational menus (manual sect. 5.2.2)
  const gps = useGpsMenu();

  // whichever soft-key domain (CU Maintenance / GPS) is currently on screen
  // Radio maintenance domain (manual sect. 3.4)
  const rm = useRadioMaintenance({ connected: settings.remote });

  // Fixed Frequency operational menus (manual sect. 3.7.2)
  const ff = useFfOperation({ userLevel: cu.userLevel });

  const ctl = cu.active ? cu : gps.active ? gps : rm.active ? rm : ff;

  // Session listbox (opens next to the Session softkey, driven by the knob)
  const SESSION_OPTIONS = ["MONITORING", "ADVANCED", "FIXED", "LOCAL"];
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionIdx, setSessionIdx] = useState(1);

  // Preset pages shown in R&S M3SR 4100 manual, Figure 3.27 (p. 3.45).
  const PRESET_OPTIONS = [
    { number: 0, mode: "FF", label: "PP0 FF" },
    { number: 1, mode: "FF", label: "PP1 FF" },
    { number: 2, mode: "FF", label: "PP2 FF" },
    { number: 3, mode: "FF", label: "PP3 FF" },
    { number: 4, mode: "FF", label: "PP4 FF" },
    { number: 5, mode: "ALE 2G", label: "PP5 ALE" },
    { number: 6, mode: "SECOM-H", label: "PP6 SECOMH" },
    { number: 7, mode: "SECOM-H", label: "PP7 SECOMH" },
    { number: 8, mode: "Data Mode", label: "PP8 DATA MODEM" },
    { number: 9, mode: "ALE 2G", label: "PP9 ALE" },
  ];
  const [presetOpen, setPresetOpen] = useState(false);
  const [presetIdx, setPresetIdx] = useState(0);
  const [activePreset, setActivePreset] = useState(PRESET_OPTIONS[0]);
  const [presetLoading, setPresetLoading] = useState(false);

  // Fill Gun domain
  const RGA_OPTIONS = ["HF 1", "HF 2"];
  const [rgaOpen, setRgaOpen] = useState(false); // RGA listbox (radio picker)
  const [rgaPopupIdx, setRgaPopupIdx] = useState(0);
  const [screen, setScreen] = useState("main"); // "main" | "fillgun"
  const [fillGun, setFillGun] = useState({
    rgaIdx: 0,
    state: "IDLE", // IDLE | DOWNLOADING | DONE | ABORTED
    progress: 0,
    result: "-"
  });
  const isDownloading = fillGun.state === "DOWNLOADING";

  // Simulated RGA download progress
  useEffect(() => {
    if (!isDownloading) return;
    const t = setInterval(() => {
      setFillGun((f) => {
        const progress = Math.min(100, f.progress + 5);
        return progress >= 100
          ? { ...f, progress, state: "DONE", result: "OK" }
          : { ...f, progress };
      });
    }, 300);
    return () => clearInterval(t);
  }, [isDownloading]);

  // --- Refs for Noise ---
  const audioCtxRef = useRef(null);
  const noiseSourceRef = useRef(null);

  // --- Noise Effect ---
  useEffect(() => {
    if (!isPowered) {
      // Stop noise on power off
      if (noiseSourceRef.current) {
        noiseSourceRef.current.stop();
        noiseSourceRef.current.disconnect();
        noiseSourceRef.current = null;
      }
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      return;
    }

    if (settings.squelchState === "Open") {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext ||
          window.webkitAudioContext)();
      }

      const bufferSize = 2 * audioCtxRef.current.sampleRate;
      const noiseBuffer = audioCtxRef.current.createBuffer(
        1,
        bufferSize,
        audioCtxRef.current.sampleRate
      );
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1; // white noise
      }

      const whiteNoise = audioCtxRef.current.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const gainNode = audioCtxRef.current.createGain();
      gainNode.gain.value = 0.1; // volume

      whiteNoise.connect(gainNode).connect(audioCtxRef.current.destination);
      whiteNoise.start();

      noiseSourceRef.current = whiteNoise;
    } else {
      if (noiseSourceRef.current) {
        noiseSourceRef.current.stop();
        noiseSourceRef.current.disconnect();
        noiseSourceRef.current = null;
      }
    }

    return () => {
      if (noiseSourceRef.current) {
        noiseSourceRef.current.stop();
        noiseSourceRef.current.disconnect();
        noiseSourceRef.current = null;
      }
    };
  }, [settings.squelchState, isPowered]);

  // --- Menu Items ---
  // Home screen soft keys (layout of the power-on screen)
  const leftMenuItems = [
    { label: "" },
    { label: "Connect to\nRadio", disabled: settings.remote },
    {
      label: "Session",
      value: settings.session,
      notch: true,
      hot: sessionOpen,
      popup: sessionOpen ? { options: SESSION_OPTIONS, index: sessionIdx } : undefined
    },
    { label: "Disconnect\nfrom Radio", disabled: !settings.remote },
    { label: "" },
    { label: "Control Unit\nMaintenance", nav: true }
  ];

  const rightMenuItems = [
    { label: "FF\nOPERATION", nav: true },
    { label: "FF\nCONFIG", nav: true },
    { label: "Preset", value: String(activePreset.number), notch: true, hot: presetOpen || presetLoading },
    { label: "" },
    { label: "FF SCAN", nav: true, hot: ff.scanning },
    { label: "" }
  ];

  const bottomMenuItems = [
    { label: "Fill Gun", nav: true },
    { label: "GPS", nav: true },
    { label: "Radio\nMaintenance", nav: true }
  ];

  // Fill Gun domain soft keys: PREV / RGA / Load / Break
  const fillGunLeftItems = [
    { label: "PREV", nav: true },
    {
      label: "RGA",
      notch: true,
      popup: rgaOpen ? { options: RGA_OPTIONS, index: rgaPopupIdx } : undefined
    },
    { label: "Load", active: false, disabled: isDownloading },
    { label: "Break", active: false, disabled: !isDownloading },
    { label: "", active: false },
    { label: "", active: false }
  ];
  const fillGunRightItems = [...Array(6)].map(() => ({ label: "" }));
  const fillGunMenu = {
    title: "2001 Fill Gun 1/1",
    left: fillGunLeftItems,
    right: fillGunRightItems,
    bottom: null,
    body: (
      <table className="text-[11px] leading-snug">
        <tbody>
          {[
            ["RGA Name:", RGA_OPTIONS[fillGun.rgaIdx]],
            ["State:", fillGun.state],
            ["Progress:", `${fillGun.progress} %`],
            ["Result:", fillGun.result],
          ].map(([k, v]) => (
            <tr key={k}>
              <td className="pr-6 py-0.5">{k}</td>
              <td className="py-0.5 text-blue-700 uppercase">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
  };
  const activeMenu = ctl.active ? ctl.menu : screen === "fillgun" ? fillGunMenu : null;

  // --- Handlers ---
  const handleBottomKey = (index) => {
    if (!isPowered) return;
    if (navigator.vibrate) navigator.vibrate(10);
    if (ctl.active) {
      ctl.softKey("bottom", index);
      return;
    }
    if (screen !== "main") return;

    // Home screen bottom row
    setSessionOpen(false);
    setPresetOpen(false);
    switch (index) {
      case 0: // Fill Gun
        setScreen("fillgun");
        break;
      case 1: // GPS operational menu
        gps.open();
        break;
      case 2: // Radio Maintenance (3001)
        rm.open();
        break;
      default:
        break;
    }
  };

  const handleMenuHome = (name) => {
    if (!isPowered) return;
    if (ctl.active) ctl.homeKey(name);
    else if (screen === "fillgun") setScreen("main");
  };

  const handleSoftKey = (side, index) => {
    if (!isPowered) return;
    if (navigator.vibrate) navigator.vibrate(10);

    // Control Unit Maintenance has its own soft keys
    if (ctl.active) {
      ctl.softKey(side, index);
      return;
    }

    // Fill Gun domain has its own soft keys
    if (screen === "fillgun") {
      if (side !== "left") return;
      if (index !== 1) setRgaOpen(false); // any other key closes the list
      switch (index) {
        case 0: // PREV -> back to the main menu
          setScreen("main");
          break;
        case 1: // RGA -> open / close the radio list
          if (isDownloading) break;
          if (rgaOpen) {
            setRgaOpen(false);
          } else {
            setRgaPopupIdx(fillGun.rgaIdx);
            setRgaOpen(true);
          }
          break;
        case 2: // Load -> start download
          if (!isDownloading)
            setFillGun((f) => ({ ...f, state: "DOWNLOADING", progress: 0, result: "-" }));
          break;
        case 3: // Break -> abort download
          if (isDownloading)
            setFillGun((f) => ({ ...f, state: "ABORTED", result: "BREAK" }));
          break;
        default:
          break;
      }
      return;
    }

    // Preset selection is available from the Home menu only.
    if (side === "right" && index === 2) {
      setSessionOpen(false);
      if (!presetLoading) {
        if (presetOpen) setPresetOpen(false);
        else {
          setPresetIdx(PRESET_OPTIONS.findIndex((p) => p.number === activePreset.number));
          setPresetOpen(true);
        }
      }
      return;
    }

    // Any other softkey closes the current selection list.
    if (!(side === "left" && index === 2)) setSessionOpen(false);
    if (!(side === "right" && index === 2)) setPresetOpen(false);

    if (side === "left") {
      switch (index) {
        case 1: // Connect to Radio
          setSettings((s) => ({ ...s, remote: true }));
          break;
        case 2: // Session -> open / close the listbox
          if (sessionOpen) {
            setSessionOpen(false);
          } else {
            setSessionIdx(Math.max(0, SESSION_OPTIONS.indexOf(settings.session)));
            setSessionOpen(true);
          }
          break;
        case 3: // Disconnect from Radio
          setSettings((s) => ({ ...s, remote: false }));
          break;
        case 5: // Control Unit Maintenance (4001)
          cu.open();
          break;
        default:
          break;
      }
    } else if (side === "right") {
      switch (index) {
        case 0: // FF Operation -> FF OP 1/2 (1111)
          ff.open();
          break;
        case 1: // FF Config -> FF CFG 1/2 (1121)
          ff.openCfg();
          break;
        case 4: // FF Scan -> FF SCAN 1/2 (1115)
          ff.openScan();
          break;
        default:
          break;
      }
    }
  };

  // Rotary knob: turns through session choices while the Session list is open; otherwise tunes frequency
  const confirmRga = () => {
    setFillGun((f) => ({ ...f, rgaIdx: rgaPopupIdx, state: "IDLE", progress: 0, result: "-" }));
    setRgaOpen(false);
  };

  const handleKnobChange = (val) => {
    if (ctl.active) {
      ctl.onKnob(val);
      return;
    }
    if (screen === "fillgun") {
      if (rgaOpen) setRgaPopupIdx(val);
      return;
    }
    if (presetOpen) setPresetIdx(val);
    else if (sessionOpen) setSessionIdx(val);
    else if (cu.userLevel >= 1) setFrequency(val); // frequency is locked at user level 0
  };

  const confirmSession = () => {
    setSettings((s) => ({ ...s, session: SESSION_OPTIONS[sessionIdx] }));
    setSessionOpen(false);
  };

  // ENT starts the preset change. The short loading period represents
  // the radio reconfiguring its communication-mode parameters.
  const confirmPreset = () => {
    if (!presetOpen || presetLoading) return;
    const selected = PRESET_OPTIONS[presetIdx];
    if (!selected) return;
    setPresetOpen(false);
    setPresetLoading(true);
    window.setTimeout(() => {
      setActivePreset(selected);
      setSettings((s) => ({ ...s, mode: selected.mode }));
      setPresetLoading(false);
    }, 1400);
  };

  const handleKeypadPress = (key) => {
    if (isPowered && ctl.active) {
      ctl.keypad(key);
      return;
    }
    if (!isPowered || sessionOpen || screen === "fillgun") return;
    if (cu.userLevel < 1) return; // frequency entry is locked at user level 0
    if (ff.scanning) ff.stopScan();
    if (key === "+/-") return;
    if (inputBuffer.length > 9) return;
    if (key === "." && inputBuffer.includes(".")) return;
    setInputBuffer((prev) => prev + key);
  };

  const handleEnter = () => {
    if (ctl.active) {
      ctl.enter();
      return;
    }
    if (screen === "fillgun") {
      if (rgaOpen) confirmRga();
      return;
    }
    if (presetOpen) {
      confirmPreset();
      return;
    }
    if (sessionOpen) {
      confirmSession();
      return;
    }
    if (!inputBuffer) return;
    const newFreq = parseFloat(inputBuffer);
    if (!isNaN(newFreq) && newFreq > 0) setFrequency(newFreq);
    setInputBuffer("");
  };

  const handleEsc = () => {
    if (ctl.active) {
      ctl.esc();
      return;
    }
    if (screen === "fillgun") {
      if (rgaOpen) setRgaOpen(false);
      else setScreen("main");
      return;
    }
    if (presetOpen) {
      setPresetOpen(false);
      return;
    }
    if (sessionOpen) {
      setSessionOpen(false);
      return;
    }
    setInputBuffer("");
  };

  const handlePowerToggle = () => {
    if (isPowered) {
      cu.reset();
      gps.reset();
      rm.reset();
      ff.reset();
      setScreen("main");
      setRgaOpen(false);
      setFillGun((f) => (f.state === "DOWNLOADING" ? { ...f, state: "ABORTED", result: "BREAK" } : f));
      setSessionOpen(false);
      setPresetOpen(false);
      setPresetLoading(false);
      setIsPowered(false);
      setIsBooting(false);
    } else {
      setIsBooting(true);
      setTimeout(() => {
        setIsBooting(false);
        setIsPowered(true);
      }, 1200);
    }
  };

  // --- JSX ---
  return (
    <div className="w-full max-w-400 mx-auto p-4 md:p-8 flex items-center justify-center">
      {/* Main radio chassis */}
      <div className="relative flex w-full bg-white rounded-sm chassis-shadow">
        {/* Left rack ear */}
        <div className="w-20 bg-slate-200 border-r border-slate-300 flex flex-col items-center justify-between py-6 rounded-l-sm relative">
          <div className="w-4 h-4 rounded-full bg-slate-300 shadow-inner border border-slate-400 " />
          <div className="w-4 h-4 rounded-full bg-slate-300 shadow-inner border border-slate-400 gap-4" />
          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-48 bg-slate-300 rounded border border-slate-400 shadow-lg" />
        </div>

        {/* Main Faceplate */}
        <div className="grow flex flex-col md:flex-row bg-slate-50 relative gap-20">
         {/* Branding Bar */}
            <div className="absolute top-0 left-0 right-0 h-12 border-b border-slate-200 flex items-center px-8 gap-2 bg-white z-10">
               <div className="w-8 h-8 border-2 border-blue-600 flex items-center justify-center transform rotate-45">
                   <div className="w-4 h-4 bg-blue-600 transform -rotate-45" />
               </div>
               <span className="text-blue-600 font-bold text-xl tracking-wide ml-2">ROHDE&SCHWARZ</span>
            </div>
          {/* LEFT SECTION */}
          <div className="w-full md:w-[55%] p-4 pt-16 border-r border-slate-200 flex flex-col gap-4">
            {/* Display Frame */}
            <div className="flex gap-2 justify-center items-start">
              {/* Side keys: same pitch as the on-screen cells (54px = frame 8 + border 2 + header 44) */}
              <div className="flex flex-col h-75" style={{ paddingTop: 54, paddingBottom: 10 }}>
                {[...Array(6)].map((_, i) => (
                  <button
                    key={`l-${i}`}
                    onClick={() => handleSoftKey("left", i)}
                    className="w-10 flex-1 my-0.5 bg-slate-100 rounded-sm border border-slate-300 soft-key-shadow active:inset-shadow hover:bg-slate-50"
                  />
                ))}
              </div>

              <div className="flex flex-col gap-2">
              <div className="w-130 h-75 bg-slate-200 p-2 rounded border border-slate-300 shadow-inner relative">
                <div
                  className={`w-full h-full border-2 border-slate-300 rounded overflow-hidden bg-white
                  ${isPowered ? "shadow-[0_0_25px_rgba(34,197,94,0.25)]" : ""}`}
                >
                  <Display
                    frequency={frequency}
                    mode={settings.mode}
                    volume={volume}
                    squelch={0}
                    isPowered={isPowered}
                    isBooting={isBooting}
                    settings={{ ...settings, scanning: ff.scanning }}
                    leftMenu={leftMenuItems}
                    rightMenu={rightMenuItems}
                    bottomMenu={bottomMenuItems}
                    menu={activeMenu}
                    inputBuffer={inputBuffer}
                    freqLocked={cu.userLevel < 1}
                    presetOpen={presetOpen}
                    presetOptions={PRESET_OPTIONS}
                    presetIdx={presetIdx}
                    activePreset={activePreset}
                    presetLoading={presetLoading}
                  />
                </div>
              </div>
              </div>

              <div className="flex flex-col h-75" style={{ paddingTop: 54, paddingBottom: 10 }}>
                {[...Array(6)].map((_, i) => (
                  <button
                    key={`r-${i}`}
                    onClick={() => handleSoftKey("right", i)}
                    className="w-10 flex-1 my-0.5 bg-slate-100 rounded-sm border border-slate-300 soft-key-shadow active:inset-shadow hover:bg-slate-50"
                  />
                ))}
              </div>
            </div>

            {/* Bottom Control Cluster: ON/OFF, MENU, HOME, 3 soft keys, ESC, ENT.
                The row has the same 616px width as the display row above (40 key + 8 + 520 display + 8 + 40 key),
                so it is centred on the display. The three soft keys are 48px buttons centred under the three
                bottom cells: centre area = 500 - 2 x 96 = 308px -> 102.667px per cell.
                Left edge of the first key = 308 - 102.667 - 24 = 181.333px, so ON/OFF starts at
                181.333 - 3 x 48 - 3 x 8 = 13.333px. All other gaps stay 8px. */}
            <div className="h-24 bg-blue-50 rounded border border-blue-100 p-2 flex items-center justify-center">
              <div className="flex items-center gap-2 w-[616px] shrink-0 pl-[13.333px]">
              <button
                onClick={handlePowerToggle}
                className="w-12 h-10 shrink-0 bg-slate-800 rounded shadow-md border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 text-white text-[10px] font-bold flex flex-col items-center justify-center leading-none"
              >
                <span>ON</span>
                <span className="text-slate-400">OFF</span>
              </button>
              <button
                onClick={() => handleMenuHome("MENU/HOME")}
                className="w-12 h-10 shrink-0 bg-slate-700 rounded shadow text-white text-[10px] font-bold flex flex-col items-center justify-center"
              >
                MENU
              </button>
              <button
                onClick={() => handleMenuHome("MENU/HOME")}
                className="w-12 h-10 shrink-0 bg-slate-700 rounded shadow text-white text-[10px] font-bold flex flex-col items-center justify-center"
              >
                HOME
              </button>
              {/* Bottom soft keys: between HOME and ESC */}
              {[...Array(3)].map((_, i) => (
                <button
                  key={`b-${i}`}
                  onClick={() => handleBottomKey(i)}
                  className={`w-12 h-10 shrink-0 bg-slate-100 rounded border border-slate-300 soft-key-shadow active:inset-shadow hover:bg-slate-50 ${i < 2 ? "mr-[46.667px]" : ""}`}
                />
              ))}
              <button
                onClick={handleEsc}
                className="w-12 h-10 shrink-0 bg-slate-800 text-white text-[10px] font-bold rounded shadow flex flex-col items-center justify-center active:translate-y-0.5"
              >
                ESC
              </button>
              <button
                onClick={handleEnter}
                className="w-12 h-10 shrink-0 bg-slate-800 text-white text-[10px] font-bold rounded shadow flex flex-col items-center justify-center active:translate-y-0.5"
              >
                ENT
              </button>
              </div>
            </div>
          </div>

          {/* RIGHT SECTION */}
          <div className="w-full md:w-[45%] p-4 pt-16 flex flex-col relative">
            {/* Speaker Grille */}
            <div className="absolute top-4 right-4 bottom-32 left-4 z-0 flex flex-col gap-3 opacity-10 pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="w-full h-2 bg-black rounded-full" />
              ))}
            </div>

            <div className="flex gap-8 z-10 h-full">
              {/* Keypad & Knob */}
              <div className="flex flex-col items-center gap-8 mt-4">
                <div className="bg-slate-200 p-3 rounded border border-slate-300 shadow-sm">
                  <Keypad onKeyPress={handleKeypadPress} className="w-48" />
                </div>
                <div className="relative">
                  <Knob
                    value={ctl.active ? ctl.knob.value : rgaOpen ? rgaPopupIdx : presetOpen ? presetIdx : sessionOpen ? sessionIdx : frequency}
                    min={ctl.active ? ctl.knob.min : rgaOpen || presetOpen || sessionOpen ? 0 : 1.6}
                    max={ctl.active ? ctl.knob.max : rgaOpen ? RGA_OPTIONS.length - 1 : presetOpen ? PRESET_OPTIONS.length - 1 : sessionOpen ? SESSION_OPTIONS.length - 1 : 60}
                    onChange={handleKnobChange}
                    onPress={() => (ctl.active ? ctl.knobPress() : rgaOpen ? confirmRga() : presetOpen ? confirmPreset() : sessionOpen && confirmSession())}
                    size="large"
                  />
                  <div className="absolute -bottom-2 -right-2 text-[10px] text-slate-400 font-mono">
                    TUNING
                  </div>
                </div>
              </div>
              {/* Connectors Area */}
                  <div className="grow flex flex-col justify-end pb-8 items-end">

                      {/* Connector Panel */}
                      <div className="w-full h-32 bg-slate-100 rounded-lg border border-slate-300 inset-panel p-4 flex items-center justify-around relative">
                         <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] text-slate-400 font-bold tracking-widest">HEADPHONE / SPEAKER</span>

                         {/* Fill Connector */}
                         <div className="flex flex-col items-center gap-1">
                            <div className="w-12 h-12 rounded-full bg-slate-300 border-4 border-slate-400 flex items-center justify-center shadow-md">
                               <div className="w-8 h-8 rounded-full border-2 border-slate-500 bg-black" />
                            </div>
                            <span className="text-[9px] text-slate-500">FILL</span>
                         </div>

                         {/* Audio Connector */}
                         <div className="flex flex-col items-center gap-1">
                            <div className="w-10 h-10 rounded-full bg-red-900 border-4 border-slate-400 flex items-center justify-center shadow-md relative">
                               <div className="grid grid-cols-2 gap-0.5">
                                  {[...Array(4)].map((_,i)=><div key={i} className="w-1 h-1 bg-gold-500 rounded-full bg-yellow-600"/>)}
                               </div>
                               {/* Chain */}
                               <div className="absolute top-8 left-8 w-16 h-16 border-b-2 border-r-2 border-slate-400 rounded-br-full opacity-50 pointer-events-none" />
                            </div>
                            <span className="text-[9px] text-slate-500">AUDIO</span>
                         </div>

                         {/* Switch */}
                         <div className="flex flex-col items-center gap-1">
                            <div className="w-8 h-12 bg-black rounded px-1 py-2 flex flex-col justify-between items-center">
                               <div className="text-[8px] text-white">INT</div>
                               <div className="w-4 h-6 bg-slate-700 rounded-sm border border-slate-600" />
                               <div className="text-[8px] text-white">EXT</div>
                            </div>
                         </div>

                      </div>

                      {/* Status LEDs */}
                      <div className="mt-4 flex gap-4 pr-4">
                         <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
                            <span className="text-[9px] font-bold text-slate-600">Tx</span>
                         </div>
                         <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-slate-300" />
                            <span className="text-[9px] font-bold text-slate-600">Rx</span>
                         </div>
                         <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-[9px] font-bold text-slate-600">BATT</span>
                         </div>
                      </div>

                      {/* Model Label */}
                      <div className="mt-2 text-right">
                         <span className="font-serif italic text-slate-500 text-lg pr-2">M3SR</span>
                         <span className="text-[10px] font-bold bg-slate-800 text-white px-1 py-0.5">SERIES 4100</span>
                      </div>
                  </div>
            </div>
          </div>
        </div>

        {/* Right Rack Ear */}
        <div className="w-20 bg-slate-200 border-r border-slate-300 flex flex-col items-center justify-between py-6 rounded-l-sm relative">
          <div className="w-4 h-4 rounded-full bg-slate-300 shadow-inner border border-slate-400" />
          <div className="w-4 h-4 rounded-full bg-slate-300 shadow-inner border border-slate-400" />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-48 bg-slate-300 rounded border border-slate-400 shadow-lg" />
        </div>
      </div>
    </div>
  );
}
