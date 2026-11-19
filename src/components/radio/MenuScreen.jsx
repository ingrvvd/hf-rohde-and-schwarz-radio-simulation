import React from "react";
import { Wrench, Activity, Radio, Lock } from "lucide-react";

/**
 * Generic menu screen used by the Fill Gun domain and the Control Unit
 * Maintenance menus.
 *
 * menu = {
 *   title:  "4001 CU MTC 1/4",
 *   left:   [6 items], right: [6 items], bottom: [3 items] | null,
 *   body:   ReactNode (central area)
 * }
 *
 * item = { label, value, nav, notch, disabled, hot, toggle:{labels,on}, popup:{options,index} }
 */
function Cell({ item = {}, side, idx = 0 }) {
  const has = item.label || item.toggle;
  const popupPos =
    side === "left"
      ? idx >= 3 ? "left-full bottom-0" : "left-full top-0"
      : side === "right"
      ? idx >= 3 ? "right-full bottom-0" : "right-full top-0"
      : "bottom-full left-0";

  return (
    <div
      className={`relative flex-1 min-h-0 border flex flex-col items-center justify-center text-center leading-tight ${
        item.hot
          ? "bg-blue-700 border-blue-900 text-white"
          : has
          ? "bg-slate-100 border-slate-400"
          : "bg-slate-200 border-slate-300"
      }`}
    >
      {item.nav && (
        <span
          className={`absolute top-0 text-[8px] leading-none text-slate-700 ${
            side === "right" ? "left-1" : "right-1"
          }`}
        >
          •••
        </span>
      )}
      {item.notch && (
        <span
          className={`absolute top-0 w-1.5 h-1 bg-slate-300 border border-slate-500 ${
            side === "right" ? "left-0" : "right-0"
          }`}
        />
      )}

      {item.locked && (
        <Lock
          size={8}
          className={`absolute top-0.5 text-slate-700 ${side === "right" ? "right-0.5" : "left-0.5"}`}
        />
      )}

      {item.label && (
        <span
          className={`text-[9px] font-semibold whitespace-pre-line ${
            item.disabled
              ? "text-slate-400"
              : item.hot
              ? "text-white"
              : "text-slate-700"
          }`}
        >
          {item.label}
        </span>
      )}
      {item.value && (
        <span
          className={`text-[9px] whitespace-nowrap ${
            item.disabled ? "text-slate-400" : "text-blue-700"
          }`}
        >
          {item.value}
        </span>
      )}
      {item.toggle && (
        <div className="flex flex-col items-center">
          <div className={`flex text-[9px] leading-tight border border-slate-400 ${item.disabled ? "opacity-40" : ""}`}>
            {item.toggle.labels.map((l, i) => (
              <span
                key={l}
                className={`px-1 ${
                  item.toggle.on === "both" || (i === 1) === item.toggle.on
                    ? "bg-blue-700 text-white"
                    : "text-slate-700"
                }`}
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      )}

      {item.popup && (
        <div
          className={`absolute z-30 ${popupPos} bg-slate-200 border border-slate-500 shadow-md`}
        >
          {(() => {
            const n = item.popup.options.length;
            const win = 7;
            const start = n > win ? Math.max(0, Math.min(n - win, item.popup.index - 3)) : 0;
            return item.popup.options.slice(start, start + win).map((opt, j) => [opt, start + j]);
          })().map(([opt, k]) => (
            <div
              key={`${opt}-${k}`}
              className={`px-1.5 py-px text-[10px] font-mono leading-tight whitespace-nowrap text-left ${
                k === item.popup.index
                  ? "bg-blue-700 text-white"
                  : "text-slate-800"
              }`}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MenuScreen({ menu }) {
  const { title, left, right, bottom, bottomSpan, body, icon, cipher, gpsFix, ch, rname = "SPCONT_8" } = menu;
  const fixColor = { none: "bg-slate-300", "2d": "bg-blue-600", "3d": "bg-blue-600 ring-2 ring-red-500" }[gpsFix];

  return (
    <div className="w-full h-full bg-white flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="h-11 bg-slate-100 border-b border-slate-300 flex items-center justify-between px-2 text-[10px] font-bold text-slate-800 shrink-0">
        <div className="flex items-center gap-1.5">
          {icon === "ff" ? (
            <span className="flex flex-col items-center justify-center w-6 h-7 bg-blue-700 text-white rounded-sm leading-none">
              <Radio size={12} />
              <span className="text-[8px] font-bold">FF</span>
            </span>
          ) : icon === "home" ? (
            <Radio size={22} className="text-blue-700 border border-blue-700 rounded-sm p-px" />
          ) : icon === "scope" ? (
            <Activity size={20} className="text-blue-700 border border-blue-700 rounded-sm p-px" />
          ) : (
            <Wrench size={20} className="text-slate-600" />
          )}
          <div className="leading-tight">
            <div>{title}</div>
            <div className="flex gap-2">
              {cipher ? (
                <span className="font-semibold text-slate-700">CIPH.</span>
              ) : (
                <span className="text-red-700">PLAIN</span>
              )}
              <span className="font-semibold text-slate-700">R: {rname}</span>
            </div>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-blue-700">
          {ch && <span className="font-semibold text-slate-700">{ch}</span>}
          {gpsFix && <span className={`w-2.5 h-2.5 rounded-full ${fixColor}`} title={`GPS fix: ${gpsFix}`} />}
          ADV
        </span>
      </div>

      <div className="grow flex min-h-0">
        {(() => {
          const leftCol = (
            <div className="w-24 flex flex-col shrink-0">
              {left.map((item, i) => (
                <Cell key={i} item={item} side="left" idx={i} />
              ))}
            </div>
          );
          const centre = (
            <div className="grow relative p-2 overflow-hidden text-[11px] text-slate-800 min-w-0">
              {body}
            </div>
          );
          const bottomRow = bottom && (
            <div className="h-10 flex shrink-0">
              {bottom.map((item, i) => (
                <Cell key={i} item={item} side="bottom" />
              ))}
            </div>
          );

          // bottomSpan: the bottom soft keys start under the LEFT soft-key
          // column and run across the centre (home screen layout)
          if (bottomSpan) {
            return (
              <div className="grow flex flex-col min-w-0">
                <div className="grow flex min-h-0">
                  {leftCol}
                  {centre}
                </div>
                {bottomRow}
              </div>
            );
          }
          return (
            <>
              {leftCol}
              <div className="grow flex flex-col min-w-0">
                {centre}
                {bottomRow}
              </div>
            </>
          );
        })()}

        {/* Right soft keys */}
        <div className="w-24 flex flex-col shrink-0">
          {right.map((item, i) => (
            <Cell key={i} item={item} side="right" idx={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
