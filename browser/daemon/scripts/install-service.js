#!/usr/bin/env node
/**
 * Windows service installer for Unykorn Daemon using node-windows.
 * Optional — most operators will just run: npm start
 *
 * Usage: node scripts/install-service.js [--uninstall]
 */
"use strict";
import { Service } from "node-windows";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENTRY = path.join(__dirname, "..", "server.js");

const svc = new Service({
  name:        "Unykorn Daemon",
  description: "Unykorn Sovereign Browser companion agent daemon",
  script:      ENTRY,
  nodeOptions: [],
  env: [
    { name: "NODE_ENV", value: "production" },
  ],
});

if (process.argv.includes("--uninstall")) {
  svc.on("uninstall", () => console.log("Unykorn Daemon uninstalled."));
  svc.uninstall();
} else {
  svc.on("install", () => { svc.start(); console.log("Unykorn Daemon installed & started."); });
  svc.install();
}
