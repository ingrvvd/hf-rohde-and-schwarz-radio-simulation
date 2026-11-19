import React, { useState, useEffect, useRef } from "react";

/* ------------------------------------------------------------------ *
 *  GPS Operational Menus (manual sect. 5.2.2)
 *
 *  1151 GPS OP  - without GPS Reporting option (position display only)
 *  1351 GPS OP  - with GPS Reporting (role, CRP, push / pull / auto push,
 *                 other position list)
 * ------------------------------------------------------------------ */

// Option key "GPS Reporting": true -> menu 1351, false -> menu 1151
export const GPS_REPORTING = true;

const FORMATS = ["GEO", "UTM", "MGRS"];
const IPULL_LIST = ["M3TR_MP1", "M3TR_MP2", "M3TR_MP4"];
const PTCP_LIST = ["BROADCAST", "M3SR_2", "M3TR_MP1", "M3TR_MP2", "M3TR_MP3"];

// Own position (taken from the manual figure: 11:36.6556 E  48:7.6841 N)
const OWN = { lat: 48 + 7.6841 / 60, lon: 11 + 36.6556 / 60, alt: 565, sats: 9 };

// Simulated other participants (offset from own position)
const PEERS = {
  M3SR_2: { dLat: -0.00004, dLon: -0.00001, alt: 550, sat: 9 },
  M3TR_MP1: { dLat: 0.0021, dLon: 0.0034, alt: 571, sat: 8 },
  M3TR_MP2: { dLat: -0.0102, dLon: 0.0057, alt: 543, sat: 10 },
  M3TR_MP3: { dLat: 0.015, dLon: -0.021, alt: 590, sat: 7 },
  M3TR_MP4: { dLat: 0.0004, dLon: -0.0007, alt: 562, sat: 9 },
};

/* ---------------- coordinate helpers ---------------- */
const rad = (d) => (d * Math.PI) / 180;

export function toUtm(lat, lon) {
  const a = 6378137;
  const f = 1 / 298.257223563;
  const k0 = 0.9996;
  const e2 = f * (2 - f);
  const ep2 = e2 / (1 - e2);
  const zone = Math.floor((lon + 180) / 6) + 1;
  const lon0 = (zone - 1) * 6 - 180 + 3;
  const phi = rad(lat);
  const lam = rad(lon - lon0);
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  const t = Math.tan(phi);
  const N = a / Math.sqrt(1 - e2 * s * s);
  const T = t * t;
  const C = ep2 * c * c;
  const A = c * lam;
  const M =
    a *
    ((1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 ** 3) / 256) * phi -
      ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * phi) +
      ((15 * e2 * e2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * phi) -
      ((35 * e2 ** 3) / 3072) * Math.sin(6 * phi));
  const easting =
    k0 *
      N *
      (A +
        ((1 - T + C) * A ** 3) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5) / 120) +
    500000;
  let northing =
    k0 *
    (M +
      N *
        t *
        ((A * A) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * A ** 4) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6) / 720));
  if (lat < 0) northing += 1e7;
  const band = "CDEFGHJKLMNPQRSTUVWXX"[Math.floor((lat + 80) / 8)];
  return { zone, band, easting, northing };
}

export function toMgrs(lat, lon) {
  const { zone, band, easting, northing } = toUtm(lat, lon);
  const cols = ["STUVWXYZ", "ABCDEFGH", "JKLMNPQR"][zone % 3];
  const rows = "ABCDEFGHJKLMNPQRSTUV";
  const col = cols[Math.floor(easting / 100000) - 1];
  const row = rows[(Math.floor(northing / 100000) + (zone % 2 === 0 ? 5 : 0)) % 20];
  const e = String(Math.floor(easting % 100000)).padStart(5, "0");
  const n = String(Math.floor(northing % 100000)).padStart(5, "0");
  return `${zone}${band} ${col}${row} ${e} ${n}`;
}

const dm = (x) => {
  const v = Math.abs(x);
  const d = Math.floor(v);
  return `${d}:${((v - d) * 60).toFixed(4)}`;
};

