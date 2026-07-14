import { useState } from "react";
import { isBrowserPrintAvailable, printZpl } from "../print/browserPrint";

// Print controls: show the generated ZPL, copy it, and send to the default
// Zebra printer via Browser Print.

export function PrintPanel({ zpl, disabled }: { zpl: string; disabled?: boolean }) {
  const [status, setStatus] = useState<{ kind: "ok" | "error" | "idle"; msg: string }>({
    kind: "idle",
    msg: "",
  });
  const [printing, setPrinting] = useState(false);
  const available = isBrowserPrintAvailable();

  async function handlePrint() {
    setPrinting(true);
    setStatus({ kind: "idle", msg: "Sending to printer…" });
    try {
      await printZpl(zpl);
      setStatus({ kind: "ok", msg: "Sent to printer." });
    } catch (e) {
      setStatus({ kind: "error", msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setPrinting(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(zpl);
    setStatus({ kind: "ok", msg: "ZPL copied to clipboard." });
  }

  return (
    <div>
      {!available && (
        <p className="status error">
          Zebra Browser Print not detected. Install/run it on this workstation to print;
          you can still copy the ZPL below.
        </p>
      )}
      <div className="row-actions">
        <button onClick={handlePrint} disabled={disabled || printing || !available}>
          {printing ? "Printing…" : "Print"}
        </button>
        <button className="secondary" onClick={handleCopy} disabled={disabled}>
          Copy ZPL
        </button>
      </div>
      {status.kind !== "idle" && <p className={`status ${status.kind}`}>{status.msg}</p>}
      <pre className="zpl-dump">{zpl || "// ZPL will appear here"}</pre>
    </div>
  );
}
