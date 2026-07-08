import { useEffect, useState } from "react";

export type MotionIntensity = "low" | "standard";
const KEY = "motion-intensity";

export function readMotionIntensity(): MotionIntensity {
  if (typeof window === "undefined") return "standard";
  const v = window.localStorage.getItem(KEY);
  return v === "low" ? "low" : "standard";
}

export function applyMotionIntensity(v: MotionIntensity) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("motion-low", v === "low");
}

/** Client-only hook. SSR renders "standard"; real value applied after mount. */
export function useMotionIntensity(): [MotionIntensity, (v: MotionIntensity) => void] {
  const [value, setValue] = useState<MotionIntensity>("standard");
  useEffect(() => {
    const v = readMotionIntensity();
    setValue(v);
    applyMotionIntensity(v);
  }, []);
  const update = (v: MotionIntensity) => {
    setValue(v);
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, v);
    applyMotionIntensity(v);
  };
  return [value, update];
}
