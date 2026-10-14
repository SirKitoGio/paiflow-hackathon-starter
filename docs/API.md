# Tranche API: reference for the frontend

All routes are same-origin Next.js routes under `/api/tranche/`. The browser never sees Paiflow tokens or secret keys. Members sign only in Freighter.

**Response envelope.** Success is `{ "data": … }`. An error is `{ "error": { "code", "message" } }` with an HTTP status. On `429`, wait the `Retry-After` header before trying again.

**POST requests** need `Content-Type: application/json`. The server checks the `Origin` header, so call these routes from the app page itself with `fetch`, not from another site. `lib/browser-api.ts` → `browserRequest(path, body?)` already does this and unwraps `data`.

**Amounts** are integer strings in **stroops** (1 XLM = `"10000000"`). Show them with `fromStroops()` from `lib/amount.ts`. Never use floats.

**Explorer links** come back ready to use as `explorerUrl` (Stellar Expert, testnet).

---

## 1. Group dashboard: `GET /api/tranche/group`
Works in every mode, so it's safe on first load.

```jsonc
{
  "id": "tranche-demo", "name": "Tranche Barkada",
  "contributionStroops": "10000000",
  "mode": "team",                 // "prepare" = payments off; "disabled" = server config problem
  "activeRound": 1,               // null when no round is open
  "vaultAccount": "G…", "fundAccount": "G…",
  "members": [{ "id": "m1", "slot": 1, "displayName": "Member 1", "publicKey": "G…" | null }],
  "destinations": [{ "slot": 1, "label": "Rent", "publicKey": "G…", "percentBps": 4500 }],
  "rounds": [{
    "index": 1, "receiverMemberId": "m1",
    "splitBps": { "now": 7700, "vault": 2000, "fund": 300 },
    "deadline": "2026-10-14T07:30:00Z",
    "members": { "m1": "paid", "m2": "due", "m3": "pending", "m4": "late" }
  }]
}
```
Member status values: `paid` (SUCCESS confirmed) · `pending` (submitted, not final) · `due` (not paid, deadline not passed) · `late` (deadline passed, not paid).
Find "who am I" by matching the connected Freighter address against `members[].publicKey`.

## 2. Pay: `POST /api/tranche/pay`, then `GET /api/tranche/pay/status`

**Step 1. Prepare.** Body: `{ "round": 1, "from": "<member G-address>" }`
The server sets the amount (`contributionStroops`). Response:
```jsonc
{ "xdr": "…", "networkPassphrase": "Test SDF Network ; September 2015", "network": "testnet",
  "expiresAt": "…", "txHash": "…", "amountStroops": "10000000", "preparationRequestId": "…" }
```
If the member opens Pay again while an unsigned preparation is still valid, the **same** preparation comes back. It is never a second payment.

**Step 2. Sign** in Freighter: `signPrepared(prepared, address)` from `lib/wallet.ts`. It checks testnet, expiry and the wallet address. **About 180 seconds** to sign.

**Step 3. Submit.** Body: `{ "round": 1, "signedXdr": "…" }`. Response: a contribution:
```jsonc
{ "id": "…", "round": 1, "memberId": "m1", "from": "G…", "amountStroops": "10000000",
  "txHash": "…", "status": "SUCCESS" | "PENDING" | "FAILED" | "REJECTED" | "UNKNOWN", "ledger": 123 }
```

**Step 4. If not SUCCESS:** poll `GET /api/tranche/pay/status?round=1&txHash=<hash>` every **5–10 s**, honouring `Retry-After`, until `SUCCESS` or `FAILED`.
- On a network error or 5xx at submit: **resend the same `signedXdr`**, never prepare a new payment. The server always resubmits the first stored envelope.
- Show "Paid ✓" only on `status: "SUCCESS"`. An HTTP 200 alone is not proof.

**Pay errors to handle:**
| HTTP / code | Meaning | UI |
|---|---|---|
| 403 `PREPARATION_MODE` | Server in prepare mode | "Payments are off" |
| 403 `FORBIDDEN` | Wallet isn't a group member | "Connect a member wallet" |
| 409 `ROUND_NOT_ACTIVE` | Not the current round | Show the active round |
| 409 `CONFLICT` | Already paid, or a payment is in progress | Show the status, then check status |
| 404 `NOT_FOUND` (submit) | Envelope wasn't prepared by this server | Start again from Prepare |
| 422 `VALIDATION` | Bad input / not testnet | Show the message |
| 429 `RATE_LIMITED` | Too fast | Wait `Retry-After` |

