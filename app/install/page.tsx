"use client";
import { useEffect, useState } from "react";
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export default function InstallPage() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null),
    [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const ready = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const done = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  }
  return (
    <main className="privacy">
      <header>
        <p>MATIQ PWA</p>
        <h1>Install matIQ</h1>
        <span>Use matIQ like an app without an app-store account.</span>
      </header>
      <section>
        {installed ? (
          <p>
            <b>matIQ is installed on this device.</b>
          </p>
        ) : (
          prompt && <button onClick={install}>Install matIQ</button>
        )}
        <h2>iPhone and iPad</h2>
        <ol>
          <li>Open this page in Safari.</li>
          <li>Tap the Share button.</li>
          <li>
            Select <b>Add to Home Screen</b>, then <b>Add</b>.
          </li>
        </ol>
        <h2>Windows</h2>
        <ol>
          <li>Open matIQ in Microsoft Edge.</li>
          <li>Select the app-install icon in the address bar or choose Apps → Install matIQ.</li>
          <li>Confirm installation and pin it if desired.</li>
        </ol>
        <h2>Android</h2>
        <ol>
          <li>Open matIQ in Chrome.</li>
          <li>
            Choose <b>Install app</b> or <b>Add to Home screen</b>.
          </li>
        </ol>
        <p>
          Installation does not change your account, privacy controls, or academy permissions.
          Network access is required for authenticated records and payments.
        </p>
        <a href="/">Return to matIQ →</a>
      </section>
    </main>
  );
}
