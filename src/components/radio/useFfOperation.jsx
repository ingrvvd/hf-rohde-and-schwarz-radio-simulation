import React, { useState, useEffect, useRef } from "react";
import {
  PasswordPanel,
  newPasswordEditor,
  passwordLevel,
  pwdKeypad,
  pwdKnob,
  pwdKnobSpec,
  pwdClear,
} from "./PasswordEditor";

/* ------------------------------------------------------------------ *
 *  Fixed Frequency operational menus (manual sect. 3.7.2)
 *
 *  1111 FF OP 1/2   Channel Store/Recall, squelch, FREQ, CLARIF, MODE, BW, AGC, Preamp
 *  1112 FF OP 2/2   VOX, VC, NB, Release, Notch, PBT, Power, ATU Tune, F1D / J2D / B7D keys
 *
 *  The softkeys offered depend on the modulation mode (Table 3.35).
 *
 *  Fixed Frequency configuration menus (manual sect. 3.7.3) live in this hook too,
 *  because they change the operational behaviour:
 *  1121 FF CFG 1/2   ENVIR, ATU SIL / Bypass / Learn, SELCAL, learn range
 *  1122 FF CFG 2/2   VOX / squelch settings, default release times, A1A hold time
 *
 *  FF SCAN menus (manual sect. 3.9.4) share the radio state too:
 *  1115 FF SCAN 1/2  Frequency scan (Start / Step / Stop) or Channel scan, Scan Mode FRQ | CHAN
 *  1125 FF SCAN 2/2  Dwell times, hold time, scan channel list (knob scrolls the list)
 * ------------------------------------------------------------------ */

// Hardware options
const SYSTEM_POWER = 150; // 150, 500 or 1000 W system (changes the Power listbox)
const HAS_ATU = true; // figures show ATU Tune greyed out (no ATU connected)
const HAS_MULTITONE = false; // option key R&S GS4123S MULTITONE (greyed in the figures)

const MODES = ["A1A", "A3E", "R3E", "H3E", "F3E", "+J3E", "-J3E", "+J2D", "-J2D", "F1D", "B8E", "B7D"];
const isJ2D = (m) => m.endsWith("J2D");
const isJ3E = (m) => m.endsWith("J3E");
const sqlSupported = (m) => !["A1A", "B8E", "B7D"].includes(m);
const hasAgc = (m) => !["F3E", "F1D"].includes(m);

const FILTERS = [50, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000, 1200, 1500, 1800, 2100, 2400, 2700, 3100];
const bwOptions = (m) => {
  if (m === "A1A" || isJ3E(m)) return FILTERS;
  if (isJ2D(m)) return FILTERS.filter((f) => f >= 100);
  if (m === "A3E") return [3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000];
  if (m === "H3E" || m === "R3E") return [2100, 2400, 2700, 3100];
  if (m === "F3E") return [6000, 8000];
  if (m === "B8E" || m === "B7D") return [1800, 2100, 2400, 2700, 3100];
  return [];
};
const DEF_BW = { A1A: 300, "+J3E": 2400, "-J3E": 2400, A3E: 6000, H3E: 3100, R3E: 3100, F3E: 8000, "+J2D": 2700, "-J2D": 2700, B8E: 2700, B7D: 2700 };
const F1D_BW = { 50: 250, 75: 250, 100: 300, 150: 350, 300: 400, 600: 600 }; // derived from baud rate
const DEF_RT = { A1A: 1000, A3E: 150, R3E: 150, H3E: 150, F3E: 1000, "+J2D": 25, "-J2D": 25, "+J3E": 1000, "-J3E": 1000, B8E: 1000, B7D: 1000, F1D: 1000 };
const fmtBw = (v) => (v < 1000 ? `${v} Hz` : `${v / 1000} kHz`);

const POWER = {
  150: ["10 mW", "10 W", "20 W", "50 W", "100 W", "150 W"],
  500: ["10 mW", "20 W", "50 W", "100 W", "250 W", "500 W"],
  1000: ["10 mW", "50 W", "100 W", "250 W", "500 W", "1000 W"],
}[SYSTEM_POWER];

const SQL_TONES = "67 69.3 71.9 74.4 77 79.7 82.5 85.4 88.5 91.5 94.8 97.4 100 103.5 107.2 110.9 114.8 118.8 123 127.3 131.8 136.5 141.3 146.2 151.4 156.7 162.2 167.9 173.8 179.9 186.2 192.8 203.5 210.7 218.1 225.7 233.6 241.8 250.3".split(" ");
const STEPS = ["1 Hz", "10 Hz", "100 Hz", "1 kHz", "10 kHz", "100 kHz", "1 MHz", "10 MHz"];

const maritimeRanges = {
  "+J3E": [[401, 429], [601, 608], [801, 837], [1201, 1241], [1601, 1656], [1801, 1815], [2201, 2253], [2501, 2510]],
  F1D: [[4001, 4019], [6001, 6034], [8001, 8040], [12001, 12156], [16001, 16193], [18001, 18045], [22001, 22135], [25001, 25040]],
};
const maritimeMode = (n) => {
  for (const [m, rs] of Object.entries(maritimeRanges)) if (rs.some(([a, b]) => n >= a && n <= b)) return m;
  return null;
};

const NUMS = {
  rssi: { label: "RSSI Thres", min: 0, max: 110, step: 1, dec: 0, unit: "dB" },
  syll: { label: "Syll. Thres", min: 0, max: 100, step: 1, dec: 0, unit: "%" },
  clarif: { label: "CLARIF", min: -200, max: 200, step: 5, dec: 0, unit: "Hz" },
  agcThr: { label: "AGC Threshold", min: 0, max: 100, step: 1, dec: 0, unit: "" },
  mgc: { label: "MGC Level", min: -30, max: 100, step: 1, dec: 0, unit: "dBµV" },
  pbt: { label: "PBT", min: -2000, max: 2000, step: 10, dec: 0, unit: "Hz" },
  bfo: { label: "BFO", min: -2000, max: 2000, step: 10, dec: 0, unit: "Hz" },
  delta: { label: "Delta FREQ", min: -2000, max: 2000, step: 10, dec: 0, unit: "Hz" },
  pep: { label: "PEP/PAvg", min: 0, max: 12, step: 0.1, dec: 1, unit: "dB" },
  // scan timing (stored in the scan state, not in the radio state)
  dwellRssi: { label: "Dwell Time RSSI Sq", min: 10, max: 2000, step: 10, dec: 0, unit: "ms" },
  dwellSig: { label: "Dwell Time Signal Sq", min: 10, max: 2000, step: 10, dec: 0, unit: "ms" },
  dwellSyll: { label: "Dwell Time Syll Sq", min: 10, max: 2000, step: 10, dec: 0, unit: "ms" },
  hold: { label: "Hold Time", min: 1000, max: 60000, step: 100, dec: 0, unit: "ms" },
};
const SC_NUMS = ["dwellRssi", "dwellSig", "dwellSyll", "hold"];
const fmtNum = (k, v) => `${NUMS[k].dec ? Number(v).toFixed(NUMS[k].dec) : v}${NUMS[k].unit ? " " + NUMS[k].unit : ""}`;

