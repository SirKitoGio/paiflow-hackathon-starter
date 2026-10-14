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

Agent tasks, in priority order:
1. Fill `config/group.json` with the public G-addresses the team provides (5 members, Rent and Wallet destinations). Until then every member key is `null` and pay refuses.
2. Connect the Pay screen (`components/starter-app.tsx`, currently calling `/api/pay`) to `POST /api/tranche/pay`: send `{round, from}`, sign the returned XDR in Freighter, send `{round, signedXdr}`, then poll `GET /api/tranche/pay/status` with backoff until SUCCESS. Reuse the starter's recovery and Web Locks in `lib/hooks/use-wallet-operation.ts`. Show the hash with a Stellar Expert link.
3. Dashboard screen from `GET /api/tranche/group`: members, slots, active round, paid/pending/due/late.
4. Ledger screen from `GET /api/tranche/ledger`: contributions with their RECEIVE/PAYOUT events and Stellar Expert links.
5. Optional: Vault screen from `GET /api/tranche/vault`, with a create release button (`POST /api/tranche/vault/release`) and Freighter signing per member (`POST /api/tranche/vault/release/[id]/sign`). Test with a tiny amount first.
6. Optional: when the team adds round 2 to `TRANCHE_ROUNDS_JSON`, round 2 becomes active only after round 1 is fully paid or past its deadline. Shift the deadlines in `config/group.json` if the demo needs it.
7. Not built (pitch future work): a route to pay a missed contribution from the Safety Fund (`vault.ts` already supports `source: "fund"`), the end-of-cycle Fund refund, automatic release, USDC.

Notes: Node 26 runs this with an engines warning (wants 22). If pnpm is not installed, use `npx -y pnpm@10.4.1 <cmd>`. The PRD diagram says SQLite, but the ledger is a JSON file at `data/ledger.json`. Delete that file to reset local test data, but never after real testnet payments, because it holds the signed envelopes used for retries.
