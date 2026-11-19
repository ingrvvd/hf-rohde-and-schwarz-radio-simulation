import React from "react";

/* ------------------------------------------------------------------ *
 *  Password / user level editor (manual sect. 3.6, Figures 3.68, 3.69)
 *
 *  - user levels 0 .. 2, default level 0 (no password)
 *  - default passwords: level 1 = 1234, level 2 = 2345
 *  - up to 32 characters (uppercase letters, numerals); the editor shows the
 *    15 rightmost characters
 *  - wheel: choose a character, "." confirms it (or, with no character
 *    pending, moves the cursor to the next displayed position)
 *  - keypad digits are entered directly
 *  - ESC / CLR deletes from the end of the password
 *  - text turns green as soon as it is a correct password for the needed level
 * ------------------------------------------------------------------ */

export const PASSWORDS = { 1: "1234", 2: "2345" };
export const CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MAX_LEN = 32;
const SHOWN = 15;

// level a password belongs to (0 = not a valid password)
export const passwordLevel = (text) =>
  text === PASSWORDS[1] ? 1 : text === PASSWORDS[2] ? 2 : 0;

// "Level 1/2" = the level 1 as well as the level 2 password is accepted
export const levelLabel = (need) =>
  `Level ${[1, 2].filter((l) => l >= need).join("/")}`;

export const newPasswordEditor = (extra = {}) => ({
  type: "pwd",
  need: 1,
  text: "",
  pos: 0, // edit position inside text (text.length = append position)
  cand: null, // character chosen with the wheel, not yet confirmed
  ...extra,
});

const putChar = (o, ch) => {
  let text = o.text;
  if (o.pos >= text.length) {
    if (text.length >= MAX_LEN) return { ...o, cand: null };
    text += ch;
    return { ...o, text, pos: text.length, cand: null };
  }
  text = text.slice(0, o.pos) + ch + text.slice(o.pos + 1);
  return { ...o, text, pos: o.pos + 1, cand: null };
};

// keypad: digits are entered at once, "." confirms the wheel character
// or selects the next position
export const pwdKeypad = (o, key) => {
  if (/^[0-9]$/.test(String(key))) return putChar(o, String(key));
  if (key === ".") {
    if (o.cand !== null) return putChar(o, CHARSET[o.cand]);
    const start = Math.max(0, o.text.length - SHOWN);
    return { ...o, pos: o.pos + 1 > o.text.length ? start : o.pos + 1 };
  }
  return o;
};

export const pwdKnob = (o, val) => ({ ...o, cand: Math.max(0, Math.min(CHARSET.length - 1, val)) });
export const pwdKnobSpec = (o) => ({ value: o.cand ?? 0, min: 0, max: CHARSET.length - 1 });

// ESC / CLR: drops a pending wheel character, then deletes from the end;
// on an empty password it closes the editor (returns null)
export const pwdClear = (o) => {
  if (!o) return null;
  if (o.cand !== null) return { ...o, cand: null };
  if (o.text.length === 0) return null;
  const text = o.text.slice(0, -1);
  return { ...o, text, pos: text.length };
};

export function PasswordPanel({ o, className = "" }) {
  const start = Math.max(0, o.text.length - SHOWN);
  const ok = passwordLevel(o.text) >= Math.max(1, o.need);
  const at = (idx, ch) => (idx === o.pos && o.cand !== null ? CHARSET[o.cand] : ch);
  return (
    <div
      className={`flex items-center gap-2 bg-slate-200 border-y border-slate-400 px-2 py-0.5 text-[10px] text-slate-800 ${className}`}
    >
      <div className="leading-tight shrink-0 w-14">
        Password
        <br />
        {levelLabel(o.need)}
      </div>
      <div
        className={`grow h-5 bg-white border border-slate-400 flex items-center px-0.5 font-mono font-bold text-[12px] ${
          ok ? "text-green-700" : "text-slate-800"
        }`}
      >
        {[...o.text.slice(start)].map((ch, i) => {
          const idx = start + i;
          return (
            <span key={idx} className={idx === o.pos ? "bg-blue-700 text-white" : ""}>
              {at(idx, ch)}
            </span>
          );
        })}
        {o.pos >= o.text.length && (
          <span className="bg-blue-700 text-white min-w-[0.6em] text-center">
            {o.cand !== null ? CHARSET[o.cand] : "\u00a0"}
          </span>
        )}
      </div>
    </div>
  );
}