// Returns { pos, zone } in the selected display format
export function formatPos(lat, lon, fmt) {
  if (fmt === "UTM") {
    const u = toUtm(lat, lon);
    return {
      pos: `${Math.floor(u.easting)} E  ${Math.floor(u.northing)} N`,
      zone: `${u.zone}${u.band}`,
    };
  }
  if (fmt === "MGRS") {
    const m = toMgrs(lat, lon);
    return { pos: m, zone: m.split(" ")[0] };
  }
  return {
    pos: `${dm(lon)} ${lon >= 0 ? "E" : "W"}  ${dm(lat)} ${lat >= 0 ? "N" : "S"}`,
    zone: "---",
  };
}

const distBear = (lat, lon) => {
  const R = 6371000;
  const p1 = rad(OWN.lat);
  const p2 = rad(lat);
  const dp = p2 - p1;
  const dl = rad(lon - OWN.lon);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  const dist = 2 * R * Math.asin(Math.sqrt(h));
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  const bear = (Math.atan2(y, x) * 180) / Math.PI;
  return { dist: Math.round(dist), bear: Math.round((bear + 360) % 360) };
};

const gpsClock = () => {
  const iso = new Date().toISOString();
  return { time: iso.slice(11, 19), date: iso.slice(0, 10) };
};

const makeEntry = (name) => {
  const p = PEERS[name];
  const lat = OWN.lat + p.dLat;
  const lon = OWN.lon + p.dLon;
  return { name, lat, lon, alt: p.alt, vel: 0, sat: p.sat, ...distBear(lat, lon), ...gpsClock() };
};

/* ---------------- presentational helpers ---------------- */
const Cell2 = ({ a, av, b, bv }) => (
  <div className="flex">
    <div className="flex gap-1.5 w-[52%]">
      <span>{a}</span>
      <span className="text-blue-700 whitespace-nowrap">{av}</span>
    </div>
    <div className="flex gap-1.5 grow justify-between">
      <span>{b}</span>
      <span className="text-blue-700 whitespace-nowrap">{bv}</span>
    </div>
  </div>
);

const Box = ({ title, children }) => (
  <div className="absolute left-4 right-4 top-1/3 border border-slate-600 bg-slate-200 p-2 shadow-lg z-20">
    <div className="font-bold text-center border-b border-slate-600 mb-1">{title}</div>
    {children}
  </div>
);

