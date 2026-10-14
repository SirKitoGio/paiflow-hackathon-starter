# Tranche: Paiflow flows to build (R1–R5)

Each round has its **own** Paiflow deployment, because Split recipients are fixed at deploy time. Every flow has the same shape:

```
On Receive (XLM)  →  Split (percentage mode)
```

- **Asset:** XLM (native) only. No USDC: recipients have no trustlines.
- **Minimum on the trigger:** leave it blank, or set it to 1 XLM (one contribution = 1 XLM).
- **Delete the default example blocks** (Condition, Pay, Return to owner).
- **Addresses:** public `G…` testnet addresses only. Never paste an `S…` secret. Each account must already be funded by Friendbot.
- Shares are in basis points (bps): 100 bps = 1%. **Each Split must total 10000 bps.**
- **Don't add a recipient with 0 bps.** Leave it out instead (see R5).

## Accounts (fill in once, then reuse)

| Name | Public G-address |
|---|---|
| Member 1 (slot 1) | |
| Member 2 (slot 2) | |
| Member 3 (slot 3) | |
| Member 4 (slot 4) | |
| Member 5 (slot 5) | |
| Landlord | |
| Car lender | |
| Tranche Vault (multisig) | |
| Safety Fund (multisig) | |

## The 5 flows

The "paid now" share goes to the receiver's payout destinations. The group must agree on them at setup. **R1 is fixed by the PRD. For R2–R5, the destinations shown are a proposal for the group to confirm.**

### R1: receiver Member 1. Paid now 77%, Vault 20%, Fund 3%
| Recipient label | Address | bps |
|---|---|---|
| Rent | Landlord | 4500 |
| Wallet | Member 1 | 3200 |
| Vault | Tranche Vault | 2000 |
| Fund | Safety Fund | 300 |
| **Total** | | **10000** |

### R2: receiver Member 2. Paid now 82%, Vault 15%, Fund 3%
| Recipient label | Address | bps |
|---|---|---|
| Car | Car lender | 5000 *(proposal)* |
| Wallet | Member 2 | 3200 *(proposal)* |
| Vault | Tranche Vault | 1500 |
| Fund | Safety Fund | 300 |
| **Total** | | **10000** |

### R3: receiver Member 3. Paid now 87%, Vault 10%, Fund 3%
| Recipient label | Address | bps |
|---|---|---|
| Wallet | Member 3 | 8700 |
| Vault | Tranche Vault | 1000 |
| Fund | Safety Fund | 300 |
| **Total** | | **10000** |

### R4: receiver Member 4. Paid now 92%, Vault 5%, Fund 3%
| Recipient label | Address | bps |
|---|---|---|
| Wallet | Member 4 | 9200 |
| Vault | Tranche Vault | 500 |
| Fund | Safety Fund | 300 |
| **Total** | | **10000** |

### R5: receiver Member 5. Paid now 97%, Vault 0%, Fund 3%
| Recipient label | Address | bps |
|---|---|---|
| Wallet | Member 5 | 9700 |
| Fund | Safety Fund | 300 |
| **Total** | | **10000** |

There is no Vault recipient here: the last receiver has already paid every round, so nothing is held.

## After each deploy

1. Name the flow **Tranche Round N**. Before you deploy, check that the English preview shows no "(needs address)" and the badge says "valid pipeline".
2. Deploy, and sign in Freighter (Testnet).
3. Copy the **deployment UUID** and create an **API token** (`pfk_…`). Send the token **privately** to the person who runs the server. Never put it in Git or in an AI chat.
4. Test: pay 1 XLM on `https://beta.app.paiflow.xyz/trigger/<UUID>`. On Stellar Expert, check that every recipient received its share. Save the hash.
5. The server person adds it to `.env.local`:
   - R1: `PAIFLOW_DEPLOYMENT_ID` and `PAIFLOW_API_TOKEN`
   - R2–R5: `TRANCHE_ROUNDS_JSON=[{"round":2,"deploymentId":"<UUID>","token":"pfk_…"}, …]`
6. Update `config/group.json` so its `destinations` and `splitBps` match what was deployed.

## Priority (event day, Oct 14, PHT)

| Flow | When | Why |
|---|---|---|
| **R1** | **Now (by about 11:00)** | Required to qualify (deadline 12:30 checkpoint, 3:30 submission) |
| R2 | Optional, about 1:30 PM | Shows round selection and makes a vault release possible (member 1 pays R2 on time) |
| R3–R5 | After the event | Not needed for the demo. In the pitch, show them as the full cycle. |

If a Split refuses 4 recipients, merge Rent and Wallet into the member's wallet (for example R1: Member 1 = 7700).
