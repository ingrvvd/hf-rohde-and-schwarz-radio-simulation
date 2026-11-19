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
 *  Control Unit Maintenance (manual sect. 3.5)
 *
 *  4001 CU MTC 1/4     4011 CU Error List     4012 CU Error Details
 *  4021 CU Inventory   4022 CU Inventory Details
 *  4031 CU Keyboard Test
 *  4002 CU MTC 2/4 (IP)   4003 CU MTC 3/4 (radio list)   4004 CU MTC 4/4 (display)
 * ------------------------------------------------------------------ */

// Listbox contents (Table 3.26 / 3.34)
const LISTS = {
  recall: ["OFF", "0.3 s", "0.5 s", "1 s", "3 s", "5 s", "10 s"],
  rfScale: ["20 dBµV", "50 dBµV", "120 dBµV"],
  snScale: ["28 dB", "70 dB"],
  connQ: ["Fast", "Medium", "Slow", "Very Slow"],
  saver: ["OFF", "15 min.", "30 min.", "1 hour", "2 hours", "3 hours", "6 hours"],
};

const TITLES = {
  cu1: "4001 CU MTC 1/4",
  cuErr: "4011 CU Error List",
  cuErrDet: "4012 CU Error Details",
  cuInv: "4021 CU Inventory",
  cuInvDet: "4022 Cu Inv. Details",
  cuKbd: "4031 CU Keyboard Test",
  cu2: "4002 CU MTC 2/4",
  cu3: "4003 CU MTC 3/4",
  cu4: "4004 CU MTC 4/4",
};

// Target of the PREV softkey (null = Home menu)
const PREV_TO = {
  cu1: null,
  cuErr: "cu1",
  cuErrDet: "cuErr",
  cuInv: "cu1",
  cuInvDet: "cuInv",
  cuKbd: "cu1",
  cu2: "cu1",
  cu3: "cu2",
  cu4: "cu3",
};

// Example data taken from the manual figures. Set to [] to simulate "no errors".
const ERRORS = [
  { desc: "RB ALTERA ERR", type: "PBIT", active: true, cnt: 1 },
  { desc: "RB EPSON ERR", type: "PBIT", active: true, cnt: 1 },
  { desc: "28V OOR", type: "CBIT", active: true, cnt: 1 },
  { desc: "12V OOR", type: "CBIT", active: true, cnt: 1 },
  { desc: "5V OOR", type: "CBIT", active: true, cnt: 1 },
  { desc: "3.3V OOR", type: "CBIT", active: true, cnt: 1 },
  { desc: "2.2V OOR", type: "CBIT", active: true, cnt: 1 },
  { desc: "-12V OOR", type: "CBIT", active: true, cnt: 1 },
];

const TYPE_NAMES = {
  HWM: "Hardware Mainboard",
  SW: "Software",
  FW: "Firmware",
  HW: "Hardware",
};
const inv = (type, name, extra = {}) => ({
  type,
  name,
  block: "1",
  part: "0000.0000.00",
  hw: "0",
  version: "00.00",
  serial: "000000/000",
  date: "2007.05.23",
  read: "0",
  test: "00.00",
  ...extra,
});
const INVENTORY = [
  inv("HWM", "GB4000C CONTR"),
  inv("SW", "BOOTP GB4000C", { block: "1" }),
  inv("SW", "CONTR GB4000C", {
    block: "2",
    part: "6119.7568.02",
    version: "02.00",
  }),
  inv("FW", "ACPCB ws EQI"),
  inv("HW", "CONTROLLER B"),
  inv("HW", "FRONT PANEL B"),
];

