Read `llms.md` first; it is the shared, event-neutral Paiflow API and product guide. Early Paiflow deployment, integration and test payments are allowed once the team has credentials. Keep prepare as the default; team mode can be selected before the event. For onboarding, credentials, submission requirements and judging, follow the participant's event primer and organiser instructions. Do not infer event rules from technical examples or another event's context pack. If event information is missing, ask the organisers. This is starter code, not a supported package — edit freely.

- Call Paiflow only through server-only `lib/paiflow.ts`; keep the deployment token in server environment variables. Never use `NEXT_PUBLIC_` for configuration or return tokens to the browser.
- Never handle a customer's secret key. Freighter signs XDR in the browser, using the prepared network passphrase. Refuse mainnet.
- Use `lib/amount.ts` for money. Amounts are decimal/stroops strings with bigint arithmetic, never floating-point numbers.
- Keep signed envelopes for PENDING and uncertain submission errors; retry that same envelope, never duplicate a payment.
- Privileged payout, early release and Schedule controls require the deny-by-default application authorizer in `lib/app-authorization.ts`. Implement trusted app session and ownership checks before enabling them.
- Run `pnpm typecheck`, `pnpm build && pnpm test` after edits. Check `.next/static` for credential leaks.

- Reusable deployment controls live in `components/deployment-panels.tsx`, with shared recovery in `lib/hooks/use-wallet-operation.ts` and pagination in `lib/hooks/use-activity.ts`. Capabilities are candidates, not live eligibility. Select nodes explicitly and refresh live state after confirmations.
- `lib/app-authorization.ts` denies privileged actions by default. Replace it with trusted session/role/ownership checks per action; wallet consent remains separate. Never expose arbitrary upstream routes or Webhook callback payloads through an unrestricted proxy. Preserve same-origin mutation checks.
- Persist the original prepared intent before signing and exact envelope before submit. Recovery is scoped by mode/platform/deployment and retains the consenting wallet. Never replace unknown or expired operations without documented platform proof. Preserve Web Locks and fail closed on storage errors. Never log recovery records.
- Webhook callers persist one stable logical event key and identical payload before sending, then retry that record after PENDING/UNKNOWN. Do not add a public callback route without app authorization and verified completed-task logic.
- Read-only hosted surface verification is recorded in `docs/staging-verification-2026-10-12.json`; live signed testnet flow acceptance is pending. Do not infer participant readiness from an OpenAPI response or pretend funds were transferred.

## Tranche backend

Setup: read `requirements.txt` first. It lists the system tools, the pinned packages and the install commands (`pnpm install --frozen-lockfile`, then `cp .env.example .env.local`).

- Group rules (members, slots, destinations, per-round split bps, deadlines) live in `config/group.json`. It holds public keys only. A `publicKey` of `null` means that account does not exist yet.
- Round 1 uses `PAIFLOW_DEPLOYMENT_ID`/`PAIFLOW_API_TOKEN`. Rounds 2+ use server-only `TRANCHE_ROUNDS_JSON`. Pass `round` to the `lib/paiflow.ts` functions; the default is round 1. Keep the mode guards.
- Server modules are in `lib/tranche/`: `registry.ts` (group config), `store.ts` (JSON ledger at `data/ledger.json`, serialised writes, gitignored), `ledger.ts` (contributions, events, vault shares), `vault.ts` (Horizon multisig releases).
- Routes are in `app/api/tranche/`: `group`, `pay` (`{round, from}` prepares, `{round, signedXdr}` submits), `pay/status`, `ledger`, `vault`, `vault/release`, `vault/release/[id]/sign`. Mutations require the same origin.
- A member counts as paid only after Paiflow returns SUCCESS. Pay refuses non-members, inactive rounds, a second payment, and envelopes the server did not prepare. A retry always resubmits the first stored signed envelope.
- Vault releases: the server builds the payment only for a payer that the ledger confirmed. It merges only signatures that verify against the live vault signers, and submits at the medium threshold. A PENDING release must be resolved by its hash; never rebuild it.

### Tranche status and open work (updated 2026-10-14, event day)

Deadlines (PHT): 12:30 PM qualification checkpoint, 3:30 PM submission (deployment ID + payout tx hash). Product spec: the Tranche PRD (tiered split, multisig Vault, Safety Fund).

Done: everything under `lib/tranche/` and `app/api/tranche/`, multi-round `lib/paiflow.ts`, tests in `tests/tranche.test.ts`, `requirements.txt`. Typecheck, tests and build pass. Nothing has run against live Paiflow or Horizon yet.

Waiting on the team (an agent cannot do these): team credentials, 9 Friendbot-funded testnet accounts, the R1 deployment (On Receive → Split: landlord 45%, member wallet 32%, vault 20%, fund 3%), `.env.local`, and the Vault/Fund multisig in Stellar Laboratory. Never ask for or accept S-secrets or tokens in chat.

Keep the user informed: before each task, say in plain language what you will do and why. After it, say what changed and how you checked it. Ask clearly for anything you need from them, and report failures or skipped steps directly. Keep the deadlines in view. The full guidance is in `docs/HANDOFF-backend.md`.

Backend status (2026-10-14, about 1 PM): Handoff tasks 2–6 are done. Payout breakdown in the ledger; hosted-page payments imported after a SUCCESS check; vault shares from PAYOUT events; Safety Fund cover (`POST fund/cover`); forfeit (`POST vault/forfeit`); cancel (`POST vault/release/[id]/cancel`) and automatic expiry. The sign route works for vault and fund payments. The frontend is built separately by a teammate against `docs/API.md`; don't build UI in this repo unless asked.

Remaining backend work:
1. Fill in `config/group.json` for Members 2–5 (and the R2 car lender destination) when their G-addresses arrive. Done so far: Member 1, landlord, vault, fund.
2. When R2 is deployed, add it to `TRANCHE_ROUNDS_JSON` in `.env.local` (the user types the token). To make R2 the active round for the demo, move round 1's `deadline` in `config/group.json` to a time already passed.
3. Live test a vault release once the multisig is set up (5 signers, threshold 3, master key weight 0). Today the Vault and Fund still have threshold 1 and master key weight 1.
4. Optional: the Safety Fund refund at the end of the cycle.

Live findings (2026-10-14): R1 is deployed as UUID `c091ee3b-cc09-4704-b1e2-e41b326aede7` (contract `CBNUC5…LDWO`), and team mode connects (see `docs/QUALIFICATION.md`). Paiflow PAYOUT event `data.recipients[]` has `address` and `bps`, but `amount` is `"0"`. Calculate each payout as bps × the RECEIVE amount (bigint), or read it from Horizon. RECEIVE `data` is `{from, asset, amount}`.

Notes: Node 26 runs this with an engines warning (wants 22). If pnpm is not installed, use `npx -y pnpm@10.4.1 <cmd>`. The PRD diagram says SQLite, but the ledger is a JSON file at `data/ledger.json`. Delete that file to reset local test data, but never after real testnet payments, because it holds the signed envelopes used for retries.