## 3. Ledger: `GET /api/tranche/ledger`
Reads new Paiflow events (also catches payments made on Paiflow's hosted trigger page, after a SUCCESS check). Don't poll faster than every **15–30 s**.
```jsonc
{
  "live": true,                    // false in prepare mode (local records only)
  "contributions": [{
    "member": "Member 1", "round": 1, "status": "SUCCESS", "source": "app" | "hosted",
    "txHash": "…", "explorerUrl": "https://stellar.expert/explorer/testnet/tx/…",
    "payouts": [                    // the split of this payment
      { "label": "Rent",   "address": "G…", "bps": 4500, "amountStroops": "4500000" },
      { "label": "Wallet", "address": "G…", "bps": 3200, "amountStroops": "3200000" },
      { "label": "Vault",  "address": "G…", "bps": 2000, "amountStroops": "2000000" },
      { "label": "Fund",   "address": "G…", "bps": 300,  "amountStroops": "300000" }
    ]
  }],
  "events": [{ "kind": "RECEIVE" | "PAYOUT", "txHash": "…", "round": 1, "occurredAt": "…", "explorerUrl": "…" }],
  "releases": [{ "kind": "release" | "forfeit" | "cover", "source": "vault" | "fund", "status": "…", "amountStroops": "…", "explorerUrl": "…" | null }]
}
```

## 4. Vault: `GET /api/tranche/vault`
```jsonc
{
  "shares": [{ "memberId": "m1", "receiverRound": 1, "heldStroops": "4000000",
               "releasedStroops": "0", "remainingStroops": "4000000", "paymentsDue": 4 }],
  "vault": { "account": "G…", "threshold": 3, "masterWeight": 0, "nativeBalance": "…",
             "signers": [{ "key": "G…", "weight": 1, "member": "Member 1" }] } | null,
  "fund":  { …same shape… } | null,
  "releases": [{
    "id": "uuid", "kind": "release" | "forfeit" | "cover", "source": "vault" | "fund",
    "memberId": "m1", "member": "Member 1", "round": 2, "destination": "G…",
    "amountStroops": "…", "status": "COLLECTING" | "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED",
    "signers": ["G…"], "weight": 1, "threshold": 3,
    "xdr": "…",                     // present only while COLLECTING: this is what members sign
    "expiresAt": "…", "txHash": "…"
  }]
}
```
Show signature progress as `weight / threshold` (for example 2/3). `masterWeight: 0` plus 5 signers means the multisig is safely set up.

**Create a payment** (each returns a release with `status: "COLLECTING"` and its `xdr`):
| Purpose | Route | Body | Allowed when |
|---|---|---|---|
| Release a held tranche to its receiver | `POST /api/tranche/vault/release` | `{ "memberId": "m1", "round": 2 }` | m1 paid round 2 with SUCCESS, and m1 has a held tranche |
| Safety Fund covers a missed payment | `POST /api/tranche/fund/cover` | `{ "memberId": "m4", "round": 2 }` | Round 2 deadline passed and m4 is `late` |
| Late member forfeits their held tranche | `POST /api/tranche/vault/forfeit` | `{ "memberId": "m1", "round": 3 }` | m1 is `late` in round 3 and still holds a tranche |

Only **one open payment per account** (vault or fund) at a time. A second one gets 409.

**Sign** (each member, one after another): sign the release's `xdr` in Freighter:
```ts
import { signTransaction } from "@stellar/freighter-api";
const { signedTxXdr } = await signTransaction(release.xdr, {
  networkPassphrase: "Test SDF Network ; September 2015", address });
```
Then `POST /api/tranche/vault/release/<id>/sign` with `{ "signedXdr": signedTxXdr }`. This works for vault and fund payments alike. The response is the release plus `weight` and `threshold`. When the weight reaches the threshold, the server submits to Stellar, and `status` becomes `SUCCESS` (or `PENDING`).
- `PENDING`: poll `GET /api/tranche/vault/release/<id>/sign` every 5–10 s until `SUCCESS` or `FAILED`.
- After each signature, reload `GET /api/tranche/vault`, so the next member signs the newest `xdr`.

**Cancel** an unsigned payment: `POST /api/tranche/vault/release/<id>/cancel` (body `{}`). Allowed only before anyone has signed. Unsigned payments also expire automatically after 1 hour.

---

## Demo data (live, testnet)
- Round 1 deployment: `c091ee3b-cc09-4704-b1e2-e41b326aede7`
- Member 1: `GCXRU43SEU2YDEEV4ZALE3SPKTZJ3SGV4C47F562CV2LHCGPE5IAJFUI` (already paid round 1 on the hosted page)
- Proof: see `docs/QUALIFICATION.md`

Run the backend locally: `npx pnpm@10.4.1 dev`. Server settings live in `.env.local`; ask Keith for the values, and never commit them.
