// Usage: cp docs/flows/addresses.example.json docs/flows/addresses.json, fill in PUBLIC G-addresses,
// then: node docs/flows/fill-addresses.mjs  → writes docs/flows/filled/tranche-round-N.json
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { StrKey } from "@stellar/stellar-sdk";

const dir = new URL(".", import.meta.url);
const addresses = JSON.parse(readFileSync(new URL("addresses.json", dir), "utf8"));
for (const [name, key] of Object.entries(addresses)) {
  if (typeof key === "string" && key.startsWith("S"))
    throw new Error(`${name} looks like a SECRET key. Use the public G-address.`);
  if (!StrKey.isValidEd25519PublicKey(key)) throw new Error(`${name} is not a valid G-address.`);
}
mkdirSync(new URL("filled/", dir), { recursive: true });
for (let n = 1; n <= 5; n++) {
  const graph = JSON.parse(readFileSync(new URL(`tranche-round-${n}.json`, dir), "utf8"));
  const recipients = graph.nodes.find((node) => node.type === "split").config.recipients;
  for (const r of recipients) {
    const name = r.address.replace(/^PENDING:/, "");
    if (!addresses[name]) throw new Error(`Round ${n}: missing address for ${name}.`);
    r.address = addresses[name];
  }
  if (new Set(recipients.map((r) => r.address)).size !== recipients.length)
    throw new Error(`Round ${n}: two recipients share an address.`);
  if (recipients.reduce((s, r) => s + r.bps, 0) !== 10000) throw new Error(`Round ${n}: bps must total 10000.`);
  writeFileSync(new URL(`filled/tranche-round-${n}.json`, dir), JSON.stringify(graph, null, 2) + "\n");
  console.log(`Round ${n}:`, recipients.map((r) => `${r.label} ${r.bps / 100}% → ${r.address.slice(0, 6)}…`).join(", "));
}
