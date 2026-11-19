import React, { useState, useEffect, useRef } from "react";

/* ------------------------------------------------------------------ *
 *  Radio Maintenance (manual sect. 3.4)
 *
 *  3001 Radio MTC 1/7    3011 Error List     3012 Error Details
 *                        3021 Inventory      3022 Inventory Details
 *                        3031 PMU
 *                        3041 Split Site 1/2 3042 Split Site 2/2
 *  3002 Radio MTC 2/7    3061 VoIP 1/2       3062 VoIP 2/2
 *  3003 Radio MTC 3/7    3004 Radio MTC 4/7 (option keys)
 *  3005 Radio MTC 5/7    3006 Radio MTC 6/7  3007 Radio MTC 7/7
 * ------------------------------------------------------------------ */

// The manual requires the control unit to be connected to the radio.
export const RADIO_REQUIRES_CONNECTION = false;
// Hardware options. Set to false to see the keys greyed out / hidden.
const HAS_DIGSEL = true; // digital selection built in (3001)
const HAS_PMU = true; // radio connected to a PMU (3001 "PMU" key)
const IS_GV4190 = true; // PMU Mode only changeable at R&S GV4190 (3031)
const HAS_DSC = true; // DSC module present (3003)

const sdtList = [...Array(27).keys()].map((i) => `${i} dB`).concat("OFF");
const LISTS = {
  osc: ["INT", "EXT 1 MHz", "EXT 5 MHz", "EXT 10 MHz"],
  digSel: ["BYPASS", "SCAN MODE", "SELECTIVE"],
  digAt: ["0 dB", "20 dB"],
  postSel: ["SELECTIVE", "BYPASS", "SCAN MODE"],
  sdt: sdtList,
  baud: [
    "115200 baud", "57600 baud", "56000 baud", "48000 baud", "38400 baud", "19200 baud",
    "14400 baud", "9600 baud", "7200 baud", "5400 baud", "4800 baud", "3600 baud",
  ],
  flow: ["NONE", "RTS/CTS"],
  params: ["8N1", "8N2", "8E1", "8E2", "8O1", "8O2", "7N1", "7N2", "7E1", "7E2", "7O1", "7O2"],
  smode: ["ASYNC", "SYNC"],
  dcd: ["HF DETECTION", "DATA WRAPPING"],
  dscMode: ["OFF", "ATTENTION", "ON"],
  voipMode: ["OFF", "ED137+SIP", "ED137B only"],
  pmuMode: ["00", "01", "02", "10", "11", "12", "20", "21", "22", "13", "23", "33", "43"],
};

// Numeric editors
const dB = { min: -10, max: 10, step: 0.1, dec: 1, unit: "dB" };
const NUMS = {
  linUsbIn: { ...dB, label: "USB LIN in" },
  linUsbOut: { ...dB, label: "USB LIN out" },
  linLsbIn: { ...dB, label: "LSB LIN in" },
  linLsbOut: { ...dB, label: "LSB LIN out" },
  dscIn: { ...dB, label: "DSC LIN in" },
  dscOut: { ...dB, label: "DSC LIN out" },
  rtpStart: { label: "Start RTP Port", min: 0, max: 65535, step: 1, dec: 0, unit: "" },
  rtpEnd: { label: "End RTP Port", min: 0, max: 65535, step: 1, dec: 0, unit: "" },
  jitter: { label: "Jitter Buffer", min: 0, max: 200, step: 20, dec: 0, unit: "ms" },
};
const fmtNum = (key, v) => {
  const s = NUMS[key];
  return `${s.dec ? Number(v).toFixed(s.dec) : v}${s.unit ? " " + s.unit : ""}`;
};

const TITLES = {
  rm1: "3001 Radio MTC 1/7",
  rmErr: "3011 Radio Error List",
  rmErrDet: "3012 Radio Error Detail",
  rmInv: "3021 Radio Inventory",
  rmInvDet: "3022 Radio Inv. Details",
  pmu: "3031 PMU",
  ss1: "3041 Split Site 1/2",
  ss2: "3042 Split Site 2/2",
  rm2: "3002 Radio MTC 2/7",
  voip1: "3061 VoIP 1/2",
  voip2: "3062 VoIP 2/2",
  rm3: "3003 Radio MTC 3/7",
  rm4: "3004 Radio MTC 4/7",
  rm5: "3005 Radio MTC 5/7",
  rm6: "3006 Radio MTC 6/7",
  rm7: "3007 Radio MTC 7/7",
};
const PREV_TO = {
  rm1: null, rmErr: "rm1", rmErrDet: "rmErr", rmInv: "rm1", rmInvDet: "rmInv", pmu: "rm1",
  ss1: "rm1", ss2: "ss1", rm2: "rm1", voip1: "rm2", voip2: "voip1", rm3: "rm2", rm4: "rm3",
  rm5: "rm4", rm6: "rm5", rm7: "rm6",
};
const NEXT_TO = { rm1: "rm2", rm2: "rm3", rm3: "rm4", rm4: "rm5", rm5: "rm6", rm6: "rm7", ss1: "ss2", voip1: "voip2" };

/* ---------------- sample data (from the manual figures) ---------------- */
const ERRS = [
  ["PPC", "INIT IPOA ERROR"], ["PS", "MAIN"], ["DSPX", "WRONG APP1 VERS"], ["SYNTH", "WRONG CPLD VERS"],
  ["MB", "+3.3V"], ["MB", "+3.3V AFP"], ["MB", "+5V INT"], ["MB", "+5V ANALOG"],
  ["MB", "+12V"], ["MB", "-12V"], ["FE", "TEMP HIGH"], ["PS", "FAN"],
].map(([dev, desc], i) => ({
  no: i,
  dev,
  desc,
  type: i === 3 || i === 10 ? "WARNING" : "ERROR",
  faultId: 648 + i * 7,
  test: ["CBIT", "PBIT", "CBIT", "PBIT START"][i % 4],
  initial: `2011.05.05 16:13:${String(39 + i).padStart(2, "0")}`,
  end: "-",
  count: 1,
}));

