# Tranche: qualification evidence (testnet)

Checked on Horizon testnet on 2026-10-14.

- Deployment UUID (Tranche Round 1): `c091ee3b-cc09-4704-b1e2-e41b326aede7`
- Trigger contract: `CBNUC557UOHC24GX5TSUCZAJNMJU4HAVXLHKYRCTSBXPK4NYMDH5LDWO`
- Trigger page: https://beta.app.paiflow.xyz/trigger/c091ee3b-cc09-4704-b1e2-e41b326aede7

## Payouts (1 XLM from Member 1 via the hosted trigger page)
| Tx hash | Time (PHT) | Split result |
|---|---|---|
| `b99440ab81ac880336d64b33b39cd0d3113ec1db47d663bd0209d190d50b6255` | 12:19:47 | Rent 0.45 · Wallet 0.32 · Vault 0.20 · Fund 0.03 |
| `c4f0ce57d25a52db3a6a53b54ba0dd922db441d0e39bcf753e964f0a0a98234c` | 12:20:57 | Rent 0.45 · Wallet 0.32 · Vault 0.20 · Fund 0.03 |

- https://stellar.expert/explorer/testnet/tx/b99440ab81ac880336d64b33b39cd0d3113ec1db47d663bd0209d190d50b6255
- https://stellar.expert/explorer/testnet/tx/c4f0ce57d25a52db3a6a53b54ba0dd922db441d0e39bcf753e964f0a0a98234c

Recipients: Landlord `GAZEEM…4QR4`, Member 1 `GCXRU4…JFUI`, Tranche Vault `GD5AOX…XIET`, Safety Fund `GCENA5…3HQ5`.

## Full round 1: all 5 members paid 1 XLM (hosted trigger page, each split confirmed in the app ledger)
| Member | Tx hash |
|---|---|
| Member 1 | `b99440ab81ac880336d64b33b39cd0d3113ec1db47d663bd0209d190d50b6255` (and `c4f0ce57…234c`, a second test payment) |
| Member 2 | `4299e04a517e773e20f72b5eb61d9733e5f6da0db6bac9bafed06dcbf051e506` |
| Member 3 | `181416e1be4254f3abbb0b8616d2fad1c2ad3fc570767175a8244ab3145e6963` |
| Member 4 | `f9127cf342062d5505e53c4905a7b8ab1f1bf9744f4a78b98cb023c60d54dd1c` |
| Member 5 | `af216c032af357a80765a6713d07ccdc6196955bd0186ab12d9822ede2432e21` |

Each payment: Rent 0.45 · Wallet 0.32 · Vault 0.20 · Fund 0.03. The Vault now holds 1.2 XLM for Member 1 (6 payments × 0.20, including the second test payment), and the Fund holds 0.18 XLM.
