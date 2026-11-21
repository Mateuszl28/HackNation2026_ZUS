"use client";
import { useEffect, useState } from "react";
import { Contrast, Type } from "lucide-react";

const SIZES = ["100%", "112.5%", "125%"];

/** Ułatwienia dostępu: rozmiar tekstu (A / A+ / A++) i wysoki kontrast – zapamiętywane w przeglądarce. */
export default function A11y({ compact }: { compact?: boolean }) {
  const [size, setSize] = useState(0);
  const [hc, setHc] = useState(false);

  useEffect(() => {
    try {
      setSize(+(localStorage.getItem("zpr-size") ?? 0) || 0);
      setHc(localStorage.getItem("zpr-hc") === "1");
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.style.fontSize = SIZES[size];
    document.documentElement.dataset.contrast = hc ? "high" : "";
    try {
      localStorage.setItem("zpr-size", String(size));
      localStorage.setItem("zpr-hc", hc ? "1" : "0");
    } catch {}
  }, [size, hc]);

  return (
    <div className={`flex items-center gap-1 ${compact ? "" : "rounded-full border border-slate-200 bg-white p-0.5"}`}>
      <button onClick={() => setSize((s) => (s + 1) % SIZES.length)} className="flex h-8 items-center gap-0.5 rounded-full px-2 text-sm font-semibold text-slate-600 hover:bg-slate-100" title="Rozmiar tekstu" aria-label={`Rozmiar tekstu: ${SIZES[size]}`}>
        <Type size={15} />{["A", "A+", "A++"][size]}
      </button>
      <button onClick={() => setHc((v) => !v)} className={`grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100 ${hc ? "bg-ink text-white hover:bg-ink" : "text-slate-600"}`} title="Wysoki kontrast" aria-pressed={hc} aria-label="Wysoki kontrast">
        <Contrast size={15} />
      </button>
    </div>
  );
}