const MODULES = ["FSW", "MB", "DSC", "DSP1", "E2ATU", "E2PA", "FE", "PS"].map((name) => ({ name, status: "OK" }));
const MOD_DETAILS = {
  MB: ["MB", "2", "6119.1653.02", "0", "01.02", "100059", "2008.07.23", "0", "01.00", "MOTHERBOARD"],
  DSP1: ["DSP1", "3", "6119.1700.02", "0", "01.01", "100112", "2008.07.24", "0", "01.00", "DSP BOARD 1"],
  FE: ["FE", "5", "6119.1750.02", "0", "01.03", "100207", "2008.07.25", "0", "01.00", "FRONT END"],
  PS: ["PS", "6", "6119.1800.02", "0", "01.00", "100305", "2008.07.25", "0", "01.00", "POWER SUPPLY"],
}; // other modules: no details available -> "---" (Figure 3.37)
const FW = [
  ["SW", "XXX/01.72.07/AB_FIX"], ["FW", "MPC.FPGA: 76.21"], ["FW", "DSP1.BOOT: 03.03"], ["FW", "DSP1.APP1: 01.29"],
  ["FW", "DSP1.APP2: 02.57"], ["FW", "DSP1.APP3: 09.27"], ["FW", "DSP1.APP4: 03.13"], ["FW", "DSP2.APP1: 02.29"],
  ["FW", "DSP2.APP2: 02.57"], ["FW", "DSP2.APP3: 09.27"], ["FW", "SYNTH.CPLD: 01.04"],
];

const mkKey = (seed) => {
  let x = seed * 9301 + 49297;
  let s = "";
  for (let i = 0; i < 30; i++) {
    x = (x * 233280 + 49297) % 2147483647;
    s += x % 10;
  }
  return s;
};
const INITIAL_KEYS = {
  valid: [
    ["HF-MODEM", "082763034204617486710396118462"], ["SECOMH"], ["ALE-2G"], ["LINK_SW"], ["SEL_LV_CTL_PA"],
    ["POUT_CE_CONFORM"], ["ALE-3G"], ["4285"], ["FULL_FRQ"],
  ].map(([name, key], i) => ({ name, key: key || mkKey(i + 2) })),
  invalid: [{ name: "4285", key: mkKey(40) }, { name: "4285", key: mkKey(41) }],
  resp: [{ name: "4285", key: mkKey(42) }],
};
const FOLDERS = [["valid", "Valid\nOption Key"], ["invalid", "Invalid\nOption Key"], ["resp", "Response\nOption Key"]];

const INITIAL_SS = {
  rx: [
    { ip: [172, 29, 108, 122], name: "Split Site RX 1" },
    { ip: [172, 29, 108, 124], name: "Split Site RX 2" },
    { ip: [172, 29, 108, 126], name: "Split Site RX 3" },
  ],
  tx: [
    { ip: [172, 29, 108, 123], name: "Split Site TX 1" },
    { ip: [172, 29, 108, 125], name: "Split Site TX 2" },
    { ip: [172, 29, 108, 127], name: "Split Site TX 3" },
  ],
};
const SIP_SESSIONS = [
  "TX: sip:GB4000V@192.168.52.110",
  "RX: sip:GB4000V@192.168.52.110",
];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_";
const ALNUM = "0123456789" + LETTERS;

// PMU modes: which GX units control something (1/2 kW) or the 4 kW controller
const pmuGx = (m) => {
  if (m[1] === "3") return [Number(m[0])];
  const x = Number(m[0]);
  const y = Number(m[1]);
  const set = new Set([1]);
  if (x === 0) { set.add(2); } else if (x === 1) { /* GX1 drives VK1+2 */ } else { set.add(2); }
  if (y === 0) { set.add(3); set.add(4); } else if (y === 1) { set.add(3); } else { set.add(4); }
  return [...set];
};

const pad = (arr, n) => Array.from({ length: n }, (_, i) => arr[i] || {});
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const winStart = (sel, n, len) => Math.max(0, Math.min(len - n, sel - n + 1));
const p2 = (n) => String(n).padStart(2, "0");

