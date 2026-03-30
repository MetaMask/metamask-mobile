# Tron WalletConnect — PM Brief

> March 2026

---

## Summary

**Problem:** MetaMask Mobile only works with EVM chains. When a Tron app tries to connect via WalletConnect, MetaMask ignores the request and the connection fails.

**Goal:** Let MetaMask Mobile users connect to Tron apps via WalletConnect (scan QR → approve → sign).

**What this covers:**

- Connect + sign on Tron apps ✅

**What this does NOT cover:**

- Tron wallet (no TRX balance, no send/receive) ❌
- A new account to set up ❌

**Why:**

- Tron = ~$4B locked in DeFi apps
- #1 chain for USDT transfers worldwide
- MetaMask is completely blocked from this ecosystem today

---

## Key Tron Apps

| App              | Type        | Size        | WalletConnect |
| ---------------- | ----------- | ----------- | ------------- |
| **JustLend**     | Lending     | $3.3B       | Very likely   |
| **JUST Stables** | Stablecoin  | $2.29B      | Very likely   |
| **SunSwap**      | DEX + Yield | ~$400M      | Confirmed     |
| **Klever**       | DEX         | ~$100M/day  | Confirmed     |
| **HTX DeFi**     | CEX + DeFi  | $5.5B total | Very likely   |

Users swap, lend, stake, and log in with their wallet on these apps. All of that needs transaction signing → that's exactly what we're building.

---

## How It Works

Two ways to connect, both needed:

**WalletConnect** — same QR flow as today for EVM apps

- App sends a Tron connection request
- MetaMask approves → shares Tron address
- User signs from MetaMask

**MetaMask Multichain API** — MetaMask's own SDK

- MetaMask already shipped `connect-tron` for app developers
- The mobile wallet just needs to support it on its end

---

## Watch Out

### Users already have a Tron address (and don't know it)

- Tron uses the same key as Ethereum under the hood
- MetaMask can derive the Tron address automatically — no new setup needed
- **Risk:** users may not realize their MetaMask seed phrase also controls their Tron funds → needs clear messaging

### "Connect to Tron apps" ≠ "Tron wallet"

Users will NOT see in MetaMask:

- TRX balance
- TRC-20 token list
- Send/receive for Tron

This needs to be communicated clearly to avoid frustration.

### There's a known bug (#16550)

- MetaMask Mobile has a bug: the Multichain API sometimes doesn't respond on first page load
- There's a workaround in place, but it's fragile
- Once we promote Tron support, this bug will be much more visible
- Should be fixed before or alongside this feature

### App size — a decision is needed

- The standard Tron library weighs ~2MB
- We can do without it but it means more dev work
- Product needs to define the acceptable size increase before engineering picks a direction

### TronLink is the default wallet on Tron

- Most Tron apps are built for TronLink first, WalletConnect second
- Quality of WalletConnect support varies by app
- Some apps may need small fixes on their side
- Plan a compatibility test phase before any announcement

### Two transaction formats exist

- Old format and new format (v1)
- MetaMask needs to pick the right one at connection time
- Low risk, but needs to be on the QA checklist

---

## Roadmap

| Phase              | What gets built                          | Visible to users         | Duration |
| ------------------ | ---------------------------------------- | ------------------------ | -------- |
| **Foundation**     | Tron key + signing logic                 | No                       | 4w       |
| **WalletConnect**  | Accept Tron connection requests          | Yes — connect via QR     | 5w       |
| **Multichain API** | Support MetaMask's Tron SDK              | Yes — for SDK-based apps | 3w       |
| **UI + Testing**   | Polish + E2E tests on SunSwap / JustLend | Ready to ship            | 4w       |

Total: ~16 weeks. Foundation → WalletConnect must be sequential. Multichain API can run in parallel.

---

## Open Questions

- [ ] Do we announce after WalletConnect phase, or wait for full Multichain API too?
- [ ] Show the Tron address somewhere in settings so users know it exists?
- [ ] What's the acceptable app size increase? (drives the library decision)
- [ ] Bug #16550: block the launch on it, or ship with the workaround?
- [ ] Reach out to SunSwap / JustLend for joint testing before launch?

---

_Sources: MetaMask Mobile codebase, connect-tron v0.3.1, Reown/WalletConnect docs, DeFiLlama (March 2026)_
