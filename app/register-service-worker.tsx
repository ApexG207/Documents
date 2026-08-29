"use client";
import { useEffect } from "react";
export default function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    const installed = () => {
      localStorage.setItem("matiq_archive_setup_required", "true");
      window.location.assign("/archive?installed=1");
    };
    window.addEventListener("appinstalled", installed);
    return () => window.removeEventListener("appinstalled", installed);
  }, []);
  return null;
}