/* ---------------- presentational helpers ---------------- */
const Fields = ({ rows }) => (
  <table className="text-[10px] leading-[15px]">
    <tbody>
      {rows.map(([k, v]) => (
        <tr key={k}>
          <td className="pr-3 whitespace-nowrap">{k}</td>
          <td className="text-blue-700 whitespace-nowrap">{v}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
const Row = ({ selected, cols, children }) => (
  <div
    className={`grid leading-[14px] px-0.5 ${selected ? "bg-blue-700 text-white" : ""}`}
    style={{ gridTemplateColumns: cols }}
  >
    {children}
  </div>
);
const Panel = ({ title, children }) => (
  <div className="absolute left-3 right-3 top-1/4 border border-slate-600 bg-slate-200 p-1.5 shadow-lg z-20 text-[10px]">
    <div className="font-bold text-center border-b border-slate-600 mb-1">{title}</div>
    {children}
  </div>
);
const Hl = ({ on, children }) => (
  <span className={on ? "bg-blue-700 text-white px-0.5" : "px-0.5"}>{children}</span>
);

export default function useRadioMaintenance({ connected = true } = {}) {
  const [screen, setScreen] = useState(null);
  const [cfg, setCfg] = useState({
    osc: "INT", digSel: "SCAN MODE", digAt: "0 dB", postSel: "SELECTIVE",
    txIhbt: false, rxAnt: false, sdt: "0 dB", audioInd: true, isb: "USB",
    linUsbIn: 0, linUsbOut: 0, linLsbIn: 0, linLsbOut: 0,
    ip: [192, 168, 52, 34], mask: [255, 255, 255, 0], gw: [0, 0, 0, 0], clockOffset: 0,
    baud: "115200 baud", flow: "RTS/CTS", params: "8N1", smode: "ASYNC", dcd: "HF DETECTION",
    dscMode: "OFF", dscIn: 0, dscOut: 0,
    voipMode: "ED137+SIP", uriTx: "TX", uriRx: "RX", rtpStart: 4000, rtpEnd: 65535, jitter: 60,
    ptt: { front: true, v28: true, ttl1: true, ttl2: true, usb: true, lsb: true, v6: true, dsc: true },
    pmuMode: "13",
  });
  const [ss, setSs] = useState(INITIAL_SS);
  const [ssSel, setSsSel] = useState({ rx: 0, tx: 0, list: "rx" }); // 3042 selection / active list
  const [ssTarget, setSsTarget] = useState({ rx: 0, tx: 0 }); // 3041 chosen radios
  const [conn, setConn] = useState({ rx: "not connected", tx: "not connected" });
  const [keys, setKeys] = useState(INITIAL_KEYS);
  const [folder, setFolder] = useState(0);
  const [sel, setSel] = useState({ err: 0, inv: 1, fw: 0, voip: 0, keys: [0, 0, 0] });
  const [invView, setInvView] = useState("modules");
  const [overlay, setOverlay] = useState(null);
  const [now, setNow] = useState(Date.now());
  const timers = useRef([]);
  const bootAt = useRef(Date.now());

  useEffect(() => {
    if (!screen) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [screen]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  /* ---------- navigation ---------- */
  const go = (s) => {
    setOverlay(null);
    setScreen(s);
  };
  const open = () => {
    if (RADIO_REQUIRES_CONNECTION && !connected) return;
    go("rm1");
  };
  const close = () => go(null);
  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setConn({ rx: "not connected", tx: "not connected" });
    go(null);
  };
  const blocked = overlay?.type === "msg" && overlay.blocking;
  const prev = () => {
    const t = PREV_TO[screen];
    if (t === null || t === undefined) close();
    else go(t);
  };

  /* ---------- editors ---------- */
  const optionsFor = (key) =>
    key === "ssRx" ? ss.rx.map((r) => r.name) : key === "ssTx" ? ss.tx.map((r) => r.name) : LISTS[key];
  const currentFor = (key) =>
    key === "ssRx" ? ss.rx[ssTarget.rx]?.name : key === "ssTx" ? ss.tx[ssTarget.tx]?.name : cfg[key];
  const openList = (id) =>
    setOverlay({ type: "list", key: id, idx: Math.max(0, optionsFor(id).indexOf(currentFor(id))) });
  const toggleList = (id) =>
    overlay?.type === "list" && overlay.key === id ? setOverlay(null) : openList(id);
  const openNum = (key) => setOverlay({ type: "num", key, value: cfg[key], buf: null });
  const openIp = (key, label) =>
    setOverlay({ type: "ip", key, label, parts: [...cfg[key]], pos: 0, typing: false });
  const openDt = () => {
    const d = new Date(now + cfg.clockOffset);
    setOverlay({
      type: "dt",
      parts: [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()],
      pos: 0,
      typing: false,
    });
  };
  const openText = (key, label, text, chars, max = 64) =>
    setOverlay({ type: "text", key, label, text: [...text], chars, max });
  const toggle = (path) =>
    setCfg((c) => ({ ...c, ptt: { ...c.ptt, [path]: !c.ptt[path] } }));

  const startIbit = () => {
    setOverlay({ type: "msg", title: "IBIT", text: "IBIT in progress...", blocking: true });
    later(() => setOverlay({ type: "msg", title: "IBIT", text: "IBIT finished" }), 3000);
  };
  const startSynCal = () => {
    setOverlay({ type: "msg", title: "Synthesizer Calibration", text: "Calibration in progress...", blocking: true });
    later(() => setOverlay({ type: "msg", title: "Synthesizer Calibration", text: "Calibration finished" }), 3000);
  };

  // Split Site connect sequence
  const ssConnect = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const steps = ["connecting", "connection established", "config in progress", "operational"];
    steps.forEach((s, i) => later(() => setConn({ rx: s, tx: s }), i * 1000));
  };
  const ssDisconnect = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setConn({ rx: "not connected", tx: "not connected" });
  };
  const ssBusy = conn.rx !== "not connected";

  /* ---------- soft key definitions ---------- */
  const PREV = { label: "PREV", nav: true, action: prev };
  const NEXT = { label: "NEXT", nav: true, action: () => go(NEXT_TO[screen]) };
  const lst = (id, label, extra = {}) => ({
    id, label, notch: true, action: () => toggleList(id),
    value: typeof cfg[id] === "string" ? cfg[id] : undefined, ...extra,
  });
  const nav = (label, to, extra = {}) => ({ label, nav: true, action: () => go(to), ...extra });
  const numKey = (key, label = NUMS[key].label, extra = {}) => ({
    label, notch: true, value: fmtNum(key, cfg[key]), action: () => openNum(key), ...extra,
  });
  const tgl = (label, on, flip, extra = {}) => ({
    label, toggle: { labels: ["ON", "OFF"], on: !on }, action: flip, ...extra,
  });

  const keyList = keys[FOLDERS[folder][0]];
  const buildDef = () => {
    switch (screen) {
      case "rm1":
        return {
          left: [
            PREV,
            lst("osc", "OSC"),
            lst("digSel", "DIG SEL", { disabled: !HAS_DIGSEL }),
            lst("digAt", "DIG SEL AT", { disabled: !HAS_DIGSEL }),
            nav("Split Site", "ss1"),
            { label: "Start\nSYN CAL", action: startSynCal },
          ],
          right: [
            NEXT,
            { label: "Start\nIBIT", action: startIbit },
            nav("Errors", "rmErr"),
            nav("Inventory", "rmInv"),
            HAS_PMU ? nav("PMU", "pmu") : {},
            lst("postSel", "POST SEL"),
          ],
          bottom: [
            tgl("TX IHBT", cfg.txIhbt, () => setCfg((c) => ({ ...c, txIhbt: !c.txIhbt }))),
            tgl("RX ANT", cfg.rxAnt, () => setCfg((c) => ({ ...c, rxAnt: !c.rxAnt }))),
            {},
          ],
        };
      case "rmErr":
        return { left: [PREV], right: [{}, {}, nav("Details", "rmErrDet", { disabled: ERRS.length === 0 })] };
      case "rmErrDet":
      case "rmInvDet":
      case "rm7":
        return { left: [PREV], right: [] };
      case "rmInv":
        return {
          left: [
            PREV,
            { label: "Installed\nModules", action: () => setInvView("modules") },
            { label: "Firmware\nVersion", action: () => setInvView("fw") },
          ],
          right: [{}, {}, nav("Details", "rmInvDet", { disabled: invView !== "modules" })],
        };
      case "pmu":
        return {
          left: [PREV],
          right: [{}, {}, {}, {}, lst("pmuMode", "PMU Mode", { disabled: !IS_GV4190 })],
        };
      case "ss1":
        return {
          left: [PREV],
          right: [
            NEXT,
            lst("ssRx", "Split Site\nReceiver", { disabled: ssBusy, value: undefined }),
            {},
            lst("ssTx", "Split Site\nTransmitter", { disabled: ssBusy, value: undefined }),
          ],
          bottom: [
            {},
            ssBusy ? { label: "Disconnect", action: ssDisconnect } : { label: "Connect", action: ssConnect },
            {},
          ],
        };
      case "ss2": {
        const which = ssSel.list === "rx" ? "Receiver" : "Transmitter";
        return {
          left: [PREV],
          right: [
            {},
            { label: "Split Site\nReceiver", action: () => setSsSel((s) => ({ ...s, list: "rx" })) },
            {},
            { label: "Split Site\nTransmitter", action: () => setSsSel((s) => ({ ...s, list: "tx" })) },
          ],
          bottom: [
            {
              label: `Insert\n${which}`, notch: true,
              action: () => {
                const l = ss[ssSel.list];
                const last = l[l.length - 1]?.ip || [172, 29, 108, 120];
                setOverlay({
                  type: "ip", key: "ssIp", label: `${which} IP Address`,
                  parts: [last[0], last[1], last[2], Math.min(255, last[3] + 2)], pos: 0, typing: false,
                  list: ssSel.list,
                });
              },
            },
            {
              label: `Delete\n${which}`, disabled: ss[ssSel.list].length === 0,
              action: () => {
                const k = ssSel.list;
                setSs((s) => ({ ...s, [k]: s[k].filter((_, i) => i !== ssSel[k]) }));
                setSsSel((s) => ({ ...s, [k]: Math.max(0, Math.min(s[k], ss[k].length - 2)) }));
                setSsTarget((t) => ({ ...t, [k]: 0 }));
              },
            },
            {},
          ],
        };
      }
      case "rm2":
        return {
          left: [
            PREV,
            lst("sdt", "SDT ATT"),
            tgl("Audio Ind", cfg.audioInd, () => setCfg((c) => ({ ...c, audioInd: !c.audioInd }))),
            {
              label: "ISB select",
              toggle: { labels: ["USB", "LSB"], on: cfg.isb === "LSB" },
              action: () => setCfg((c) => ({ ...c, isb: c.isb === "USB" ? "LSB" : "USB" })),
            },
            {},
            numKey("linUsbIn"),
          ],
          right: [
            NEXT,
            { label: "Date\nTime", notch: true, action: openDt },
            { label: "IP\nAddress", notch: true, action: () => openIp("ip", "Radio IP Address") },
            { label: "Subnet\nMask", notch: true, action: () => openIp("mask", "Subnet Mask") },
            { label: "Gateway\nAddress", notch: true, action: () => openIp("gw", "Gateway Address") },
            nav("VoIP\nService", "voip1"),
          ],
          bottom: [numKey("linUsbOut"), numKey("linLsbIn"), numKey("linLsbOut")],
        };
      case "voip1":
        return {
          left: [PREV],
          right: [
            NEXT,
            {},
            {
              label: "Details",
              action: () =>
                setOverlay({ type: "msg", title: "Session", text: SIP_SESSIONS[sel.voip], wide: true }),
            },
          ],
        };
      case "voip2":
        return {
          left: [
            PREV,
            { label: "ED137\nURI TX", notch: true, action: () => openText("uriTx", "ED137 URI TX", cfg.uriTx, LETTERS) },
            { label: "ED137\nURI RX", notch: true, action: () => openText("uriRx", "ED137 URI RX", cfg.uriRx, LETTERS) },
            numKey("rtpStart", "Start\nRTP Port", { value: undefined }),
            numKey("rtpEnd", "End\nRTP Port", { value: undefined }),
          ],
          right: [{}, numKey("jitter")],
          bottom: [{}, lst("voipMode", "VoIP"), {}],
        };
      case "rm3":
        return {
          left: [
            PREV,
            lst("baud", "Data\nBaudrate", { value: undefined }),
            lst("flow", "Data\nFlow", { value: undefined }),
            lst("params", "Data\nParams", { value: undefined }),
            lst("smode", "Data\nMode", { value: undefined }),
            lst("dcd", "DCD\nMode", { value: undefined }),
          ],
          right: [NEXT, {}, {}, {}, {}, lst("dscMode", "DSC\nMode", { value: undefined, disabled: !HAS_DSC })],
          bottom: [{}, numKey("dscIn", undefined, { disabled: !HAS_DSC }), numKey("dscOut", undefined, { disabled: !HAS_DSC })],
        };
      case "rm4": {
        const lastF = FOLDERS.length - 1;
        return {
          left: [PREV, folder > 0 ? { label: "⇦", action: () => setFolder((f) => f - 1) } : {}],
          right: [
            NEXT,
            folder < lastF ? { label: "⇨", action: () => setFolder((f) => f + 1) } : {},
            {
              label: "Details", disabled: keyList.length === 0,
              action: () => {
                const k = keyList[sel.keys[folder]];
                setOverlay({ type: "msg", title: "Key", text: `${k.key.slice(0, 15)}\n${k.key.slice(15)}`, mono: true });
              },
            },
            {
              label: "New", notch: true,
              action: () => setOverlay({ type: "optkey", groups: ["", "", "", "", "", ""], group: 0 }),
            },
          ],
        };
      }
      case "rm5": {
        const k = (label, id) => ({ label, action: () => toggle(id) });
        return {
          left: [PREV, k("Front Panel", "front"), k("Line V.28", "v28"), k("Line TTL1", "ttl1"), k("Line TTL2", "ttl2")],
          right: [NEXT, k("Line USB", "usb"), k("Line LSB", "lsb"), k("Line 6V", "v6")],
        };
      }
      case "rm6":
        return { left: [PREV, { label: "DSC", action: () => toggle("dsc") }], right: [NEXT] };
      default:
        return { left: [], right: [] };
    }
  };

  /* ---------- central area ---------- */
  const onOff = (b) => (b ? "ON" : "OFF");
  const clock = new Date(now + cfg.clockOffset);
  const dateStr = `${clock.getUTCFullYear()}.${p2(clock.getUTCMonth() + 1)}.${p2(clock.getUTCDate())}`;
  const timeStr = `${p2(clock.getUTCHours())}:${p2(clock.getUTCMinutes())}:${p2(clock.getUTCSeconds())}`;
  const upMin = Math.floor((now - bootAt.current) / 60000);
  const onTime = (mins) =>
    `${String(Math.floor(mins / 43200)).padStart(3, "0")}m ${p2(Math.floor((mins % 43200) / 1440))}d ${p2(
      Math.floor((mins % 1440) / 60)
    )}h ${p2(mins % 60)}min`;

  const list = (rows, n, selIdx, cols, render, empty = "") => {
    const start = winStart(selIdx, n, rows.length);
    return (
      <div className="border border-slate-400 bg-slate-200 min-h-[6.5rem]">
        {rows.slice(start, start + n).map((r, i) => (
          <Row key={start + i} selected={start + i === selIdx} cols={cols}>
            {render(r, start + i)}
          </Row>
        ))}
        {!rows.length && empty}
      </div>
    );
  };

  const pmuSvg = () => {
    const present = pmuGx(cfg.pmuMode);
    const xs = [4, 70, 136, 202];
    return (
      <svg viewBox="0 0 260 170" className="w-full h-full" style={{ maxHeight: 170 }}>
        <polygon points="130,2 126,10 134,10" fill="#000" />
        <line x1="130" y1="10" x2="130" y2="16" stroke="#000" />
        <rect x="123" y="16" width="14" height="10" fill="#fff" stroke="#000" />
        <line x1="130" y1="26" x2="130" y2="32" stroke="#000" />
        <line x1="62" y1="32" x2="196" y2="32" stroke="#000" />
        <line x1="62" y1="32" x2="62" y2="38" stroke="#000" />
        <line x1="196" y1="32" x2="196" y2="38" stroke="#000" />
        <rect x="55" y="38" width="14" height="10" fill="#fff" stroke="#000" />
        <rect x="189" y="38" width="14" height="10" fill="#fff" stroke="#000" />
        <line x1="62" y1="48" x2="62" y2="54" stroke="#000" />
        <line x1="31" y1="54" x2="97" y2="54" stroke="#000" />
        <line x1="196" y1="48" x2="196" y2="54" stroke="#000" />
        <line x1="163" y1="54" x2="229" y2="54" stroke="#000" />
        {xs.map((x, i) => (
          <g key={`vk${i}`}>
            <line x1={x + 27} y1={54} x2={x + 27} y2={62} stroke="#000" />
            <rect x={x} y="62" width="54" height="16" fill="#fff" stroke="#000" />
            <text x={x + 27} y="74" textAnchor="middle" fontSize="9" fill="#000">VK {i + 1}</text>
            <line x1={x + 27} y1={78} x2={x + 27} y2={100} stroke="#000" />
          </g>
        ))}
        <rect x="0" y="94" width="256" height="76" fill="#00ffff" opacity="0.8" />
        <rect x="6" y="100" width="244" height="22" fill="#fff" stroke="#000" strokeWidth="1.5" />
        {xs.map((x, i) => {
          const on = present.includes(i + 1);
          return (
            <g key={`gx${i}`}>
              {on && <line x1={x + 27} y1={122} x2={x + 27} y2={140} stroke="#000" />}
              <rect
                x={x} y="140" width="54" height="18"
                fill={i === 0 ? "#bbb" : "#fff"}
                stroke={on ? "#000" : "#bbb"} strokeWidth={i === 0 ? 2 : 1}
              />
              <text x={x + 27} y="153" textAnchor="middle" fontSize="9" fill={on ? "#000" : "#bbb"}>GX {i + 1}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  const renderBody = () => {
    switch (screen) {
      case "rm1":
        return (
          <div className="h-full flex flex-col justify-between">
            <div>BIT Status: <span className="text-blue-700">{ERRS.length ? "ERROR" : "OK"}</span></div>
            <Fields rows={[
              ["Radio Device Key:", "6126.4877k02"],
              ["RC Serial No.:", "100949"],
              ["Radio Serial No.:", "100032"],
            ]} />
          </div>
        );
      case "rmErr": {
        const cols = "1.4rem 2.6rem 1fr";
        return (
          <div>
            <div className="font-bold">Error List:</div>
            <Row cols={cols}><span>No.</span><span>Dev. ID</span><span>Error</span></Row>
            {list(ERRS, 8, sel.err, cols, (e) => (
              <>
                <span>{e.no}</span><span>{e.dev}</span><span className="truncate">{e.desc}</span>
              </>
            ))}
          </div>
        );
      }
      case "rmErrDet": {
        const e = ERRS[sel.err];
        return (
          <div>
            <Fields rows={[
              ["Fault type:", e.type], ["Fault dev.:", e.dev], ["Fault ID:", e.faultId],
              ["Test type:", e.test], ["Initial time:", e.initial], ["End time:", e.end],
              ["Count:", e.count],
            ]} />
            <div className="text-[10px] leading-[15px]">Description:</div>
            <div className="text-[10px] leading-[15px] text-blue-700">{e.desc}</div>
          </div>
        );
      }
      case "rmInv": {
        if (invView === "fw") {
          return (
            <div>
              <div className="font-bold">Firmware:</div>
              {list(FW, 7, sel.fw, "1.6rem 1fr", (f) => (
                <><span>{f[0]}</span><span className="truncate">{f[1]}</span></>
              ))}
            </div>
          );
        }
        return (
          <div>
            <div className="font-bold">Installed modules:</div>
            {list(MODULES, 8, sel.inv, "1fr", (m) => <span>{m.name} {m.status}</span>)}
          </div>
        );
      }
      case "rmInvDet": {
        const d = MOD_DETAILS[MODULES[sel.inv].name];
        const labels = ["Module Ident.:", "Block ID:", "Part No:", "HW Code:", "Version No:", "Serial No:", "Prod. Date:", "Read Code:", "Test Instr.:", "Name:"];
        return <Fields rows={labels.map((l, i) => [l, d ? d[i] : "---"])} />;
      }
      case "pmu":
        return <div className="h-full flex items-center justify-center -m-1">{pmuSvg()}</div>;
      case "ss1":
        return (
          <div>
            <div className="font-bold">Split Site State:</div>
            <Fields rows={[
              ["Receiver:", ss.rx[ssTarget.rx]?.name ?? "---"],
              ["State Rx:", conn.rx],
              ["Transmitter:", ss.tx[ssTarget.tx]?.name ?? "---"],
              ["State Tx:", conn.tx],
            ]} />
          </div>
        );
      case "ss2": {
        const panel = (k, title) => {
          const l = ss[k];
          const cur = l[ssSel[k]];
          const active = ssSel.list === k;
          return (
            <div className="mb-2">
              <div className={`flex justify-between px-0.5 text-white ${active ? "bg-blue-700" : "bg-blue-400"}`}>
                <span>{title}:</span><span>{l.length ? `${ssSel[k] + 1}/${l.length}` : "0/0"}</span>
              </div>
              <div className="flex justify-between"><span>IP Addr.:</span><span className="text-blue-700">{cur ? cur.ip.join(". ") : "---"}</span></div>
              <div className="flex justify-between"><span>Name:</span><span className="text-blue-700">{cur ? cur.name : "---"}</span></div>
            </div>
          );
        };
        return <div className="text-[10px] leading-[14px]">{panel("rx", "Split Site Receiver")}{panel("tx", "Split Site Transmitter")}</div>;
      }
      case "rm2":
        return (
          <div className="-m-1">
            <Fields rows={[
              ["Date:", dateStr], ["Time:", timeStr], ["IP Addr:", cfg.ip.join(".")],
              ["Subnet Mask:", cfg.mask.join(".")], ["Gateway Addr:", cfg.gw.join(".")],
              ["Total On Time:", onTime(86 + upMin)], ["Curr. On Time:", onTime(9 + upMin)],
            ]} />
          </div>
        );
      case "voip1":
        return (
          <div>
            <div className="font-bold mb-1">Active SIP Sessions</div>
            {list(SIP_SESSIONS, 8, sel.voip, "1fr", (s) => <span className="truncate">{s}</span>)}
          </div>
        );
      case "voip2":
        return (
          <div className="h-full flex flex-col justify-between">
            <div><Fields rows={[["TX:", cfg.uriTx]]} /><div className="h-3" /><Fields rows={[["RX:", cfg.uriRx]]} /></div>
            <Fields rows={[["Start RTP Port:", cfg.rtpStart], ["End RTP Port :", cfg.rtpEnd]]} />
          </div>
        );
      case "rm3":
        return (
          <div>
            <div className="font-bold">Serial Interface</div>
            <Fields rows={[
              ["Baudrate:", cfg.baud], ["Flow Control:", cfg.flow], ["Parameters:", cfg.params],
              ["Mode:", cfg.smode], ["DCD Mode:", cfg.dcd],
            ]} />
            <div className="font-bold mt-1">Dsc Operation</div>
            <Fields rows={[["Mode:", cfg.dscMode]]} />
          </div>
        );
      case "rm4":
        return (
          <div className="-m-1">
            <div className="flex text-[9px] leading-tight mb-1">
              {FOLDERS.map(([, label], i) => (
                <div key={i} className={`flex-1 text-center whitespace-pre-line border border-slate-400 ${i === folder ? "bg-white text-blue-700" : "bg-slate-300"}`}>
                  {label}
                </div>
              ))}
            </div>
            <div className="font-bold">Option keys:</div>
            {list(keyList, 7, sel.keys[folder], "1fr", (k) => <span>{k.name}</span>)}
          </div>
        );
      case "rm5": {
        const p = cfg.ptt;
        return (
          <div>
            <div className="font-bold">PTT mask configuration basis</div>
            <table className="text-[10px] leading-[15px]"><tbody>
              {[["Front Panel:", p.front], ["Line connector V.28:", p.v28], ["Line connector TTL1:", p.ttl1],
                ["Line connector TTL2:", p.ttl2], ["Line connector USB:", p.usb], ["Line connector LSB:", p.lsb],
                ["Line connector 6V:", p.v6]].map(([k, v]) => (
                <tr key={k}><td className="pr-4">{k}</td><td className="text-blue-700">{onOff(v)}</td></tr>
              ))}
            </tbody></table>
          </div>
        );
      }
      case "rm6":
        return (
          <div>
            <div className="font-bold">PTT mask config. aux. modules</div>
            <Fields rows={[["DSC:", onOff(cfg.ptt.dsc)]]} />
          </div>
        );
      case "rm7":
        return (
          <div>
            <div className="font-bold">Network Time Protocol:</div>
            <Fields rows={[["Active Server:", "---"], ["State:", "---"]]} />
            <div>Time: <span className="text-blue-700">--:--:--</span>&nbsp;&nbsp;&nbsp;&nbsp;Date: <span className="text-blue-700">----.--.--</span></div>
          </div>
        );
      default:
        return null;
    }
  };

  const numText = (o) => {
    const s = NUMS[o.key];
    return o.buf !== null ? o.buf || "0" : s.dec ? Number(o.value).toFixed(s.dec) : String(o.value);
  };
  const renderOverlay = () => {
    if (!overlay) return null;
    switch (overlay.type) {
      case "msg":
        return (
          <Panel title={overlay.title || "Message"}>
            <div className={`whitespace-pre-line ${overlay.mono ? "font-mono" : ""}`}>{overlay.text}</div>
            {!overlay.blocking && <div className="text-right mt-1">Press ENT to confirm...</div>}
          </Panel>
        );
      case "num": {
        const s = NUMS[overlay.key];
        return (
          <Panel title={s.label}>
            <span className="bg-white border border-slate-500 px-1"><span className="bg-blue-700 text-white px-0.5">{numText(overlay)}</span></span> {s.unit}
          </Panel>
        );
      }
      case "ip":
        return (
          <Panel title={overlay.label}>
            <span className="font-mono">
              {overlay.parts.map((p, i) => (
                <React.Fragment key={i}>{i > 0 && "."}<Hl on={i === overlay.pos}>{p}</Hl></React.Fragment>
              ))}
            </span>
          </Panel>
        );
      case "dt": {
        const seps = ["-", "-", " ", ":", ":", ""];
        return (
          <Panel title="Date / Time">
            <span className="font-mono">
              {overlay.parts.map((p, i) => (
                <React.Fragment key={i}>
                  <Hl on={i === overlay.pos}>{i === 0 ? p : p2(p)}</Hl>{seps[i]}
                </React.Fragment>
              ))}
            </span>
          </Panel>
        );
      }
      case "text":
        return (
          <Panel title={overlay.label}>
            <span className="font-mono bg-white border border-slate-500 px-1 break-all">
              {overlay.text.map((c, i) => (
                <Hl key={i} on={i === overlay.text.length - 1}>{c}</Hl>
              ))}
            </span>
          </Panel>
        );
      case "optkey":
        return (
          <Panel title="New Option Key">
            <div className="grid grid-cols-3 gap-1 font-mono">
              {overlay.groups.map((g, i) => (
                <div key={i} className={`border border-slate-500 bg-white px-1 h-4 ${i === overlay.group ? "ring-1 ring-blue-700" : ""}`}>{g}</div>
              ))}
            </div>
          </Panel>
        );
      default:
        return null;
    }
  };

  /* ---------- user input ---------- */
  const softKey = (side, index) => {
    if (!screen || blocked) return;
    if (overlay && overlay.type !== "list") return;
    const item = (buildDef()[side] || [])[index];
    if (!item || item.disabled || !item.action) {
      if (overlay) setOverlay(null);
      return;
    }
    if (overlay?.type === "list" && !(item.id && item.id === overlay.key)) setOverlay(null);
    item.action();
  };

  const digitInto = (cur, typing, d, max) => {
    const next = typing ? cur * 10 + d : d;
    return next > max ? d : next;
  };
  const DT_RANGE = [[1970, 2099], [1, 12], [1, 31], [0, 23], [0, 59], [0, 59]];

  const keypad = (key) => {
    if (!overlay || blocked) return;
    const isDigit = /^[0-9]$/.test(String(key));
    const d = isDigit ? Number(key) : null;

    if (overlay.type === "num") {
      const s = NUMS[overlay.key];
      setOverlay((o) => {
        let buf = o.buf;
        if (isDigit) buf = (buf ?? "") + key;
        else if (key === "." && s.dec > 0) buf = buf && !buf.includes(".") ? buf + "." : buf ? buf : "0.";
        else if (key === "+/-" && s.min < 0) buf = (buf ?? "").startsWith("-") ? (buf ?? "").slice(1) : "-" + (buf ?? "");
        else return o;
        const v = parseFloat(buf);
        return { ...o, buf, value: Number.isNaN(v) ? 0 : v };
      });
    } else if (overlay.type === "ip") {
      if (isDigit)
        setOverlay((o) => {
          const parts = [...o.parts];
          parts[o.pos] = digitInto(parts[o.pos], o.typing, d, 255);
          return { ...o, parts, typing: true };
        });
      else if (key === ".") setOverlay((o) => ({ ...o, pos: (o.pos + 1) % 4, typing: false }));
    } else if (overlay.type === "dt") {
      if (isDigit)
        setOverlay((o) => {
          const parts = [...o.parts];
          parts[o.pos] = digitInto(parts[o.pos], o.typing, d, DT_RANGE[o.pos][1]);
          return { ...o, parts, typing: true };
        });
      else if (key === ".") setOverlay((o) => ({ ...o, pos: (o.pos + 1) % 6, typing: false }));
    } else if (overlay.type === "text") {
      setOverlay((o) => {
        if (key === "+/-") return { ...o, text: o.text.slice(0, -1) };
        if (key === "." && o.text.length < o.max) return { ...o, text: [...o.text, o.chars[0]] };
        if (isDigit && o.chars.includes(String(key)) && o.text.length < o.max)
          return { ...o, text: [...o.text.slice(0, -1), String(key)] };
        return o;
      });
    } else if (overlay.type === "optkey") {
      setOverlay((o) => {
        const groups = [...o.groups];
        if (key === ".") return { ...o, group: (o.group + 1) % 6 };
        if (!isDigit) return o;
        if (groups[o.group].length < 5) groups[o.group] += key;
        else if (o.group < 5) {
          groups[o.group + 1] += key;
          return { ...o, groups, group: o.group + 1 };
        }
        return { ...o, groups };
      });
    }
  };

  const enter = () => {
    if (blocked || !overlay) return;
    switch (overlay.type) {
      case "msg":
        return setOverlay(null);
      case "list": {
        const v = optionsFor(overlay.key)[overlay.idx];
        if (overlay.key === "ssRx") setSsTarget((t) => ({ ...t, rx: overlay.idx }));
        else if (overlay.key === "ssTx") setSsTarget((t) => ({ ...t, tx: overlay.idx }));
        else setCfg((c) => ({ ...c, [overlay.key]: v }));
        return setOverlay(null);
      }
      case "num": {
        const s = NUMS[overlay.key];
        let v = clamp(overlay.value, s.min, s.max);
        if (s.step >= 1) v = Math.round(v / s.step) * s.step;
        v = Number(v.toFixed(s.dec));
        setCfg((c) => ({ ...c, [overlay.key]: v }));
        return setOverlay(null);
      }
      case "ip": {
        const parts = overlay.parts.map((p) => clamp(p, 0, 255));
        if (overlay.key === "ssIp") {
          const l = overlay.list;
          return setOverlay({
            type: "text", key: "ssName", label: "Name", chars: ALNUM, max: 16, list: l, ip: parts,
            text: [...(l === "rx" ? "Split_Site_RX_" : "Split_Site_TX_") + (ss[l].length + 1)],
          });
        }
        setCfg((c) => ({ ...c, [overlay.key]: parts }));
        if (overlay.key === "ip")
          return setOverlay({ type: "msg", title: "Message", text: `Radio IP Address has changed to ${parts.join(".")}` });
        return setOverlay(null);
      }
      case "dt": {
        const [y, mo, d, h, mi, s] = overlay.parts;
        const t = Date.UTC(clamp(y, 1970, 2099), clamp(mo, 1, 12) - 1, clamp(d, 1, 31), clamp(h, 0, 23), clamp(mi, 0, 59), clamp(s, 0, 59));
        setCfg((c) => ({ ...c, clockOffset: t - Date.now() }));
        setNow(Date.now());
        return setOverlay(null);
      }
      case "text": {
        const text = overlay.text.join("");
        if (!text) return;
        if (overlay.key === "ssName") {
          const l = overlay.list;
          setSs((s) => {
            const arr = [...s[l]];
            arr.splice(ssSel[l], 0, { ip: overlay.ip, name: text });
            return { ...s, [l]: arr };
          });
        } else setCfg((c) => ({ ...c, [overlay.key]: text }));
        return setOverlay(null);
      }
      case "optkey": {
        if (overlay.groups.some((g) => g.length < 5)) return;
        const key = overlay.groups.join("");
        const vi = keys.valid.findIndex((k) => k.key === key);
        if (vi >= 0) {
          // entering an installed key deactivates it
          const k = keys.valid[vi];
          setKeys((s) => ({
            valid: s.valid.filter((_, i) => i !== vi),
            invalid: [...s.invalid, k],
            resp: [...s.resp, { name: k.name, key: mkKey(100 + s.resp.length) }],
          }));
        } else {
          setKeys((s) => ({ ...s, valid: [...s.valid, { name: `OPT_${key.slice(0, 5)}`, key }] }));
          setFolder(0);
        }
        return setOverlay(null);
      }
      default:
        return;
    }
  };

  const esc = () => {
    if (blocked) return;
    if (overlay) setOverlay(null);
    else prev();
  };
  const homeKey = () => {
    if (!blocked) close();
  };

  /* ---------- knob ---------- */
  let knob = { value: 0, min: 0, max: 1 };
  const selKnob = (v, len) => ({ value: v, min: 0, max: Math.max(0, len - 1) });
  if (overlay?.type === "list") knob = selKnob(overlay.idx, optionsFor(overlay.key).length);
  else if (overlay?.type === "num") {
    const s = NUMS[overlay.key];
    knob = { value: Math.round(overlay.value / s.step), min: Math.round(s.min / s.step), max: Math.round(s.max / s.step) };
  } else if (overlay?.type === "ip") knob = { value: overlay.parts[overlay.pos], min: 0, max: 255 };
  else if (overlay?.type === "dt")
    knob = { value: overlay.parts[overlay.pos], min: DT_RANGE[overlay.pos][0], max: DT_RANGE[overlay.pos][1] };
  else if (overlay?.type === "text") {
    const c = overlay.text[overlay.text.length - 1];
    knob = selKnob(Math.max(0, overlay.chars.indexOf(c)), overlay.chars.length);
  } else if (overlay?.type === "optkey") {
    const g = overlay.groups[overlay.group];
    knob = { value: g ? Number(g[g.length - 1]) : 0, min: 0, max: 9 };
  } else if (screen === "rmErr") knob = selKnob(sel.err, ERRS.length);
  else if (screen === "rmInv") knob = invView === "fw" ? selKnob(sel.fw, FW.length) : selKnob(sel.inv, MODULES.length);
  else if (screen === "voip1") knob = selKnob(sel.voip, SIP_SESSIONS.length);
  else if (screen === "rm4") knob = selKnob(sel.keys[folder], keyList.length);
  else if (screen === "ss2") knob = selKnob(ssSel[ssSel.list], ss[ssSel.list].length);

  const onKnob = (val) => {
    if (blocked) return;
    if (overlay) {
      setOverlay((o) => {
        switch (o.type) {
          case "list": return { ...o, idx: val };
          case "num": {
            const s = NUMS[o.key];
            return { ...o, value: Number((val * s.step).toFixed(s.dec)), buf: null };
          }
          case "ip":
          case "dt": {
            const parts = [...o.parts];
            parts[o.pos] = val;
            return { ...o, parts, typing: false };
          }
          case "text": {
            const text = [...o.text];
            text[text.length - 1] = o.chars[val];
            return { ...o, text };
          }
          case "optkey": {
            const groups = [...o.groups];
            const g = groups[o.group];
            groups[o.group] = g ? g.slice(0, -1) + val : String(val);
            return { ...o, groups };
          }
          default: return o;
        }
      });
      return;
    }
    if (screen === "rmErr") setSel((s) => ({ ...s, err: val }));
    else if (screen === "rmInv") setSel((s) => (invView === "fw" ? { ...s, fw: val } : { ...s, inv: val }));
    else if (screen === "voip1") setSel((s) => ({ ...s, voip: val }));
    else if (screen === "rm4") setSel((s) => ({ ...s, keys: s.keys.map((k, i) => (i === folder ? val : k)) }));
    else if (screen === "ss2") setSsSel((s) => ({ ...s, [s.list]: val }));
  };

  /* ---------- menu object ---------- */
  let menu = null;
  if (screen) {
    const def = buildDef();
    const decorate = (item) =>
      overlay?.type === "list" && item.id && item.id === overlay.key
        ? { ...item, popup: { options: optionsFor(item.id), index: overlay.idx } }
        : item;
    menu = {
      title: TITLES[screen],
      rname: screen === "voip1" || screen === "voip2" ? "34" : undefined,
      left: pad(def.left, 6).map(decorate),
      right: pad(def.right, 6).map(decorate),
      bottom: def.bottom ? pad(def.bottom, 3).map(decorate) : null,
      body: (<>{renderBody()}{renderOverlay()}</>),
    };
  }

  return {
    active: screen !== null, menu, knob, open, close, reset, softKey, keypad, enter, esc, homeKey, onKnob,
    knobPress: enter,
  };
}
