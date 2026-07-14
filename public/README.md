# Zebra Browser Print SDK

This app talks to the Zebra ZD621 through **Zebra Browser Print**. Two pieces are
required on each workstation that prints:

1. **The Browser Print application** — install from Zebra
   (https://www.zebra.com/us/en/software/printer-software/browser-print.html).
   It runs a small local service the browser can reach. Configure your ZD621 as
   the default device in the Browser Print settings.

2. **The Browser Print JavaScript client** — a file named like
   `BrowserPrint-3.1.250.min.js`, obtained from the same Zebra download. Place it
   in this `public/` directory so it is served at the site root and loaded by
   `index.html`. Update the filename in `index.html` if your version differs.

Without these, the app still runs and generates ZPL (use **Copy ZPL**), but the
**Print** button is disabled and shows "Browser Print not detected".