export default function useGpsMenu({ reporting = GPS_REPORTING } = {}) {
  const [active, setActive] = useState(false);
  const [fmt, setFmt] = useState("GEO");
  const [role, setRole] = useState("Provider");
  const [crp, setCrp] = useState(false);
  const [opl, setOpl] = useState([]);
  const [oplSel, setOplSel] = useState(0);
  const [busy, setBusy] = useState({});
  const [overlay, setOverlay] = useState(null);
  const [clock, setClock] = useState(gpsClock());
  const timers = useRef([]);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setClock(gpsClock()), 1000);
    return () => clearInterval(t);
  }, [active]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const isCtr = role === "Controller";

  /* ---------- navigation ---------- */
  const open = () => {
    setOverlay(null);
    setClock(gpsClock());
    setActive(true);
  };
  const close = () => {
    setOverlay(null);
    setActive(false);
  };
  // Shut-down clears all received positions (manual 5.2.2.10)
  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setBusy({});
    setOpl([]);
    setOplSel(0);
    close();
  };

  /* ---------- actions ---------- */
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  // Keys that are greyed out while a transmission is running
  const transmit = (key, ms, names = []) => {
    setBusy((b) => ({ ...b, [key]: true }));
    later(() => {
      setBusy((b) => ({ ...b, [key]: false }));
      if (names.length) {
        setOpl((list) => {
          const next = [...list];
          names.forEach((n) => {
            const e = makeEntry(n);
            const i = next.findIndex((x) => x.name === n);
            if (i >= 0) next[i] = e;
            else next.push(e);
          });
          return next;
        });
      }
    }, ms);
  };
  const targets = (name) =>
    name === "BROADCAST" ? Object.keys(PEERS).filter((n) => n !== "M3TR_MP4") : [name];

  const optionsFor = (key) =>
    key === "fmt"
      ? FORMATS
      : key === "ipull"
      ? IPULL_LIST
      : key === "opl"
      ? opl.map((e) => e.name)
      : PTCP_LIST; // spull, apush

  const openList = (key, idx = 0) => setOverlay({ type: "list", key, idx });
  const toggleList = (key, idx = 0) =>
    overlay?.type === "list" && overlay.key === key ? setOverlay(null) : openList(key, idx);

  /* ---------- soft key definitions ---------- */
  const PREV = { label: "PREV", nav: true, action: close };
  const listKey = (id, label, extra = {}) => ({
    id,
    label,
    notch: true,
    action: () => toggleList(id, id === "fmt" ? FORMATS.indexOf(fmt) : id === "opl" ? oplSel : 0),
    ...extra,
  });
  const accuracy = {
    label: "Position\nAccuracy",
    action: () => setOverlay({ type: "acc" }),
  };

  const buildDef = () => {
    if (!reporting) {
      return {
        left: [PREV, {}, {}, accuracy],
        right: [{}, listKey("fmt", "GPS Fmt", { value: fmt })],
      };
    }
    return {
      left: [
        PREV,
        {
          label: "Role",
          value: role,
          notch: true,
          action: () => setRole((r) => (r === "Provider" ? "Controller" : "Provider")),
        },
        {
          label: "CRP",
          toggle: { labels: ["ON", "OFF"], on: !crp },
          disabled: !isCtr,
          action: () => setCrp((c) => !c),
        },
        accuracy,
      ],
      right: [
        {},
        listKey("fmt", "GPS Fmt", { value: fmt }),
        listKey("ipull", "Immediate\nPULL", { disabled: !isCtr || busy.ipull }),
        listKey("spull", "Scheduled\nPULL", { disabled: !isCtr || busy.spull }),
        listKey("opl", "Other Pos.\nList (OPL)", { disabled: opl.length === 0 }),
        listKey("apush", "Auto Push\nList", { disabled: !isCtr || busy.apush }),
      ],
      bottom: [
        {
          label: "Immediate\nPUSH",
          disabled: busy.ipush,
          action: () => transmit("ipush", 1200),
        },
        {
          label: "Scheduled\nPUSH",
          disabled: busy.spush,
          action: () => transmit("spush", 2000),
        },
        {
          label: "Clear\nOPL",
          disabled: opl.length === 0,
          action: () => {
            setOpl([]);
            setOplSel(0);
          },
        },
      ],
    };
  };

  /* ---------- central area ---------- */
  const own = formatPos(OWN.lat, OWN.lon, fmt);
  const fix = OWN.sats <= 2 ? "none" : OWN.sats <= 4 ? "2d" : "3d";

  const renderBody = () => {
    const cur = opl[oplSel];
    const oth = cur ? formatPos(cur.lat, cur.lon, fmt) : null;
    return (
      <div className="text-[10px] leading-[15px] -m-1">
        <Cell2 a="Time:" av={clock.time} b="Date:" bv={clock.date} />
        <div className="flex gap-1.5">
          <span>Pos.:</span>
          <span className="text-blue-700 whitespace-nowrap">{own.pos}</span>
        </div>
        <Cell2 a="Zone:" av={own.zone} b="Velocity:" bv="0 km/h" />
        <Cell2 a="Alt.:" av={`${OWN.alt} m`} b="Satellites:" bv={OWN.sats} />

        {reporting && (
          <>
            <div className="flex justify-between bg-blue-700 text-white px-0.5 mt-0.5">
              <span>Oth. Pos. List:</span>
              <span>{cur ? `${cur.name} - ${oplSel + 1}/${opl.length}` : "--- - 0/0"}</span>
            </div>
            <Cell2 a="Time:" av={cur ? cur.time : "--:--:--"} b="Date:" bv={cur ? cur.date : "--.--.--"} />
            <div className="flex gap-1.5">
              <span>Pos.:</span>
              <span className="text-blue-700 whitespace-nowrap">
                {oth ? oth.pos : "--:--.---- E  --:--.---- N"}
              </span>
            </div>
            <Cell2 a="Zone:" av={oth ? oth.zone : "---"} b="Vel.:" bv={cur ? `${cur.vel} km/h` : "--- km/h"} />
            <Cell2 a="Alt.:" av={cur ? `${cur.alt} m` : "--- m"} b="Sat.:" bv={cur ? cur.sat : "--"} />
            <Cell2 a="Bear.:" av={cur ? `${cur.bear} deg` : "--- deg"} b="Dist.:" bv={cur ? `${cur.dist} m` : "--- m"} />
          </>
        )}

        {overlay?.type === "acc" && (
          <Box title="Position Accuracy">
            <div>Horizontal: 4.099 m</div>
            <div>Vertical&nbsp;&nbsp;&nbsp;: 5.878 m</div>
            <div>Velocity&nbsp;&nbsp;&nbsp;: 0.330 km/h</div>
            <div className="text-right mt-1">Press ENT to confirm...</div>
          </Box>
        )}
        {overlay?.type === "num" && (
          <Box title="Auto Push Time (APT)">
            <div>
              To {overlay.target}:{" "}
              <span className="bg-white border border-slate-500 px-1">
                <span className="bg-blue-700 text-white px-0.5">{overlay.value}</span>
              </span>{" "}
              s
            </div>
          </Box>
        )}
      </div>
    );
  };

  /* ---------- user input ---------- */
  const softKey = (side, index) => {
    if (!active) return;
    if (overlay && overlay.type !== "list") return; // message box / editor need ENT or ESC
    const item = (buildDef()[side] || [])[index];
    if (!item || item.disabled || !item.action) {
      if (overlay) setOverlay(null);
      return;
    }
    if (overlay?.type === "list" && !(item.id && item.id === overlay.key)) setOverlay(null);
    item.action();
  };

  const keypad = (key) => {
    if (overlay?.type !== "num" || !/^[0-9]$/.test(String(key))) return;
    const d = Number(key);
    setOverlay((o) => {
      const next = o.typing ? o.value * 10 + d : d;
      return { ...o, value: next > 9999 ? d : next, typing: true };
    });
  };

  const enter = () => {
    if (!overlay) return;
    if (overlay.type === "acc") return setOverlay(null);

    if (overlay.type === "num") {
      // an interval of 0 disables a previously configured auto push
      if (overlay.value > 0) transmit("apush", 1500, targets(overlay.target));
      else transmit("apush", 800);
      return setOverlay(null);
    }

    if (overlay.type === "list") {
      const name = optionsFor(overlay.key)[overlay.idx];
      switch (overlay.key) {
        case "fmt":
          setFmt(name);
          break;
        case "opl":
          setOplSel(overlay.idx);
          break;
        case "ipull":
          transmit("ipull", 1200, [name]);
          break;
        case "spull":
          transmit("spull", 2000, targets(name));
          break;
        case "apush":
          return setOverlay({ type: "num", target: name, value: 60, typing: false });
        default:
          break;
      }
      setOverlay(null);
    }
  };

  const esc = () => {
    if (overlay) setOverlay(null);
    else close();
  };
  const homeKey = () => close();

  /* ---------- knob ---------- */
  let knob = { value: 0, min: 0, max: 1 };
  if (overlay?.type === "list")
    knob = { value: overlay.idx, min: 0, max: optionsFor(overlay.key).length - 1 };
  else if (overlay?.type === "num") knob = { value: overlay.value, min: 0, max: 9999 };

  const onKnob = (val) => {
    if (overlay?.type === "list") setOverlay((o) => ({ ...o, idx: val }));
    else if (overlay?.type === "num") setOverlay((o) => ({ ...o, value: val, typing: false }));
  };

  /* ---------- menu object for <MenuScreen/> ---------- */
  let menu = null;
  if (active) {
    const def = buildDef();
    const decorate = (item) =>
      overlay?.type === "list" && item.id && item.id === overlay.key
        ? { ...item, popup: { options: optionsFor(item.id), index: overlay.idx } }
        : item;
    const pad = (arr, n) => Array.from({ length: n }, (_, i) => arr[i] || {});
    menu = {
      title: reporting ? "1351 GPS OP" : "1151 GPS OP",
      icon: "scope",
      cipher: reporting,
      gpsFix: fix,
      left: pad(def.left, 6).map(decorate),
      right: pad(def.right, 6).map(decorate),
      bottom: def.bottom ? pad(def.bottom, 3).map(decorate) : null,
      body: renderBody(),
    };
  }

  return { active, menu, knob, open, close, reset, softKey, keypad, enter, esc, homeKey, onKnob, knobPress: enter };
}
