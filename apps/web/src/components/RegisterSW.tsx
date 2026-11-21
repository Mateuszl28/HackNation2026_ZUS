"use client";
import { useEffect } from "react";

/** Rejestruje service worker (instalacja jako aplikacja, przewodnik offline). Tylko w produkcji. */
export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
