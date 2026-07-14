// Thin wrapper around Zebra Browser Print (window.BrowserPrint), loaded by a
// <script> in index.html and served by the Browser Print app on the workstation.
//
// Docs: https://www.zebra.com/us/en/software/printer-software/browser-print.html
// The global exposes getDefaultDevice / getLocalDevices and each device has a
// .send(data, success, error) method that transmits raw ZPL.

/** Minimal shape of a Browser Print device we rely on. */
export interface BrowserPrintDevice {
  name: string;
  uid: string;
  connection: string;
  deviceType: string;
  send(data: string, success?: () => void, error?: (msg: string) => void): void;
  readAllAvailable?(success: (data: string) => void, error: (msg: string) => void): void;
}

interface BrowserPrintGlobal {
  getDefaultDevice(
    type: string,
    success: (device: BrowserPrintDevice) => void,
    error: (msg: string) => void,
  ): void;
  getLocalDevices(
    success: (devices: Record<string, BrowserPrintDevice[]>) => void,
    error: (msg: string) => void,
    type?: string,
  ): void;
}

declare global {
  interface Window {
    BrowserPrint?: BrowserPrintGlobal;
  }
}

export function isBrowserPrintAvailable(): boolean {
  return typeof window !== "undefined" && !!window.BrowserPrint;
}

function requireBrowserPrint(): BrowserPrintGlobal {
  if (!window.BrowserPrint) {
    throw new Error(
      "Zebra Browser Print is not available. Install and run the Browser Print app on this workstation.",
    );
  }
  return window.BrowserPrint;
}

/**
 * Resolve the default printer configured in Browser Print.
 *
 * Note: Browser Print invokes the *success* callback with `null` when no
 * default device is configured (rather than the error callback), so we treat a
 * null device as "no default" and reject with a clear message instead of
 * resolving null (which would later crash on `device.send`).
 */
export function getDefaultPrinter(): Promise<BrowserPrintDevice | null> {
  const bp = requireBrowserPrint();
  return new Promise((resolve, reject) => {
    bp.getDefaultDevice(
      "printer",
      (device) => resolve(device ?? null),
      (msg) => reject(new Error(msg || "No default printer")),
    );
  });
}

/** List all local printers Browser Print can see. */
export function listPrinters(): Promise<BrowserPrintDevice[]> {
  const bp = requireBrowserPrint();
  return new Promise((resolve, reject) => {
    bp.getLocalDevices(
      (devices) => resolve(devices.printer ?? []),
      (msg) => reject(new Error(msg || "Could not list printers")),
      "printer",
    );
  });
}

/** Send raw ZPL to a device. */
export function sendZpl(device: BrowserPrintDevice, zpl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    device.send(
      zpl,
      () => resolve(),
      (msg) => reject(new Error(msg || "Print failed")),
    );
  });
}

/**
 * Convenience: send ZPL to the default printer, falling back to the first local
 * printer if no default is configured. Throws a clear error if none is found.
 */
export async function printZpl(zpl: string): Promise<void> {
  let device = await getDefaultPrinter();
  if (!device) {
    const printers = await listPrinters();
    device = printers[0] ?? null;
  }
  if (!device) {
    throw new Error(
      "No Zebra printer found. Open the Browser Print app and set your ZD621 as the default device.",
    );
  }
  await sendZpl(device, zpl);
}
