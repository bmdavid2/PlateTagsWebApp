# Zebra Browser Print SDK

This app talks to the Zebra ZD621 through **Zebra Browser Print**. Two separate pieces are
involved, and only one of them is per-workstation:

1. **The Browser Print application** — a native background app, installed from Zebra
   (https://www.zebra.com/us/en/software/printer-software/browser-print.html), that runs a
   small local service the browser can reach. This genuinely must be installed on **every
   workstation that prints** (a webpage can't install local software for you). Configure
   your ZD621 as the default device in its settings after installing.

2. **The Browser Print JavaScript client** (`BrowserPrint-3.1.250.min.js`, committed in this
   `public/` directory and loaded by `index.html`) — this is just a generic static file that
   talks to whatever local service is running on `localhost`. It is **not** per-workstation:
   it's served by this site itself (including the deployed GitHub Pages build), so every
   workstation gets it automatically just by visiting the page. If you need to update the
   SDK version, replace the file here and update the filename referenced in `index.html`.

Without the Browser Print **application** running with a configured default printer, the app
still runs and generates ZPL (use **Copy ZPL**), but the **Print** button is disabled and
shows "Browser Print not detected".