const RT_KEYS = { A1A: "rtA1A", A3E: "rtA3E", "+J3E": "rtJ3E", "-J3E": "rtJ3E", "+J2D": "rtJ2D", "-J2D": "rtJ2D", B8E: "rtB8E" };
const CFG_INIT = {
  env: "Shore", atuSil: true, atuByp: false, selcal: false, learnLow: 1500000, learnHigh: 29999999,
  voxSens: "MEDIUM", voxHang: "MEDIUM (600 ms)", sqlHang: "MEDIUM (600 ms)", sqlMode: "RXTX", a1aHold: "250 ms",
  rtA1A: "1000 ms", rtA3E: "150 ms", rtJ3E: "1000 ms", rtJ2D: "25 ms", rtB8E: "1000 ms",
};
const defaultsFor = (m, c = CFG_INIT) => ({
  bw: m === "F1D" ? F1D_BW[300] : DEF_BW[m],
  release: RT_KEYS[m] ? parseInt(c[RT_KEYS[m]], 10) : DEF_RT[m],
  delta: isJ2D(m) ? (m[0] === "+" ? 1800 : -1800) : 0,
});
const INITIAL = {
  mod: "F3E", tx: 24450000, rx: 24450000, clarif: 0, sqlType: "OFF", sqlTone: "100", rssi: 20, syll: 50,
  preamp: true, agc: true, agcThr: 0, mgc: -12, vox: "OFF", vc: true, nb: "OFF", notch: "OFF", pbt: 0,
  power: "10 mW", bfo: 800, dlm: "OFF", pep: 0, multitone: "OFF", baud: "300", shift: "85",
  polRx: "+", polTx: "+", run: true, ...defaultsFor("F3E"),
};

// FF SCAN defaults as shown in the manual (Figures 3.85 and 3.87)
const SCAN_INIT = {
  mode: "FRQ", // FRQ | CHAN
  running: false,
  start: 1500000, step: 500000, stop: 29999999, // Hz
  dwellRssi: 100, dwellSig: 250, dwellSyll: 400, hold: 10000, // ms
  list: [{ ch: 5, tx: 24450000, rx: 24450000, mod: "J2D", sq: "RSSI" }],
  idx: 0, // selected entry of the channel list
  prio: 5, // priority channel
  lockF: [], lockC: [], // locked-out frequencies / channels
};

const LISTS = {
  sqlType: ["OFF", "RSSI", "Signal", "Syllabic", "RSSI & Syllabic", "RSSI & Signal"],
  sqlTone: SQL_TONES,
  release: ["25 ms", "150 ms", "500 ms", "1000 ms", "3000 ms", "5000 ms", "9000 ms"],
  vox: ["OFF", "LINE", "VOICE"],
  nb: ["OFF", "FLASH", "SPARKS", "ELECTRIC FENCE"],
  notch: ["OFF", "SLOW", "MEDIUM", "FAST"],
  power: POWER,
  dlm: ["OFF", "LINK MULTI", "LINK SINGLE", "LINK Y MULTI"],
  multitone: ["OFF", "ON"],
  baud: ["50", "75", "100", "150", "300", "600"],
  shift: ["42", "85", "225", "425"],
  mode: MODES,
  voxSens: ["LOWEST", "LOW", "MEDIUM", "HIGH", "HIGHEST"],
  voxHang: ["SHORT (300 ms)", "MEDIUM (600 ms)", "LONG (2 s)"],
  sqlHang: ["SHORT (300 ms)", "MEDIUM (600 ms)", "LONG (900 ms)"],
  sqlMode: ["RX", "TX", "RXTX"],
  a1aHold: ["50 ms", "100 ms", "150 ms", "200 ms", "250 ms", "300 ms", "350 ms", "400 ms", "450 ms", "500 ms"],
  rtA1A: ["25 ms", "150 ms", "500 ms", "1000 ms", "3000 ms", "5000 ms", "9000 ms"],
  rtA3E: ["25 ms", "150 ms", "500 ms", "1000 ms", "3000 ms", "5000 ms", "9000 ms"],
  rtJ3E: ["25 ms", "150 ms", "500 ms", "1000 ms", "3000 ms", "5000 ms", "9000 ms"],
  rtJ2D: ["25 ms", "150 ms", "500 ms", "1000 ms", "3000 ms", "5000 ms", "9000 ms"],
  rtB8E: ["25 ms", "150 ms", "500 ms", "1000 ms", "3000 ms", "5000 ms", "9000 ms"],
};

const fmtFreq = (hz) => `${String(Math.floor(hz / 1000)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}.${String(hz % 1000).padStart(3, "0")}`;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const clampFreq = (hz, which) => clamp(Math.round(hz), which === "tx" ? 1500000 : 0, 29999999);

// Frequency with the active step digit marked (bar above Tx / below Rx)
function FreqText({ hz, exp, line }) {
  const ints = String(Math.floor(hz / 1000));
  const parts = [];
  [...ints].forEach((d, i) => {
    const e = 3 + (ints.length - 1 - i);
    if (i > 0 && (ints.length - i) % 3 === 0) parts.push({ c: " ", e: -1 });
    parts.push({ c: d, e });
  });
  parts.push({ c: ".", e: -1 });
  [...String(hz % 1000).padStart(3, "0")].forEach((d, i) => parts.push({ c: d, e: 2 - i }));
  return (
    <span className="whitespace-pre">
      {parts.map((p, i) => (
        <span
          key={i}
          className={p.e === exp ? (line === "tx" ? "border-t-2 border-blue-700" : "border-b-2 border-blue-700") : ""}
        >
          {p.c}
        </span>
      ))}
    </span>
  );
}

const Panel = ({ title, children, bottom }) => (
  <div className={`absolute left-3 right-3 ${bottom ? "bottom-2" : "top-1/4"} border border-slate-600 bg-slate-200 p-1.5 shadow-lg z-20 text-[10px]`}>
    {title && <div className="font-bold text-center border-b border-slate-600 mb-1">{title}</div>}
    {children}
  </div>
);