const INITIAL_RADIOS = [
  { addr: "SPCONT_8", ip: [192, 168, 52, 66], local: false },
  { addr: "BASE_XA5", ip: [192, 168, 52, 66], local: false },
  { addr: "ABCDEFGH", ip: [192, 168, 52, 66], local: true },
  { addr: "065", ip: [192, 168, 52, 65], local: false },
  { addr: "066", ip: [192, 168, 52, 66], local: false },
  { addr: "072", ip: [192, 168, 52, 72], local: false },
  { addr: "127", ip: [127, 0, 0, 1], local: false },
  { addr: "31", ip: [192, 168, 52, 31], local: false },
];

const REBOOT_MSG = "Please reboot the CU to make this change take effect.";

const pad = (arr, n) => Array.from({ length: n }, (_, i) => arr[i] || {});
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const winStart = (sel, n, len) => Math.max(0, Math.min(len - n, sel - n + 1));

/* ---------- small presentational helpers ---------- */
const Fields = ({ rows }) => (
  <table className="text-[11px] leading-snug">
    <tbody>
      {rows.map(([k, v]) => (
        <tr key={k}>
          <td className="pr-4 whitespace-nowrap">{k}</td>
          <td className="text-blue-700 whitespace-nowrap">{v}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const Row = ({ selected, cols, children }) => (
  <div
    className={`grid leading-tight px-0.5 ${
      selected ? "bg-blue-700 text-white" : ""
    }`}
    style={{ gridTemplateColumns: cols }}
  >
    {children}
  </div>
);

const Editor = ({ title, children }) => (
  <div className="absolute left-2 right-2 bottom-2 border border-slate-600 bg-slate-100 p-1.5 shadow z-20">
    <div className="font-bold text-[10px] mb-1">{title}</div>
    {children}
  </div>
);

export default function useCuMaintenance({ connected = false } = {}) {
  const [screen, setScreen] = useState(null);
  const [cfg, setCfg] = useState({
    userLevel: 0, // system-wide user level (default 0, manual sect. 3.6)
    recall: "0.3 s",
    sfe: true,
    rfScale: "120 dBµV",
    snScale: "70 dB",
    connQ: "Fast",
    ip: [192, 168, 52, 4],
    mask: [255, 255, 255, 0],
    gw: [0, 0, 0, 0],
    saver: "2 hours",
    contrast: 100,
    bright: 100,
    keyIllum: 100,
    indicators: 100,
  });
  const [radios, setRadios] = useState(INITIAL_RADIOS);
  const [sel, setSel] = useState({ err: 0, inv: 2, radio: 1 });
  const [overlay, setOverlay] = useState(null);
  const [ibitRunning, setIbitRunning] = useState(false);
  const [kbd, setKbd] = useState({ secs: 10, last: null });

  const secsRef = useRef(10);
  const ibitTimer = useRef(null);
  const homeArmedAt = useRef(0);

  useEffect(() => () => clearTimeout(ibitTimer.current), []);

  // Keyboard test: leave after 10 s without any key / knob activity
  useEffect(() => {
    if (screen !== "cuKbd") return;
    const t = setInterval(() => {
      secsRef.current -= 1;
      setKbd((k) => ({ ...k, secs: secsRef.current }));
      if (secsRef.current <= 0) setScreen("cu1");
    }, 1000);
    return () => clearInterval(t);
  }, [screen]);

  /* ---------- navigation ---------- */
  const go = (s) => {
    setOverlay(null);
    setScreen(s);
  };
  const open = () => go("cu1");
  const close = () => go(null);
  const reset = () => {
    clearTimeout(ibitTimer.current);
    setIbitRunning(false);
    setCfg((c) => ({ ...c, userLevel: 0 })); // every power-on starts at user level 0
    go(null);
  };
  const prev = () => {
    const t = PREV_TO[screen];
    if (t === null || t === undefined) close();
    else go(t);
  };

  const noteKey = (name) => {
    secsRef.current = 10;
    setKbd({ secs: 10, last: name });
  };
  const startKbd = () => {
    secsRef.current = 10;
    setKbd({ secs: 10, last: null });
    go("cuKbd");
  };

  /* ---------- editors / listboxes ---------- */
  const openList = (id) =>
    setOverlay({
      type: "list",
      key: id,
      idx: Math.max(0, LISTS[id].indexOf(String(cfg[id]))),
    });
  const toggleList = (id) =>
    overlay?.type === "list" && overlay.key === id
      ? setOverlay(null)
      : openList(id);

  // User Level: password editor (Figure 3.68). ENT sets the system-wide level.
  const openUserLevel = () =>
    overlay?.type === "pwd" ? setOverlay(null) : setOverlay(newPasswordEditor({ mode: "level", need: 1 }));

  const openNum = (key, label) =>
    setOverlay({ type: "num", key, label, value: cfg[key], typing: false });
  const openIp = (key, label, min1 = false) =>
    setOverlay({
      type: "ip",
      key,
      label,
      min1,
      parts: [...cfg[key]],
      pos: 0,
      typing: false,
    });

  const openRadioEditor = (mode) => {
    const cur = radios[sel.radio];
    setOverlay({
      type: "addr",
      mode,
      text: mode === "edit" && cur ? cur.addr : "",
      ip: mode === "edit" && cur ? [...cur.ip] : [0, 0, 0, 0],
      typing: false,
    });
  };

  const startIbit = () => {
    if (ibitRunning) return;
    setIbitRunning(true);
    ibitTimer.current = setTimeout(() => setIbitRunning(false), 2000);
  };

  /* ---------- screen definitions (soft keys) ---------- */
  const lvl = (id, label, extra = {}) => ({
    id,
    label,
    notch: true,
    action: () => toggleList(id),
    ...extra,
  });
  const nav = (label, to, extra = {}) => ({
    label,
    nav: true,
    action: () => go(to),
    ...extra,
  });
  const PREV = { label: "PREV", nav: true, action: prev };

  const buildDef = () => {
    switch (screen) {
      case "cu1":
        return {
          left: [
            PREV,
            {},
            { id: "userLevel", label: "User\nLevel", notch: true, action: openUserLevel },
            { label: "Keyboard\nTest", nav: true, action: startKbd },
            lvl("recall", "Ch. Auto\nRecall Time"),
            {
              label: "SFE",
              toggle: { labels: ["OFF", "ON"], on: cfg.sfe },
              action: () => setCfg((c) => ({ ...c, sfe: !c.sfe })),
            },
          ],
          right: [
            nav("NEXT", "cu2"),
            { label: "Start\nIBIT", disabled: ibitRunning, action: startIbit },
            nav("Errors", "cuErr"),
            nav("Inventory", "cuInv"),
          ],
          bottom: [
            lvl("rfScale", "RF LV Scale", { value: cfg.rfScale }),
            lvl("snScale", "SN Scale", { value: cfg.snScale }),
            lvl("connQ", "Connection\nQuality"),
          ],
        };
      case "cuErr":
        return {
          left: [PREV],
          right: [
            {},
            {},
            nav("Details", "cuErrDet", { disabled: ERRORS.length === 0 }),
          ],
        };
      case "cuErrDet":
      case "cuInvDet":
        return { left: [PREV], right: [] };
      case "cuInv":
        return { left: [PREV], right: [{}, {}, nav("Details", "cuInvDet")] };
      case "cuKbd": {
        const k = (n) => ({
          label: String(n),
          hot: kbd.last === `Softkey ${n}`,
          action: () => noteKey(`Softkey ${n}`),
        });
        return {
          left: [1, 2, 3, 4, 5, 6].map(k),
          right: [15, 14, 13, 12, 11, 10].map(k),
          bottom: [7, 8, 9].map(k),
        };
      }
      case "cu2":
        return {
          left: [PREV],
          right: [
            nav("NEXT", "cu3"),
            {
              label: "IP\nAddress",
              notch: true,
              action: () => openIp("ip", "IP Address", true),
            },
            {
              label: "Subnet\nMask",
              notch: true,
              action: () => openIp("mask", "Subnet Mask"),
            },
            {
              label: "Gateway\nAddress",
              notch: true,
              action: () => openIp("gw", "Gateway Address"),
            },
          ],
        };
      case "cu3": {
        const empty = radios.length === 0;
        return {
          left: [
            PREV,
            {},
            {
              label: "Local\nAddress",
              disabled: empty,
              action: () =>
                setRadios((r) =>
                  r.map((x, i) =>
                    i === sel.radio
                      ? { ...x, local: !x.local }
                      : { ...x, local: false }
                  )
                ),
            },
          ],
          right: [
            nav("NEXT", "cu4"),
            {
              label: "Insert\nAddress",
              notch: true,
              disabled: connected || radios.length >= 100,
              action: () => openRadioEditor("insert"),
            },
            {
              label: "Delete\nAddress",
              disabled: connected || empty,
              action: () => {
                setRadios((r) => r.filter((_, i) => i !== sel.radio));
                setSel((s) => ({
                  ...s,
                  radio: Math.max(0, Math.min(s.radio, radios.length - 2)),
                }));
              },
            },
            {
              label: "Edit\nAddress",
              notch: true,
              disabled: connected || empty,
              action: () => openRadioEditor("edit"),
            },
          ],
        };
      }
      case "cu4": {
        const num = (key, label) => ({
          label,
          notch: true,
          action: () => openNum(key, label),
        });
        return {
          left: [
            PREV,
            {},
            {},
            {},
            lvl("saver", "Scrn Saver", { value: cfg.saver }),
          ],
          right: [
            {},
            num("contrast", "Contrast"),
            num("bright", "Bright"),
            num("keyIllum", "Key Illum"),
            num("indicators", "Indicators"),
          ],
        };
      }
      default:
        return { left: [], right: [] };
    }
  };

  /* ---------- central area ---------- */
  const ibitStatus = ibitRunning
    ? "RUNNING"
    : ERRORS.some((e) => e.active)
    ? "ERROR"
    : "OK";

  const renderBody = () => {
    switch (screen) {
      case "cu1":
        // while the password editor is open it replaces the two lower rows (Figure 3.68)
        return (
          <Fields
            rows={[
              ["IBIT Status:", ibitStatus],
              ["Connection Quality:", cfg.connQ],
              ["Ch. Auto Recall Time:", cfg.recall],
              ["User Level:", cfg.userLevel],
            ].slice(0, overlay?.type === "pwd" ? 2 : 4)}
          />
        );

      case "cuErr": {
        const n = 8;
        const start = winStart(sel.err, n, ERRORS.length);
        const cols = "1.5rem 1fr 2.5rem 2rem 1.5rem";
        return (
          <div>
            <div className="font-bold">Error List:</div>
            <Row cols={cols}>
              <span>No.</span>
              <span>Error</span>
              <span />
              <span>Active</span>
              <span>Cnt</span>
            </Row>
            <div className="border border-slate-400 bg-slate-200 min-h-[7rem]">
              {ERRORS.slice(start, start + n).map((e, i) => (
                <Row key={start + i} selected={start + i === sel.err} cols={cols}>
                  <span>{start + i + 1}</span>
                  <span className="truncate">{e.desc}</span>
                  <span>{e.type}</span>
                  <span className="text-center">{e.active ? "Y" : "N"}</span>
                  <span className="text-right">{e.cnt}</span>
                </Row>
              ))}
            </div>
          </div>
        );
      }

      case "cuErrDet": {
        const e = ERRORS[sel.err];
        if (!e) return null;
        return (
          <Fields
            rows={[
              ["Description:", e.desc],
              ["Test type:", e.type],
              ["Error active:", e.active ? "Yes" : "No"],
              ["Number of occurrance:", e.cnt],
            ]}
          />
        );
      }

      case "cuInv": {
        const cols = "2.5rem 1fr";
        return (
          <div>
            <Row cols={cols}>
              <span className="text-center">Type</span>
              <span className="text-center">Name</span>
            </Row>
            <div className="border border-slate-400 bg-slate-200 min-h-[7rem]">
              {INVENTORY.map((c, i) => (
                <Row key={c.name} selected={i === sel.inv} cols={cols}>
                  <span className="text-center">{c.type}</span>
                  <span>{c.name}</span>
                </Row>
              ))}
            </div>
          </div>
        );
      }

      case "cuInvDet": {
        const c = INVENTORY[sel.inv];
        return (
          <Fields
            rows={[
              ["Comp. Type:", TYPE_NAMES[c.type]],
              ["Block ID:", c.block],
              ["Part No:", c.part],
              ["HW Code:", c.hw],
              ["Version No:", c.version],
              ["Serial No:", c.serial],
              ["Prod. Date:", c.date],
              ["Read Code:", c.read],
              ["Test Instr.:", c.test],
              ["Name:", c.name],
            ]}
          />
        );
      }

      case "cuKbd":
        return (
          <div className="h-full flex flex-col">
            <div className="grow flex items-center justify-center text-xl font-bold text-blue-700">
              {kbd.last}
            </div>
            <div>
              Seconds to leave menu: <span className="text-blue-700">{kbd.secs}</span>
            </div>
            <div>[MENU/HOME]+[ENT] to leave test</div>
          </div>
        );

      case "cu2":
        return (
          <div>
            <div className="font-bold mb-1">Control Unit IP Address</div>
            <Fields
              rows={[
                ["IP Addr:", cfg.ip.join(".")],
                ["Subnet Mask:", cfg.mask.join(".")],
                ["Gateway Addr:", cfg.gw.join(".")],
              ]}
            />
          </div>
        );

      case "cu3": {
        const n = 7;
        const start = winStart(sel.radio, n, radios.length);
        const cols = "5rem 2rem 1fr";
        return (
          <div>
            <div className="font-bold mb-1">Radio IP Address List</div>
            <Row cols={cols}>
              <span className="text-center">Addr</span>
              <span>Loc.</span>
              <span>IP-Addr</span>
            </Row>
            <div className="border border-slate-400 bg-slate-200 min-h-[7rem]">
              {radios.slice(start, start + n).map((r, i) => (
                <Row key={start + i} selected={start + i === sel.radio} cols={cols}>
                  <span className="text-right pr-1 truncate">{r.addr}</span>
                  <span className="text-center text-green-500">
                    {r.local ? "✔" : ""}
                  </span>
                  <span>{r.ip.join(".")}</span>
                </Row>
              ))}
            </div>
          </div>
        );
      }

      case "cu4":
        return (
          <div>
            <div className="font-bold mb-1">Display Parameters</div>
            <Fields
              rows={[
                ["Display Contrast:", `${cfg.contrast} %`],
                ["Display Brightness:", `${cfg.bright} %`],
                ["Keyboard Brightness:", `${cfg.keyIllum} %`],
                ["Indicator Brightness:", `${cfg.indicators} %`],
              ]}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const renderOverlay = () => {
    if (!overlay) return null;
    switch (overlay.type) {
      case "pwd":
        return <PasswordPanel o={overlay} className="-mx-2" />;
      case "num":
        return (
          <Editor title={overlay.label}>
            <span className="bg-blue-700 text-white px-1">{overlay.value}</span> %
          </Editor>
        );
      case "ip":
        return (
          <Editor title={overlay.label}>
            <span className="font-mono">
              {overlay.parts.map((p, i) => (
                <React.Fragment key={i}>
                  {i > 0 && "."}
                  <span
                    className={i === overlay.pos ? "bg-blue-700 text-white px-0.5" : "px-0.5"}
                  >
                    {p}
                  </span>
                </React.Fragment>
              ))}
            </span>
          </Editor>
        );
      case "addr":
        return (
          <Editor title="Logical Address">
            <span className="font-mono bg-white border border-slate-400 px-1">
              {overlay.text}
              <span className="bg-blue-700">&nbsp;</span>
            </span>
          </Editor>
        );
      case "msg":
        return (
          <Editor title="Message">
            <div>{overlay.text}</div>
            <div className="text-right text-slate-500 mt-1">[ENT]</div>
          </Editor>
        );
      default:
        return null;
    }
  };

  /* ---------- user input ---------- */
  const softKey = (side, index) => {
    if (!screen) return;
    if (overlay && overlay.type !== "list") return; // editors need ENT / ESC
    const item = (buildDef()[side] || [])[index];
    if (!item || item.disabled || !item.action) {
      if (overlay) setOverlay(null);
      return;
    }
    if (overlay?.type === "list" && !(item.id && item.id === overlay.key)) {
      setOverlay(null);
    }
    item.action();
  };

  const digitInto = (current, typing, d, max) => {
    const next = typing ? current * 10 + d : d;
    return next > max ? d : next;
  };

  const keypad = (key) => {
    if (screen === "cuKbd") return noteKey(`Keypad ${key}`);
    if (!overlay) return;
    if (overlay.type === "pwd") return setOverlay((o) => pwdKeypad(o, key));
    const isDigit = /^[0-9]$/.test(String(key));
    const d = isDigit ? Number(key) : null;

    if (overlay.type === "num" && isDigit) {
      setOverlay((o) => ({ ...o, value: digitInto(o.value, o.typing, d, 100), typing: true }));
    } else if (overlay.type === "ip") {
      if (isDigit) {
        setOverlay((o) => {
          const parts = [...o.parts];
          parts[o.pos] = digitInto(parts[o.pos], o.typing, d, 255);
          return { ...o, parts, typing: true };
        });
      } else if (key === ".") {
        setOverlay((o) => ({ ...o, pos: (o.pos + 1) % 4, typing: false }));
      }
    } else if (overlay.type === "addr" && isDigit) {
      setOverlay((o) => ({
        ...o,
        text: ((o.typing ? o.text : "") + key).slice(0, 8),
        typing: true,
      }));
    }
  };

  const enter = () => {
    if (screen === "cuKbd") {
      if (Date.now() - homeArmedAt.current < 2000) go("cu1");
      else noteKey("ENT");
      return;
    }
    if (!overlay) return;

    switch (overlay.type) {
      case "pwd": {
        // correct password -> that level; invalid or empty password -> level 0
        setCfg((c) => ({ ...c, userLevel: passwordLevel(overlay.text) }));
        setOverlay(null);
        break;
      }
      case "list":
        setCfg((c) => ({ ...c, [overlay.key]: LISTS[overlay.key][overlay.idx] }));
        setOverlay(null);
        break;
      case "num":
        setCfg((c) => ({ ...c, [overlay.key]: clamp(overlay.value, 0, 100) }));
        setOverlay(null);
        break;
      case "addr":
        if (!overlay.text) return;
        setOverlay({
          type: "ip",
          key: "radio",
          label: "Radio IP Address",
          min1: false,
          mode: overlay.mode,
          addr: overlay.text,
          parts: overlay.ip,
          pos: 0,
          typing: false,
        });
        break;
      case "ip": {
        const parts = overlay.parts.map((p, i) =>
          clamp(p, overlay.min1 && i === 0 ? 1 : 0, 255)
        );
        if (overlay.key === "radio") {
          const entry = {
            addr: overlay.addr,
            ip: parts,
            local: overlay.mode === "edit" ? radios[sel.radio].local : false,
          };
          setRadios((r) =>
            overlay.mode === "edit"
              ? r.map((x, i) => (i === sel.radio ? entry : x))
              : [...r.slice(0, sel.radio), entry, ...r.slice(sel.radio)]
          );
          setOverlay(null);
        } else {
          setCfg((c) => ({ ...c, [overlay.key]: parts }));
          setOverlay({ type: "msg", text: REBOOT_MSG });
        }
        break;
      }
      case "msg":
        setOverlay(null);
        break;
      default:
        break;
    }
  };

  const esc = () => {
    if (screen === "cuKbd") return noteKey("ESC");
    if (overlay?.type === "pwd") return setOverlay((o) => pwdClear(o)); // ESC / CLR
    if (overlay) setOverlay(null);
    else prev();
  };

  // MENU / HOME hardware keys
  const homeKey = (name) => {
    if (screen === "cuKbd") {
      homeArmedAt.current = Date.now(); // press ENT within 2 s to leave
      noteKey(name);
    } else {
      close();
    }
  };

  /* ---------- knob ---------- */
  let knob = { value: 0, min: 0, max: 1 };
  if (screen === "cuKbd") knob = { value: 50, min: 0, max: 100 };
  else if (overlay?.type === "pwd") knob = pwdKnobSpec(overlay);
  else if (overlay?.type === "list")
    knob = { value: overlay.idx, min: 0, max: LISTS[overlay.key].length - 1 };
  else if (overlay?.type === "num")
    knob = { value: overlay.value, min: 0, max: 100 };
  else if (overlay?.type === "ip")
    knob = {
      value: overlay.parts[overlay.pos],
      min: overlay.min1 && overlay.pos === 0 ? 1 : 0,
      max: 255,
    };
  else if (overlay?.type === "addr")
    knob = { value: Number(overlay.text) || 0, min: 0, max: 99999999 };
  else if (screen === "cuErr")
    knob = { value: sel.err, min: 0, max: Math.max(0, ERRORS.length - 1) };
  else if (screen === "cuInv")
    knob = { value: sel.inv, min: 0, max: INVENTORY.length - 1 };
  else if (screen === "cu3")
    knob = { value: sel.radio, min: 0, max: Math.max(0, radios.length - 1) };

  const onKnob = (val) => {
    if (screen === "cuKbd") return noteKey("Knob");
    if (overlay) {
      setOverlay((o) => {
        if (o.type === "pwd") return pwdKnob(o, val);
        if (o.type === "list") return { ...o, idx: val };
        if (o.type === "num") return { ...o, value: val, typing: false };
        if (o.type === "ip") {
          const parts = [...o.parts];
          parts[o.pos] = val;
          return { ...o, parts, typing: false };
        }
        if (o.type === "addr") return { ...o, text: String(val), typing: false };
        return o;
      });
      return;
    }
    if (screen === "cuErr") setSel((s) => ({ ...s, err: val }));
    else if (screen === "cuInv") setSel((s) => ({ ...s, inv: val }));
    else if (screen === "cu3") setSel((s) => ({ ...s, radio: val }));
  };
  const knobPress = () => (screen === "cuKbd" ? noteKey("Knob press") : enter());

  /* ---------- menu object for <MenuScreen/> ---------- */
  let menu = null;
  if (screen) {
    const def = buildDef();
    const decorate = (item) =>
      overlay?.type === "list" && item.id && item.id === overlay.key
        ? { ...item, popup: { options: LISTS[item.id], index: overlay.idx } }
        : item;
    menu = {
      title: TITLES[screen],
      left: pad(def.left, 6).map(decorate),
      right: pad(def.right, 6).map(decorate),
      bottom: def.bottom ? pad(def.bottom, 3).map(decorate) : null,
      body: (
        <>
          {renderBody()}
          {renderOverlay()}
        </>
      ),
    };
  }

  return {
    active: screen !== null,
    userLevel: cfg.userLevel,
    menu,
    knob,
    open,
    close,
    reset,
    softKey,
    keypad,
    enter,
    esc,
    homeKey,
    onKnob,
    knobPress,
  };
}
