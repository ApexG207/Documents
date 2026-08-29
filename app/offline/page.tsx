export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#0f0f0f",
        color: "#fff",
      }}
    >
      <section style={{ maxWidth: 560, textAlign: "center" }}>
        <img src="/matiq-emblem.png" alt="matIQ" width="128" height="128" />
        <h1>Connection interrupted</h1>
        <p>
          Your private records were not cached on this device. Reconnect to securely resume matIQ.
        </p>
        <button onClick={undefined} style={{ padding: "12px 18px" }}>
          <a href="/" style={{ color: "inherit" }}>
            Try again
          </a>
        </button>
      </section>
    </main>
  );
}