export default function useFfOperation({ userLevel = 0 } = {}) {
  const [screen, setScreen] = useState(null); // "op1" | "op2"
  const [s, setS] = useState(INITIAL);
  const [channel, setChannel] = useState(101);
  const [channels, setChannels] = useState({ 101: INITIAL });
  const [overlay, setOverlay] = useState(null);
  const [fe, setFe] = useState(null); // frequency editor { buf }
  const [fmode, setFmode] = useState("RXTX"); // RXTX | TX | RX
  const [step, setStep] = useState(3);
  const [c, setC] = useState(CFG_INIT); // configuration menus
  const [sc, setSc] = useState(SCAN_INIT); // FF SCAN menus
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Scan simulation: frequency scan steps Start -> Stop, channel scan cycles the list
  // (the priority channel is visited on every second step). The radio state follows.
  useEffect(() => {
    if (!sc.running) return undefined;
    let i = -1;
    let tick = 0;
    const id = setInterval(() => {
      tick += 1;
      if (sc.mode === "FRQ") {
        setS((x) => {
          let n = x.tx + sc.step;
          if (n > sc.stop || n < sc.start) n = sc.start;
          for (let g = 0; g < 1000 && sc.lockF.includes(n); g++) {
            n += sc.step;
            if (n > sc.stop) n = sc.start;
          }
          return { ...x, tx: n, rx: n };
        });
      } else {
        const usable = sc.list.filter((e) => !sc.lockC.includes(e.ch));
        if (!usable.length) return;
        const prio = usable.find((e) => e.ch === sc.prio);
        let e;
        if (prio && tick % 2 === 0) e = prio;
        else {
          i = (i + 1) % usable.length;
          e = usable[i];
        }
        setS((x) => ({ ...x, tx: e.tx, rx: e.rx, mod: e.mod }));
      }
    }, 600);
    return () => clearInterval(id);
  }, [sc.running, sc.mode, sc.start, sc.stop, sc.step, sc.list, sc.lockF, sc.lockC, sc.prio]);

  const upd = (patch) => setS((x) => ({ ...x, ...patch }));
  const go = (sc) => {
    setOverlay(null);
    setFe(null);
    setScreen(sc);
  };
  const open = () => go("op1");
  const openCfg = () => go("cfg1");
  const openScan = () => go("scan1");
  const stopScan = () => setSc((x) => (x.running ? { ...x, running: false } : x));
  const close = () => go(null);
  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    stopScan();
    close();
  };
  const blocked = (overlay?.type === "atu" || overlay?.type === "learnrun") && overlay.state === "running";

  /* ---------- frequency ---------- */
  const stepHz = 10 ** step;
  const cycleMode = () => setFmode((m) => (m === "RXTX" ? "TX" : m === "TX" ? "RX" : "RXTX"));
  const applyFreq = (hz) => {
    stopScan(); // manual tuning ends a running scan
    setS((x) => ({
      ...x,
      ...(fmode !== "RX" ? { tx: clampFreq(hz, "tx") } : {}),
      ...(fmode !== "TX" ? { rx: clampFreq(hz, "rx") } : {}),
    }));
  };
  const baseHz = fmode === "TX" ? s.tx : s.rx;

  /* ---------- listboxes / editors ---------- */
  const getNum = (k) => (SC_NUMS.includes(k) ? sc[k] : s[k]);
  const setNum = (k, v) => (SC_NUMS.includes(k) ? setSc((x) => ({ ...x, [k]: v })) : upd({ [k]: v }));
  const listOptions = (key) =>
    key === "bw" ? bwOptions(s.mod).map(fmtBw) : key === "prio" ? ["---", ...sc.list.map((e) => String(e.ch))] : LISTS[key];
  const listCurrent = (key) => {
    if (key in CFG_INIT) return c[key];
    switch (key) {
      case "bw": return fmtBw(s.bw);
      case "release": return `${s.release} ms`;
      case "mode": return s.mod;
      case "prio": return sc.prio == null ? "---" : String(sc.prio);
      default: return s[key];
    }
  };
  const openList = (id) =>
    setOverlay({ type: "list", key: id, idx: Math.max(0, listOptions(id).indexOf(listCurrent(id))) });
  const toggleList = (id) => (overlay?.type === "list" && overlay.key === id ? setOverlay(null) : openList(id));
  const openNum = (key) => setOverlay({ type: "num", key, value: getNum(key), buf: null });

  const setMode = (m) => {
    if (c.selcal) return; // with SELCAL on the modulation cannot be changed
    setS((x) => ({ ...x, mod: m, ...defaultsFor(m, c), sqlType: sqlSupported(m) ? x.sqlType : "OFF" }));
  };

  const applyList = (key, idx) => {
    const v = listOptions(key)[idx];
    if (key in CFG_INIT) setC((x) => ({ ...x, [key]: v }));
    else if (key === "prio") setSc((x) => ({ ...x, prio: v === "---" ? null : Number(v) }));
    else if (key === "mode") setMode(v);
    else if (key === "bw") upd({ bw: bwOptions(s.mod)[idx] });
    else if (key === "release") upd({ release: parseInt(v, 10) });
    else if (key === "baud") upd({ baud: v, bw: F1D_BW[v] });
    else upd({ [key]: v });
  };

  const openChannel = (mode) => setOverlay({ type: "chan", mode, buf: String(channel) });
  const chanInfo = (n) => {
    const c = channels[n];
    if (c) return { tx: `${fmtFreq(c.tx)} kHz`, rx: `${fmtFreq(c.rx)} kHz`, mod: c.mod };
    const mm = overlay?.mode === "recall" ? maritimeMode(n) : null;
    if (mm) return { tx: "-- ---,--- kHz", rx: "-- ---,--- kHz", mod: mm };
    return { tx: "-- ---,--- kHz", rx: "-- ---,--- kHz", mod: "---" };
  };

  const startLearn = () => {
    setOverlay({ type: "learnrun", state: "running" });
    timers.current.push(setTimeout(() => setOverlay((o) => (o?.type === "learnrun" && o.state === "running" ? { type: "learnrun", state: "ok" } : o)), 4000));
  };
  const toggleEnv = () => {
    setC((x) => ({ ...x, env: x.env === "Shore" ? "Ship" : "Shore" }));
    // ship / shore swaps Rx and Tx on the predefined maritime channels
    if (channel > 400) setS((x) => ({ ...x, tx: clampFreq(x.rx, "tx"), rx: x.tx }));
  };
  const startAtu = () => {
    setOverlay({ type: "atu", state: "running" });
    timers.current.push(setTimeout(() => setOverlay((o) => (o?.type === "atu" && o.state === "running" ? null : o)), 3000));
  };

  /* ---------- FF SCAN actions ---------- */
  const toggleScan = () => {
    if (sc.running) return stopScan();
    if (sc.mode === "FRQ") setS((x) => ({ ...x, tx: sc.start, rx: sc.start }));
    return setSc((x) => ({ ...x, running: true, lockF: [], lockC: [] }));
  };
  const toggleScanMode = () => setSc((x) => ({ ...x, mode: x.mode === "FRQ" ? "CHAN" : "FRQ" }));
  const openSf = (which) => setOverlay({ type: "sfreq", which, value: sc[which], buf: null });
  const openAddChannel = () =>
    setOverlay({ type: "addch", buf: String(Math.max(0, ...sc.list.map((e) => e.ch)) + 1), typed: false });
  const lockout = () => {
    if (sc.mode === "FRQ") setSc((x) => ({ ...x, lockF: [...x.lockF, s.tx] }));
    else {
      const cur = sc.list.find((e) => e.tx === s.tx && e.rx === s.rx);
      if (cur) setSc((x) => ({ ...x, lockC: [...x.lockC, cur.ch] }));
    }
  };

  /* ---------- soft key definitions ---------- */
  const m = s.mod;
  const PREV = {
    label: "PREV", nav: true,
    action: () => (screen === "op2" ? go("op1") : screen === "cfg2" ? go("cfg1") : screen === "scan2" ? go("scan1") : close()),
  };
  const lst = (id, label, extra = {}) => ({ id, label, notch: true, action: () => toggleList(id), ...extra });
  const num = (key, label = NUMS[key].label, extra = {}) => ({
    label, notch: true, value: fmtNum(key, getNum(key)), action: () => openNum(key), ...extra,
  });
  const tgl = (label, labels, on, flip, extra = {}) => ({ label, toggle: { labels, on }, action: flip, ...extra });
  const stepLabel = STEPS[step];

  const buildDef = () => {
    if (fe) {
      return {
        left: [{ label: "PREV", nav: true, action: () => setFe(null) }],
        right: [
          {}, {},
          { label: "FREQ", toggle: { labels: ["RX", "TX"], on: fmode === "RXTX" ? "both" : fmode === "TX" }, action: cycleMode },
          {},
          { label: "STEP DOWN", value: stepLabel, action: () => setStep((x) => Math.max(0, x - 1)) },
          { label: "STEP UP", value: stepLabel, action: () => setStep((x) => Math.min(7, x + 1)) },
        ],
      };
    }
    if (overlay?.type === "sfreq") {
      return {
        left: [{ label: "PREV", nav: true, action: () => setOverlay(null) }],
        right: [
          {}, {}, {}, {},
          { label: "STEP DOWN", value: stepLabel, action: () => setStep((x) => Math.max(0, x - 1)) },
          { label: "STEP UP", value: stepLabel, action: () => setStep((x) => Math.min(7, x + 1)) },
        ],
      };
    }
    if (overlay?.type === "learn") {
      return {
        left: [PREV],
        right: [
          {}, {}, {}, {},
          { label: "STEP DOWN", value: stepLabel, action: () => setStep((x) => Math.max(0, x - 1)) },
          { label: "STEP UP", value: stepLabel, action: () => setStep((x) => Math.min(7, x + 1)) },
        ],
      };
    }
    if (screen === "cfg1") {
      return {
        left: [
          PREV,
          tgl("ENVIR", ["Shore", "Ship"], c.env === "Ship", toggleEnv),
          tgl("ATU SIL", ["ON", "OFF"], !c.atuSil, () => setC((x) => ({ ...x, atuSil: !x.atuSil }))),
          tgl("ATU Bypass", ["ON", "OFF"], !c.atuByp, () => setC((x) => ({ ...x, atuByp: !x.atuByp }))),
          tgl("SELCAL PTT", ["ON", "OFF"], !c.selcal, () => setC((x) => ({ ...x, selcal: !x.selcal })), {
            disabled: !c.selcal && s.mod !== "+J3E", // only possible in +J3E
          }),
        ],
        right: [
          { label: "NEXT", nav: true, action: () => go("cfg2") },
          {}, {}, {},
          { label: "ATU\nLearn", disabled: !HAS_ATU, action: startLearn },
        ],
        bottom: [
          { label: "Learn\nLow", notch: true, action: () => setOverlay({ type: "learn", which: "low", value: c.learnLow, buf: null }) },
          {},
          { label: "Learn\nHigh", notch: true, action: () => setOverlay({ type: "learn", which: "high", value: c.learnHigh, buf: null }) },
        ],
      };
    }
    if (screen === "cfg2") {
      const short = (k) => c[k].split(" ")[0];
      return {
        left: [
          PREV,
          lst("voxSens", "VOX SENS", { value: short("voxSens") }),
          lst("voxHang", "VOX HANG", { value: short("voxHang") }),
          lst("sqlHang", "SQL HANG", { value: short("sqlHang") }),
          lst("sqlMode", "SQL Mode", { value: c.sqlMode }),
          lst("a1aHold", "A1A-Hold"),
        ],
        right: [
          {},
          lst("rtA1A", "R-Time\nA1A"),
          lst("rtA3E", "R-Time\nA3E"),
          lst("rtJ3E", "R-Time\nJ3E"),
          lst("rtJ2D", "R-Time\nJ2D"),
          lst("rtB8E", "R-Time\nB8E"),
        ],
      };
    }
    const freqKey = {
      label: "FREQ", notch: true, lock: 1,
      action: () => setFe({ buf: null }),
    };
    const modeKey = lst("mode", "MODE", { value: m, disabled: c.selcal, lock: 1 });
    const recall = { label: "Channel\nRecall", notch: true, action: () => openChannel("recall") };

    if (screen === "scan1") {
      const frq = sc.mode === "FRQ";
      const sqlOn = sqlSupported(m);
      const hasSyll = ["A3E", "F3E", "R3E", "H3E", "+J3E", "-J3E"].includes(m);
      const hasTone = ["A3E", "F3E", "R3E", "H3E"].includes(m);
      const canChan = sc.list.length >= 2; // a channel scan needs at least two channels
      const scanKey = { label: sc.running ? "SCAN\nSTOP" : "SCAN\nSTART", action: toggleScan };
      return {
        left: frq
          ? [
              PREV,
              { label: "Channel\nStore", notch: true, action: () => openChannel("store") },
              hasSyll ? num("syll", "Syll. Thres") : {},
              hasTone ? lst("sqlTone", "SQL Tone", { value: `${s.sqlTone}Hz` }) : {},
              sqlOn ? num("rssi", "RSSI Thres") : {},
              sqlOn ? lst("sqlType", "Squelch", { value: s.sqlType }) : {},
            ]
          : [PREV],
        right: [
          { label: "NEXT", nav: true, action: () => go("scan2") },
          tgl("Scan Mode", ["FRQ", "CHAN"], !frq, toggleScanMode, { disabled: sc.running }),
          frq || canChan || sc.running ? scanKey : { label: "SCAN", value: "---", disabled: true },
          { label: "SCAN", value: "---", disabled: true },
          frq ? lst("mode", "MODE", { value: m, disabled: c.selcal || sc.running }) : {},
          { label: frq ? "Lockout\nFrequency" : "Lockout\nChannel", disabled: !sc.running, action: lockout },
        ],
        bottom: frq
          ? [
              { label: "Start (kHz)", value: fmtFreq(sc.start), notch: true, disabled: sc.running, action: () => openSf("start") },
              { label: "Step (kHz)", value: fmtFreq(sc.step), notch: true, disabled: sc.running, action: () => openSf("step") },
              { label: "Stop (kHz)", value: fmtFreq(sc.stop), notch: true, disabled: sc.running, action: () => openSf("stop") },
            ]
          : [
              {}, {},
              lst("prio", "Prio Chan", { value: sc.prio == null ? "---" : String(sc.prio), disabled: !sc.list.length }),
            ],
      };
    }
    if (screen === "scan2") {
      return {
        left: [
          PREV,
          num("dwellRssi", "Dwell Time\nRSSI Sq", { value: undefined }),
          num("dwellSig", "Dwell Time\nSignal Sq", { value: undefined }),
          num("dwellSyll", "Dwell Time\nSyll Sq", { value: undefined }),
          {},
          num("hold", "Hold Time", { value: undefined }),
        ],
        right: [
          {}, {}, {}, {},
          { label: "Delete\nPrio Chan", disabled: sc.prio == null, action: () => setSc((x) => ({ ...x, prio: null })) },
          { label: "Delete\nChannel List", notch: true, disabled: !sc.list.length, action: () => setOverlay({ type: "confirm", what: "list" }) },
        ],
        bottom: [
          { label: "Add\nChannel", notch: true, action: openAddChannel },
          { label: "Delete\nChannel", notch: true, disabled: !sc.list.length, action: () => setOverlay({ type: "confirm", what: "channel" }) },
          lst("prio", "Prio Chan", { value: sc.prio == null ? "---" : String(sc.prio), disabled: !sc.list.length }),
        ],
      };
    }

    if (screen === "op1") {
      const sqlOn = sqlSupported(m);
      const hasSyll = ["A3E", "F3E", "R3E", "H3E", "+J3E", "-J3E"].includes(m);
      const hasTone = ["A3E", "F3E", "R3E", "H3E"].includes(m);
      const clarActive = ["A1A", "R3E", "H3E", "+J3E", "-J3E"].includes(m);
      return {
        left: [
          PREV,
          { label: "Channel\nStore", notch: true, lock: 1, action: () => openChannel("store") },
          hasSyll ? num("syll", "Syll. Thres") : {},
          hasTone ? lst("sqlTone", "SQL Tone", { value: `${s.sqlTone}Hz`, lock: 1 }) : {},
          sqlOn ? num("rssi", "RSSI Thres") : {},
          sqlOn ? lst("sqlType", "Squelch", { value: s.sqlType }) : {},
        ],
        right: [
          { label: "NEXT", nav: true, action: () => go("op2") },
          recall,
          freqKey,
          num("clarif", "CLARIF", { disabled: !clarActive }),
          modeKey,
          lst("bw", "BW", { value: fmtBw(s.bw), disabled: m === "F1D" }),
        ],
        bottom: [
          hasAgc(m) ? tgl("RF/IF Gain", ["AGC", "MGC"], !s.agc, () => upd({ agc: !s.agc }), { lock: 1 }) : {},
          hasAgc(m)
            ? s.agc
              ? num("agcThr", "AGC\nThreshold", { value: undefined, lock: 1 })
              : num("mgc", "MGC\nLevel", { value: undefined, lock: 1 })
            : {},
          tgl("Preamp", ["OFF", "ON"], s.preamp, () => upd({ preamp: !s.preamp })),
        ],
      };
    }

    // op2
    const voice = ["A3E", "R3E", "H3E", "F3E", "+J3E", "-J3E"].includes(m);
    const left = [PREV];
    if (voice) {
      left.push(
        lst("vox", "VOX", { value: s.vox }),
        tgl("VC", ["ON", "OFF"], !s.vc, () => upd({ vc: !s.vc })),
        lst("nb", "NB Type", { value: s.nb }),
        m !== "F3E" ? lst("release", "Release\nTime") : {},
        isJ3E(m) ? lst("notch", "Notch", { value: s.notch }) : {}
      );
    } else if (m === "A1A" || m === "B8E") {
      left.push({}, {}, {}, lst("release", "Release\nTime"));
    } else if (m === "B7D" || isJ2D(m)) {
      left.push(
        lst("dlm", "DLM", { value: s.dlm === "OFF" ? "off" : s.dlm }),
        num("pep", "PEP / PAvg"),
        lst("multitone", "Multitone M.", { value: s.multitone === "OFF" ? "off" : s.multitone, disabled: !HAS_MULTITONE }),
        lst("release", "Release\nTime")
      );
    } else if (m === "F1D") {
      left.push(
        lst("baud", "BAUD", { value: s.baud }),
        lst("shift", "Shift", { value: `${s.shift}Hz` }),
        tgl("POL RX", ["-", "+"], s.polRx === "+", () => upd({ polRx: s.polRx === "+" ? "-" : "+" })),
        tgl("POL TX", ["-", "+"], s.polTx === "+", () => upd({ polTx: s.polTx === "+" ? "-" : "+" })),
        tgl("TTY", ["STOP", "RUN"], s.run, () => upd({ run: !s.run }))
      );
    }
    const hasBfo = m === "A1A" || m === "F1D";
    const hasDelta = m === "B7D" || isJ2D(m) || m === "F1D";
    return {
      left,
      right: [
        {},
        recall,
        freqKey,
        hasBfo ? num("bfo", "BFO") : {},
        modeKey,
        { label: "ATU\nTune", disabled: !HAS_ATU, action: startAtu },
      ],
      bottom: [
        m !== "B7D" && m !== "B8E" ? num("pbt", "PBT") : {},
        hasDelta ? num("delta", "Delta FREQ") : {},
        lst("power", "Power", { value: s.power }),
      ],
    };
  };

  /* ---------- central area ---------- */
  const dfScale =
    m === "F3E" || isJ2D(m) ? ["-2.0", "0", "2.0", "kHz"]
    : m === "F1D" ? ["-400", "0", "400", "Hz"]
    : m === "B7D" || m === "B8E" ? null
    : ["-100", "0", "100", "Hz"];

  const rssiDb = 12;
  const renderBody = () => {
    if (screen === "scan2") {
      const cur = sc.list[sc.idx];
      const n = sc.list.length;
      return (
        <div className="h-full flex flex-col text-[10px] text-slate-800 -m-1">
          <table className="w-full leading-[14px]">
            <thead>
              <tr>
                <th className="text-left font-bold" colSpan={2}>Dwell Times</th>
                <th className="text-right font-bold">Hold Time</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="w-16">RSSI Sq:</td>
                <td className="text-blue-700 w-16">{sc.dwellRssi} ms</td>
                <td className="text-blue-700 text-right">{sc.hold} ms</td>
              </tr>
              <tr><td>Signal Sq:</td><td className="text-blue-700">{sc.dwellSig} ms</td><td /></tr>
              <tr><td>Syll Sq:</td><td className="text-blue-700">{sc.dwellSyll} ms</td><td /></tr>
            </tbody>
          </table>

          <div className="mt-2 flex justify-between bg-blue-700 text-white px-0.5">
            <span>Channel List:</span>
            <span>{cur ? `CH ${cur.ch} - ${sc.idx + 1}/${n}` : "CH --- - 0/0"}</span>
          </div>
          <div className="grow relative flex border-x border-b border-slate-300 min-h-0">
            <div className="grow leading-[14px] px-0.5">
              {cur ? (
                <>
                  <div>
                    Tx: <span className="text-blue-700 mx-1">{cur.tx} Hz</span> Mod: <span className="text-blue-700">{cur.mod}</span>
                  </div>
                  <div>
                    Rx: <span className="text-blue-700 mx-1">{cur.rx} Hz</span>
                  </div>
                  <div>
                    Sq Type: <span className="text-blue-700">{cur.sq}</span>
                  </div>
                </>
              ) : (
                <div className="text-slate-400">empty</div>
              )}
            </div>
            <div className="w-2 bg-slate-100 border-l border-slate-300 relative">
              <div
                className="absolute left-0 right-0 bg-slate-400"
                style={{ height: `${100 / Math.max(1, n)}%`, top: `${(sc.idx * 100) / Math.max(1, n)}%` }}
              />
            </div>
          </div>
        </div>
      );
    }
    if (screen === "cfg1" || screen === "cfg2") {
      const kHz = (hz) => `${fmtFreq(hz)} kHz`;
      const rows =
        screen === "cfg1"
          ? [["Learn high:", kHz(c.learnHigh)], ["Learn low:", kHz(c.learnLow)], ["Tx Frequency:", kHz(s.tx)]]
          : [
              ["Release Time A1A:", c.rtA1A], ["Release Time A3E:", c.rtA3E], ["Release Time J3E:", c.rtJ3E],
              ["Release Time J2D:", c.rtJ2D], ["Release Time B8E:", c.rtB8E], ["", ""], ["A1A-Hold Time:", c.a1aHold],
            ];
      return (
        <table className="text-[10px] leading-[15px] w-full"><tbody>
          {rows.map(([k, v], i) => (
            <tr key={i}><td className="pr-2 whitespace-nowrap">{k}</td><td className="text-blue-700 text-right whitespace-nowrap">{v}</td></tr>
          ))}
        </tbody></table>
      );
    }
    const hl = (line) =>
      fe && (fmode === "RXTX" || fmode === line.toUpperCase()) ? "bg-blue-700 text-white" : "text-blue-700";
    const exp = step; // the bar marks the selected step digit
    return (
      <div className="h-full flex flex-col text-[10px] text-slate-800">
        {/* Tx / Rx frequency (same typography as the Home screen) */}
        {[["Tx", "tx", s.tx], ["Rx", "rx", s.rx]].map(([label, line, hz]) => (
          <div key={line} className="flex items-baseline">
            <span className="w-6">{label}:</span>
            <span className={`font-digital text-[22px] leading-6 px-0.5 ${hl(line)}`}>
              <FreqText hz={hz} exp={exp} line={line} />
            </span>
            <span className="ml-1 text-[9px] text-blue-700">kHz</span>
          </div>
        ))}

        {/* Modulation / scan state */}
        <div className="flex items-end gap-2 mt-1">
          <div className="leading-snug">
            <div>Modulation:</div>
            <div>Scan State:</div>
          </div>
          <div className="leading-snug">
            <div className="text-[20px] leading-5 text-blue-700">{c.selcal ? "Selcal +J3E" : m}</div>
            <div className="text-blue-700">{sc.running ? "active" : "inactive"}</div>
          </div>
        </div>

        <div className="mt-auto">
          {/* ΔF scale */}
          {dfScale && (
            <div className="flex items-end gap-1">
              <span className="text-[9px] w-6">ΔF</span>
              <div className="grow">
                <div className="flex justify-between text-[8px] leading-none text-slate-700">
                  {dfScale.slice(0, 3).map((t) => <span key={t}>{t}</span>)}
                  <span>{dfScale[3]}</span>
                </div>
                <div className="relative h-2 border-b border-slate-700">
                  <span className="absolute left-1/2 -translate-x-1/2 top-0 w-0.5 h-2 bg-blue-700" />
                </div>
              </div>
            </div>
          )}

          {/* RF level */}
          <div className="flex items-end gap-1 mt-1.5">
            <span className="text-[8px] leading-tight w-6">
              RF<br />LEVEL
              {hasAgc(m) && <div className="text-blue-700">{s.agc ? "AGC" : "MGC"}</div>}
            </span>
            <div className="grow">
              <div className="h-2 border border-slate-400 bg-slate-100 relative">
                <div className="h-full bg-green-500" style={{ width: `${(rssiDb / 120) * 100}%` }} />
              </div>
              <div className="flex justify-between text-[8px] leading-none text-slate-700">
                <span>0</span><span>30</span><span>60</span><span>90</span><span>dBµV</span>
              </div>
            </div>
          </div>
          {hasAgc(m) && <div className="text-center text-blue-700 text-[9px]">RT: {s.release} ms</div>}
        </div>
      </div>
    );
  };

  const numText = (o) => {
    const sp = NUMS[o.key];
    return o.buf !== null ? o.buf || "0" : sp.dec ? Number(o.value).toFixed(sp.dec) : String(o.value);
  };
  const renderOverlay = () => {
    if (fe && !overlay) {
      const shown = fe.buf !== null ? fe.buf : fmtFreq(fmode === "RX" ? s.rx : s.tx);
      return (
        <Panel bottom>
          <div className="flex items-center justify-center gap-1">
            <span className="bg-white border border-slate-500 px-2 font-mono text-[11px]">{shown}</span> kHz
          </div>
        </Panel>
      );
    }
    if (!overlay) return null;
    switch (overlay.type) {
      case "pwd":
        return <PasswordPanel o={overlay} className="absolute left-0 right-0 top-[5.4rem] z-20" />;
      case "num": {
        const sp = NUMS[overlay.key];
        return (
          <Panel title={sp.label}>
            <span className="bg-white border border-slate-500 px-1"><span className="bg-blue-700 text-white px-0.5">{numText(overlay)}</span></span> {sp.unit}
          </Panel>
        );
      }
      case "chan": {
        const n = Number(overlay.buf) || 0;
        const info = chanInfo(n);
        return (
          <Panel title={overlay.mode === "store" ? "Channel Store" : "Channel Recall"}>
            <div className="flex gap-3">
              <span className="bg-white border border-slate-500 px-2 h-4 w-14 text-right font-mono">{overlay.buf}</span>
              <div className="leading-tight">
                <div className="font-bold">Stored Values:</div>
                <div>Tx: {info.tx}</div>
                <div>Rx: {info.rx}</div>
                <div>Mod.: {info.mod}</div>
              </div>
            </div>
          </Panel>
        );
      }
      case "learn": {
        const shown = overlay.buf !== null ? overlay.buf : fmtFreq(overlay.value);
        return (
          <Panel bottom title={overlay.which === "low" ? "Learn Low" : "Learn High"}>
            <div className="flex items-center justify-center gap-1">
              <span className="bg-white border border-slate-500 px-2 font-mono text-[11px]">{shown}</span> kHz
            </div>
          </Panel>
        );
      }
      case "sfreq": {
        const shown = overlay.buf !== null ? overlay.buf : fmtFreq(overlay.value);
        const title = { start: "Start (kHz)", step: "Step (kHz)", stop: "Stop (kHz)" }[overlay.which];
        return (
          <Panel bottom title={title}>
            <div className="flex items-center justify-center gap-1">
              <span className="bg-white border border-slate-500 px-2 font-mono text-[11px]">{shown}</span> kHz
            </div>
          </Panel>
        );
      }
      case "addch":
        return (
          <Panel title="Add Channel">
            <div className="flex gap-3">
              <span className="bg-white border border-slate-500 px-2 h-4 w-14 text-right font-mono">{overlay.buf}</span>
              <div className="leading-tight">
                <div className="font-bold">Actual Values:</div>
                <div>Tx: {fmtFreq(s.tx)} kHz</div>
                <div>Rx: {fmtFreq(s.rx)} kHz</div>
                <div>Mod.: {s.mod}</div>
              </div>
            </div>
          </Panel>
        );
      case "confirm":
        return (
          <Panel title={overlay.what === "list" ? "Delete Channel List" : "Delete Channel"}>
            <div>
              {overlay.what === "list"
                ? "Delete all channels of the scan list?"
                : `Delete channel ${sc.list[sc.idx]?.ch} from the scan list?`}
            </div>
            <div className="text-right mt-2">Press ENT to confirm...</div>
          </Panel>
        );
      case "learnrun":
        return (
          <Panel title={<span className={overlay.state === "failed" ? "text-red-600" : ""}>Learn Status</span>}>
            <div>{overlay.state === "running" ? "Learn in progress" : overlay.state === "ok" ? "Learn ok" : "✖ Learn failed"}</div>
            {overlay.state !== "running" && <div className="text-right mt-2">Press ENT to confirm...</div>}
          </Panel>
        );
      case "atu":
        return (
          <Panel title="Tune Status">
            <div>{overlay.state === "running" ? "Tune in progress" : overlay.state === "aborted" ? "Tune aborted" : "Tune failed"}</div>
            {overlay.state !== "running" && <div className="text-right mt-2">Press ENT to confirm...</div>}
          </Panel>
        );
      default:
        return null;
    }
  };

  /* ---------- user input ---------- */
  const softKey = (side, index) => {
    if (!screen || blocked) return;
    if (overlay && overlay.type !== "list" && overlay.type !== "learn" && overlay.type !== "sfreq") return;
    const item = (buildDef()[side] || [])[index];
    if (!item || item.disabled || !item.action) {
      if (overlay) setOverlay(null);
      return;
    }
    // Locked softkey (needs a higher level than the system-wide user level):
    // ask for the password. It unlocks this ONE action only and does not change the user level.
    const reopening = overlay?.type === "list" && item.id && item.id === overlay.key;
    if (item.lock > userLevel && !reopening) {
      setOverlay(newPasswordEditor({ mode: "unlock", need: item.lock, run: item.action }));
      return;
    }
    if (overlay?.type === "list" && !(item.id && item.id === overlay.key)) setOverlay(null);
    item.action();
  };

  const keypad = (key) => {
    if (blocked) return;
    if (overlay?.type === "pwd") {
      setOverlay((o) => pwdKeypad(o, key));
      return;
    }
    const isDigit = /^[0-9]$/.test(String(key));
    if (overlay?.type === "num") {
      const sp = NUMS[overlay.key];
      setOverlay((o) => {
        let buf = o.buf;
        if (isDigit) buf = (buf ?? "") + key;
        else if (key === "." && sp.dec > 0) buf = buf && !buf.includes(".") ? buf + "." : buf ? buf : "0.";
        else if (key === "+/-" && sp.min < 0) buf = (buf ?? "").startsWith("-") ? (buf ?? "").slice(1) : "-" + (buf ?? "");
        else return o;
        const v = parseFloat(buf);
        return { ...o, buf, value: Number.isNaN(v) ? 0 : v };
      });
    } else if (overlay?.type === "learn" || overlay?.type === "sfreq") {
      if (isDigit || key === ".")
        setOverlay((o) => {
          const b = o.buf ?? "";
          return key === "." && b.includes(".") ? o : { ...o, buf: b + key };
        });
    } else if (overlay?.type === "chan" || overlay?.type === "addch") {
      if (isDigit) setOverlay((o) => ({ ...o, buf: (o.typed ? o.buf : "") + key, typed: true }));
    } else if (fe) {
      if (isDigit || key === ".") {
        setFe((f) => {
          const b = f.buf ?? "";
          if (key === "." && b.includes(".")) return f;
          return { buf: b + key };
        });
      }
    } else if (!overlay && screen) {
      // Smart Frequency Editor keys
      if (key === "0") cycleMode();
      else if (key === "+/-") setStep((x) => Math.min(7, x + 1));
      else if (key === ".") setStep((x) => Math.max(0, x - 1));
    }
  };

  const enter = () => {
    if (blocked) return;
    if (fe && !overlay) {
      if (fe.buf !== null && fe.buf !== "") {
        const hz = Math.round(parseFloat(fe.buf) * 1000);
        if (!Number.isNaN(hz)) applyFreq(hz);
      }
      return setFe(null);
    }
    if (!overlay) return;
    switch (overlay.type) {
      case "list":
        applyList(overlay.key, overlay.idx);
        return setOverlay(null);
      case "num": {
        const sp = NUMS[overlay.key];
        let v = clamp(overlay.value, sp.min, sp.max);
        if (sp.step >= 1) v = Math.round(v / sp.step) * sp.step;
        setNum(overlay.key, Number(v.toFixed(sp.dec)));
        return setOverlay(null);
      }
      case "chan": {
        const n = Number(overlay.buf);
        if (overlay.mode === "store") {
          if (n < 1 || n > 400) return;
          setChannels((c) => ({ ...c, [n]: { ...s } }));
          setChannel(n);
          return setOverlay(null);
        }
        if (channels[n]) {
          setS({ ...channels[n] });
          setChannel(n);
          return setOverlay(null);
        }
        const mm = maritimeMode(n);
        if (mm) {
          setMode(mm);
          setChannel(n);
          return setOverlay(null);
        }
        return; // unused channel: stay in the editor
      }
      case "learn": {
        let hz = overlay.value;
        if (overlay.buf) {
          const v = Math.round(parseFloat(overlay.buf) * 1000);
          if (!Number.isNaN(v)) hz = v;
        }
        const low = overlay.which === "low" ? hz : c.learnLow;
        const high = overlay.which === "high" ? hz : c.learnHigh;
        // the lower learn frequency has to be lower than the higher one, other inputs are rejected
        if (hz >= 1500000 && hz <= 29999999 && low < high)
          setC((x) => ({ ...x, learnLow: low, learnHigh: high }));
        return setOverlay(null);
      }
      case "pwd": {
        const run = overlay.run;
        const ok = passwordLevel(overlay.text) >= overlay.need;
        setOverlay(null);
        if (ok && run) run(); // wrong password: the action is not started
        return;
      }
      case "sfreq": {
        let hz = overlay.value;
        if (overlay.buf) {
          const v = Math.round(parseFloat(overlay.buf) * 1000);
          if (!Number.isNaN(v)) hz = v;
        }
        const w = overlay.which;
        const next = { ...sc, [w]: hz };
        const ok = w === "step" ? hz >= 1 && hz <= 28499999 : hz >= 1500000 && hz <= 29999999 && next.start < next.stop;
        if (ok) setSc((x) => ({ ...x, [w]: hz }));
        return setOverlay(null);
      }
      case "addch": {
        const n = Number(overlay.buf);
        if (n < 1 || n > 400 || sc.list.some((e) => e.ch === n)) return; // stay in the editor
        const list = [...sc.list, { ch: n, tx: s.tx, rx: s.rx, mod: s.mod, sq: s.sqlType }].sort((a, b) => a.ch - b.ch);
        setSc((x) => ({ ...x, list, idx: list.findIndex((e) => e.ch === n) }));
        return setOverlay(null);
      }
      case "confirm": {
        if (overlay.what === "list") setSc((x) => ({ ...x, list: [], idx: 0, prio: null, running: false }));
        else
          setSc((x) => {
            const gone = x.list[x.idx];
            const list = x.list.filter((_, i) => i !== x.idx);
            return {
              ...x,
              list,
              idx: Math.max(0, Math.min(x.idx, list.length - 1)),
              prio: gone && x.prio === gone.ch ? null : x.prio,
              running: x.mode === "CHAN" && list.length < 2 ? false : x.running,
            };
          });
        return setOverlay(null);
      }
      case "learnrun":
        return setOverlay(null);
      case "atu":
        return setOverlay(null);
      default:
        return;
    }
  };

  const esc = () => {
    if (overlay?.type === "atu" && overlay.state === "running") {
      timers.current.forEach(clearTimeout);
      return setOverlay({ type: "atu", state: "aborted" });
    }
    if (overlay?.type === "learnrun" && overlay.state === "running") {
      timers.current.forEach(clearTimeout);
      return setOverlay({ type: "learnrun", state: "failed" }); // aborted with ESC/CLR
    }
    if (overlay?.type === "pwd") return setOverlay((o) => pwdClear(o)); // ESC / CLR
    if (overlay) return setOverlay(null);
    if (fe) return setFe(null);
    if (screen === "op2") go("op1");
    else if (screen === "cfg2") go("cfg1");
    else if (screen === "scan2") go("scan1");
    else close();
  };
  const homeKey = () => {
    if (!blocked) close();
  };

  /* ---------- knob ---------- */
  let knob;
  if (overlay?.type === "pwd") knob = pwdKnobSpec(overlay);
  else if (overlay?.type === "list") knob = { value: overlay.idx, min: 0, max: listOptions(overlay.key).length - 1 };
  else if (overlay?.type === "num") {
    const sp = NUMS[overlay.key];
    knob = { value: Math.round(overlay.value / sp.step), min: Math.round(sp.min / sp.step), max: Math.round(sp.max / sp.step) };
  } else if (overlay?.type === "learn")
    knob = { value: Math.round(overlay.value / stepHz), min: Math.ceil(1500000 / stepHz), max: Math.floor(29999999 / stepHz) };
  else if (overlay?.type === "chan") knob = { value: Number(overlay.buf) || 1, min: 1, max: overlay.mode === "store" ? 400 : 25040 };
  else if (overlay?.type === "sfreq") knob = { value: Math.round(overlay.value / stepHz), min: 0, max: Math.floor(29999999 / stepHz) };
  else if (overlay?.type === "addch") knob = { value: Number(overlay.buf) || 1, min: 1, max: 400 };
  else if (overlay) knob = { value: 0, min: 0, max: 1 };
  else if (screen === "scan2") knob = { value: sc.idx, min: 0, max: Math.max(0, sc.list.length - 1) }; // scroll the channel list
  else knob = { value: Math.round(baseHz / stepHz), min: 0, max: Math.floor(29999999 / stepHz) }; // SFE / frequency editor

  const onKnob = (val) => {
    if (blocked) return;
    if (overlay) {
      setOverlay((o) => {
        if (o.type === "pwd") return pwdKnob(o, val);
        if (o.type === "list") return { ...o, idx: val };
        if (o.type === "num") {
          const sp = NUMS[o.key];
          return { ...o, value: Number((val * sp.step).toFixed(sp.dec)), buf: null };
        }
        if (o.type === "chan" || o.type === "addch") return { ...o, buf: String(val), typed: false };
        if (o.type === "sfreq") return { ...o, value: clamp(val * stepHz, 0, 29999999), buf: null };
        if (o.type === "learn") return { ...o, value: clamp(val * stepHz, 1500000, 29999999), buf: null };
        return o;
      });
      return;
    }
    if (screen === "scan2") {
      setSc((x) => ({ ...x, idx: clamp(val, 0, Math.max(0, x.list.length - 1)) }));
      return;
    }
    if (!fe && userLevel < 1) return; // tuning is locked at user level 0 until FREQ is unlocked
    applyFreq(val * stepHz); // only knob changes are effective immediately
    if (fe) setFe({ buf: null });
  };

  /* ---------- menu object ---------- */
  let menu = null;
  if (screen) {
    const def = buildDef();
    const pad = (arr, n) => Array.from({ length: n }, (_, i) => arr[i] || {});
    const decorate = (raw) => {
      const item = raw.lock > userLevel ? { ...raw, locked: true } : raw; // lock symbol (Figure 3.69)
      return overlay?.type === "list" && item.id && item.id === overlay.key
        ? { ...item, popup: { options: listOptions(item.id), index: overlay.idx } }
        : item;
    };
    menu = {
      title: { op1: "1111 FF OP 1/2", op2: "1112 FF OP 2/2", cfg1: "1121 FF CFG 1/2", cfg2: "1122 FF CFG 2/2", scan1: "1115 FF SCAN 1/2", scan2: "1125 FF SCAN 2/2" }[screen],
      icon: "ff",
      ch: screen.startsWith("op") ? `CH: ${channel}` : undefined,
      left: pad(def.left, 6).map(decorate),
      right: pad(def.right, 6).map(decorate),
      bottom: def.bottom ? pad(def.bottom, 3).map(decorate) : null,
      body: (<>{renderBody()}{renderOverlay()}</>),
    };
  }

  return {
    active: screen !== null, menu, knob, open, openCfg, openScan, scanning: sc.running, stopScan, close, reset, softKey, keypad, enter, esc, homeKey, onKnob,
    knobPress: enter,
  };
}
