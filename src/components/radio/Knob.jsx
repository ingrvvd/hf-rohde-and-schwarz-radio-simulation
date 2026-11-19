import React, { useEffect, useMemo, useRef } from "react";

export default function Knob({
  value,
  onChange,
  onPress,
  min = 0,
  max = 100,
  size = "large",
}) {
  const ref = useRef(null);
  const valueRef = useRef(value);
  const dragRef = useRef({ active: false, lastAngle: 0, remainder: 0, moved: false });
  const suppressClickRef = useRef(false);

  const rotation = useMemo(() => {
    const range = max - min || 1;
    const percentage = Math.min(1, Math.max(0, (value - min) / range));
    return -140 + percentage * 280;
  }, [value, min, max]);

  // Keep the latest value available to rapid pointer/wheel events. This avoids
  // multiple events using an outdated React render value and jumping to the end.
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const updateBy = (steps) => {
    if (!steps) return;
    const nextValue = Math.min(max, Math.max(min, valueRef.current + Math.sign(steps)));
    valueRef.current = nextValue;
    onChange(nextValue);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleWheel = (event) => {
      event.preventDefault();
      updateBy(-Math.sign(event.deltaY));
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [value, min, max, onChange]);

  const getPointerAngle = (event) => {
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(event.clientY - cy, event.clientX - cx) * (180 / Math.PI);
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      lastAngle: getPointerAngle(event),
      remainder: 0,
      moved: false,
    };
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag.active) return;

    const angle = getPointerAngle(event);
    let difference = angle - drag.lastAngle;

    // Keep movement continuous when crossing the -180/180 degree boundary.
    if (difference > 180) difference -= 360;
    if (difference < -180) difference += 360;

    drag.lastAngle = angle;
    if (Math.abs(difference) > 0.1) drag.moved = true;
    drag.remainder += difference;

    // Treat each rotation threshold as exactly one detent. A large mouse
    // movement must not skip several preset entries in a single event.
    if (Math.abs(drag.remainder) >= 12) {
      updateBy(Math.sign(drag.remainder));
      drag.remainder = 0;
    }
  };

  const handlePointerUp = (event) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    drag.active = false;
    if (drag.moved) {
      suppressClickRef.current = true;
      // Clear the click-suppression flag after the browser's synthesized click.
      requestAnimationFrame(() => {
        suppressClickRef.current = false;
      });
    }
    if (ref.current?.hasPointerCapture(event.pointerId)) {
      ref.current.releasePointerCapture(event.pointerId);
    }
  };

  const handleClick = () => {
    if (suppressClickRef.current) return;
    onPress?.();
  };

  const knobSize = size === "large" ? 120 : 80;

  return (
    <div
      ref={ref}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleClick}
      className="relative rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing group select-none touch-none"
      style={{ width: knobSize, height: knobSize }}
      role="slider"
      aria-label="Tuning knob"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      tabIndex={0}
    >
      <div className="absolute inset-0 rounded-full border-2 border-slate-100 pointer-events-none" />
      <div
        className="w-3/4 h-3/4 rounded-full bg-linear-to-br from-white to-slate-100 shadow-[0_4px_10px_rgba(0,0,0,0.1)] border border-slate-200 relative transition-transform duration-75 ease-out pointer-events-none"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-1/4 h-1/4 rounded-full bg-linear-to-b from-slate-200 to-white shadow-inner" />
      </div>
    </div>
  );
}
