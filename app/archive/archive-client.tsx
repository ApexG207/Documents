"use client";
import { FormEvent, useEffect, useState } from "react";

type DirectoryHandle = {
  name: string;
  getFileHandle: (
    name: string,
    options: { create: boolean },
  ) => Promise<{
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};
type PickerWindow = Window & { showDirectoryPicker?: () => Promise<DirectoryHandle> };
const bytesToBase64 = (bytes: Uint8Array) => {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
};
async function encrypt(plain: string, passphrase: string, checksum: string) {
  const encoder = new TextEncoder(),
    salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12));
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plain)),
  );
  return JSON.stringify({
    format: "matiq-encrypted-local-archive-v1",
    algorithm: "AES-256-GCM",
    kdf: "PBKDF2-SHA256",
    iterations: 250000,
    checksum,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(cipher),
  });
}

export default function ArchiveClient() {
  const [folder, setFolder] = useState<DirectoryHandle | null>(null),
    [notice, setNotice] = useState(""),
    [saving, setSaving] = useState(false),
    [installTriggered, setInstallTriggered] = useState(false);
  useEffect(() => {
    const installed =
      new URLSearchParams(location.search).get("installed") === "1" ||
      localStorage.getItem("matiq_archive_setup_required") === "true";
    setInstallTriggered(installed);
  }, []);
  async function choose() {
    const picker = (window as PickerWindow).showDirectoryPicker;
    if (!picker) {
      setNotice(
        "Direct folder access is unavailable in this browser. MatIQ will use an encrypted download that you can move to the shared drive.",
      );
      return;
    }
    try {
      const selected = await picker();
      setFolder(selected);
      setNotice(`Archive destination selected: ${selected.name}`);
    } catch {
      setNotice("No archive folder was selected.");
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget),
      passphrase = String(data.get("passphrase") || ""),
      confirmation = String(data.get("confirmation") || "");
    if (passphrase.length < 14 || passphrase !== confirmation) {
      setNotice("Use a matching archive passphrase of at least 14 characters.");
      return;
    }
    setSaving(true);
    setNotice("Generating the adult-only archive…");
    try {
      const response = await fetch("/api/local-archive", { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(String(body.error || "archive_generation_failed"));
      }
      const payload = await response.text(),
        checksum = response.headers.get("x-matiq-checksum") || "",
        excluded = response.headers.get("x-matiq-minors-excluded") || "0",
        encrypted = await encrypt(payload, passphrase, checksum),
        stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-"),
        name = `matiq-adult-history-${stamp}.matiq`,
        blob = new Blob([encrypted], { type: "application/vnd.matiq.encrypted+json" });
      if (folder) {
        const handle = await folder.getFileHandle(name, { create: true }),
          writer = await handle.createWritable();
        await writer.write(blob);
        await writer.close();
        setNotice(
          `Encrypted archive saved to ${folder.name}. ${excluded} minor record(s) were excluded.`,
        );
      } else {
        const url = URL.createObjectURL(blob),
          link = document.createElement("a");
        link.href = url;
        link.download = name;
        link.click();
        URL.revokeObjectURL(url);
        setNotice(
          `Encrypted archive downloaded. Move it to the approved shared drive. ${excluded} minor record(s) were excluded.`,
        );
      }
      localStorage.removeItem("matiq_archive_setup_required");
    } catch (error) {
      setNotice(error instanceof Error ? `Archive failed: ${error.message}` : "Archive failed.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="archive-shell">
      <header>
        <div>
          <p>LOCAL HISTORICAL REPOSITORY</p>
          <h1>Minor-safe encrypted archive</h1>
          <span>
            Preserve adult training history on an approved local or mapped network drive until an
            enterprise cloud archive is retained.
          </span>
        </div>
        <a href="/">Return to MatIQ →</a>
      </header>
      {installTriggered && (
        <div className="archive-install">
          <b>Installation detected</b>
          <span>
            Complete the one-time archive setup. MatIQ will not access a folder without your
            selection.
          </span>
        </div>
      )}
      {notice && (
        <div className="archive-notice" role="status">
          {notice}
        </div>
      )}
      <section className="archive-grid">
        <article>
          <p>SAFEGUARD PROFILE</p>
          <h2>What the archive contains</h2>
          <ul>
            <li>Adult athlete identity and rank history</li>
            <li>Adult training, attendance, skills, goals, and promotion evidence</li>
            <li>Adult competition evaluation metadata</li>
            <li>Academy identity and cryptographic integrity checksum</li>
          </ul>
          <h3>Always excluded</h3>
          <ul className="excluded">
            <li>Every athlete under 18</li>
            <li>Guardian and consent records</li>
            <li>Raw images and video</li>
            <li>Email addresses and social links</li>
            <li>Payment, authentication, and verification data</li>
          </ul>
        </article>
        <form onSubmit={save}>
          <p>CONTROLLED SAVE</p>
          <h2>Configure the local repository</h2>
          <label>
            Archive folder
            <button type="button" className="folder-button" onClick={choose}>
              {folder ? `Selected: ${folder.name}` : "Choose local or shared-drive folder"}
            </button>
          </label>
          <small>
            On Windows, select the mapped network drive or approved shared folder. Unsupported
            browsers will produce an encrypted download.
          </small>
          <label>
            Archive passphrase
            <input
              name="passphrase"
              type="password"
              minLength={14}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            Confirm passphrase
            <input
              name="confirmation"
              type="password"
              minLength={14}
              autoComplete="new-password"
              required
            />
          </label>
          <div className="archive-warning">
            <b>Passphrase stays on this device</b>
            <span>
              MatIQ does not receive, retain, or recover the local encryption passphrase. Store it
              in an approved password manager.
            </span>
          </div>
          <button disabled={saving}>
            {saving ? "Encrypting and saving…" : "Create encrypted adult-only archive"}
          </button>
        </form>
      </section>
      <section className="archive-doctrine">
        <p>OPERATING DOCTRINE</p>
        <div>
          <article>
            <b>01 · INSTALL</b>
            <span>Installation opens setup; it does not grant filesystem access.</span>
          </article>
          <article>
            <b>02 · SELECT</b>
            <span>An administrator selects the approved local or mapped folder.</span>
          </article>
          <article>
            <b>03 · MINIMIZE</b>
            <span>The backend excludes every minor and high-risk data class.</span>
          </article>
          <article>
            <b>04 · ENCRYPT</b>
            <span>The browser encrypts the archive before the filesystem write.</span>
          </article>
          <article>
            <b>05 · VERIFY</b>
            <span>The archive carries a SHA-256 checksum and an auditable server event.</span>
          </article>
        </div>
      </section>
    </main>
  );
}
