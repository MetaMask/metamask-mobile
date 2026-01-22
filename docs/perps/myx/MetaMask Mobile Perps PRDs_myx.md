# MYX markets in MetaMask Perps

Last updated: Jan 16, 2026

[1\. Overview](#overview)

[2\. Problem](#problem)

[3\. Goals](#goals)

[4\. Solution](#solution)

[Overall UX](#overall-ux)

[Phased delivery approach](#phased-delivery-approach)

[Feature specs](<#feature-specs-(wip)>)

[Unknowns](#unknowns)

[5\. Success metrics](#success-metrics)

[6\. Ref](#ref)

[UX challenges notes](#ux-challenges-notes)

[Markets on MYX v1](#markets-on-myx-v1)

1. # Overview {#overview}

MYX is a perp dex who will pay us $20m in MYX tokens (for the first tranche) if we integrate them natively in MetaMask. Their particular architecture will optimize for long tail markets.

MYX v1 markets are currently:

- Very limited in \#
- Very low trading volume
- Very low open interest

MYX is aiming to ship it’s v2 in **February.**

- The focus will be on BNB meme coin markets.
- Their main differentiator is permissionless creation of perp markets using the underlying token as collateral.

Internal assumption: MYX markets will represent \<5% of perp traders, perp trades and perps revenue.

Useful docs:

- API & SDK docs [here](https://drive.google.com/drive/u/0/folders/1BuDNhlDt2gA-Dszu-rBTzaI7kB7cDTmf)
- Whitepaper [here](https://www.notion.so/MYX-V2-Whitepaper-27a2762233c28088a8d9cafadc6b4dd8)

2. # Problem {#problem}

While the main reason we’re building this feature is for MYX one-off payment, this will also solve the following problem for users: we don’t support perps trading for BNB memecoins.

3. # Goals {#goals}

Product/business goals:

1. Ship what’s required by our contractual agreement to get the \~$20m check in token allocation from MYX:
   - Ship the full feature by June 2026 to receive full payment
   - Potentially ship through multiple phases to collect payment before June so that it can be accounted for by the IPO.
2. Increase market coverage to BNB memecoins, which will be particularly valuable for APAC traders.
3. Pave the road for a long term perp dex aggregator that optimizes for trade efficiency (incl. liquidity, funding rate, total transaction cost)

4. # Solution {#solution}

## Overall UX {#overall-ux}

MYX markets are embedded within MetaMask Perps, similar to HL markets.

- The perp dex is not the user entry point: the entry points are and remain the markets.
- All features supported for HL are supported for MYX
  - Discover market within existing MetaMask Perps UX (incl. Perps home, market list & sorting, price & volume chart, starts, token detail page, favorites etc.)
  - Trade (open/close, market/limit/TP/SL, add/remove margin, increase/decrease/reverse position)
  - View open positions & orders (incl. share PnL hero card)

## Main challenges

- **MYX markets use USDT on BNB as collateral (vs. USDC on HyperCore for HL)**. Impact:
  - The concept of Perp account balance
  - What funds users need to hold to open orders
  - What funds users receive upon closing a position
- **Market collision: both Hyperliquid and MYX will list similar markets**
- **Transactions may require gas,** unless we use the “Seamless account” type.
- **Latency**: increased risk of latency on perps home because of the need to subscribe to and load MYX markets in addition to Hyperliquid markets.

## Phased delivery approach {#phased-delivery-approach}

| Phase | What we’re shipping                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Target delivery date |
| :---- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------- |
| 0.1   | Display MYX markets, without ability to trade yet. “Coming soon” to create excitement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | March                |
| 1\.   | Platform: mobile only. Market coverage: MYX markets that aren’t supported by Hyperliquid. Display provider name on MYX market screens (ex: pill we already use for XYZ markets) User coverage: all MetaMask users Perp balance concept refactor: adjust concept of Perp balance in the UIUX to account for MYX markets. Payment token: USDT only Prompt user to swap screen with USDT.BNB as dest token if they don’t have any funds Others Low liquidity warnings: display warning when market liquidity is low Slippage control: max slippage per order Error states: failed order, minimum/maximum order size, etc Feature flag control: view/hide MYX markets Monetization: collect fee on every trade Data: Mixpanel & onchain data tracking Latency: on market load & orders, on perps first load | March/April?         |
| 2\.   | _Business decision if we want to phase it_ Expand market coverage: support all MYX markets, even when there is collusion (ex: BTC, ETH, SOL). Payment token: Trade with any token Allow users to trade MYX markets with any token Default payment token to minimize swap cost option Gas included trades: allow users to trade MYX perp markets without BNB holdings (either internal mechanism or seamless account type)                                                                                                                                                                                                                                                                                                                                                                               | April/May            |
| 3\.   | Platform: Extension Close & swap: enable users to withdraw to any token                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | May/June?            |
| 4\.   | TBC: Expand to other perp DEXes, ex: Lighter or Aster                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | n/a                  |

## Feature specs (WIP) {#feature-specs-(wip)}

- Minimize V1 market coverage to prevent MYX/HL market collision
  - Easiest is likely to whitelist MYX markets individually.
  - Risk: HL adds a market that was already whitelisted by MYX
- Full MYX market coverage
  - Default to the best provider that minimizes tx cost for the user, taking into account:
    - Does the user holds [USDC.HL](http://USDC.HL) or USDT.BNB funds?
    - What is liquidity on HL vs. MYX?
    - What is funding rate cost on HL vs. MYX?
  - Display a ‘provider’ selector in market screen for users who care to switch
  - Assumption is it will be HL for \>95% of users (because HL will have better liquidity and funding rate than MYX on colliding markets)
- Trade with token: unblock users who don’t have USDT.BNB to trade MYX markets
  - Similar UX to what we’re already introducing for HL markets.
  - Default to USDT.BNB for users who hold USDT.BNB, just like we’ll default to [USDC.HL](http://USDC.HL) for HL markets
- Perp balance concept refactor:
  - For users with USDT on BNB, aggregate HL and MYX available funds to trade \+ margin of open position value

## Unknowns {#unknowns}

1. How complex is it to integrate MYX?
   - API and SDK docs [here](https://drive.google.com/drive/u/0/folders/1BuDNhlDt2gA-Dszu-rBTzaI7kB7cDTmf)
2. How can we monetize trades? (is there a builder code concept?)
3. How can we track onchain adoption?

4. # Success metrics {#success-metrics}

- Launch v1 by April to account for payment before IPO
- Launch full contractual scope by end of June

6. # Ref {#ref}

## UX challenges notes {#ux-challenges-notes}

| UX challenge                                                                                                                                                                 | What we’re shipping in v1.0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Market collateral is USDT on BNB instead of USDC on HyperCore**. This impacts: What funds users can spend to place orders What funds users receive upon closing a position | This will be solved with “Trade perps with tokens”: User can trade MYX market with their HL perp account and any other token. We may call out USDT is the collateral in the UI (v. USDC on HL) Upon closing their position, users will receive USDT on BNB. This will be displayed: In position close screen In trade history Considerations: We may explore “close & swap” feature, applicable to HL and MYX, to let users decide what asset to receive upon closing a position Perp account balance We could provide balance breakdown to users with USDT on BNB \-\> display USDC balance on HL and USDT balance on BNB Perp account PnL Ideally PnL from MYX trades will be displayed in user trading account performance UIUX (not built yet) |
| **Market collision: both Hyperliquid and MYX list similar markets**                                                                                                          | Initially we display MYX markets that aren’t available on HL. Mid term, we could display both markets with optimization logic per user: Default to the best provider that minimize tx cost for the user (ie. users has funds available to trade without a swap) while offering highest liquidity & lowest funding rate Display a ‘provider’ selector in market screen for users who care to switch                                                                                                                                                                                                                                                                                                                                                 |
| **Discover MYX markets**                                                                                                                                                     | MYX are just displayed as another market. We could consider extra discovery with a “BNB meme” market tab in the market list                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Transactions may require gas**                                                                                                                                             | 2 options: Use MYX “Classic account” type (Requires gas and signature) Enough for v1 given low expectations Use MYX “Seamless account” type (no gas, no signature) In followup iteration, we could use MM Gas station to unblock user and monetize more                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

## Markets on MYX v1 {#markets-on-myx-v1}

MYX is on 4 chains: BNB, Linea, Arbitrum and opBNB. We’ll only support BNB markets

On BNB, there are 9 markets:

- All use USDT.bnb as collateral
- 5/9 markets are already available in HL

| Market | 24h vol. on MYX | 24h vol. on HL | Difference | In scope? |
| :----- | :-------------- | :------------- | :--------- | :-------- |
| BTC    | $154m           | $5.2B          | 34         | No        |
| ETH    | $122            | $2.7B          | 22         | No        |
| BNB    | $85k            | $19m           | 224        | No        |
| MYX    | $74k            | \-             | \-         | Yes       |
| RHEA   | 0               | \-             | \-         | Yes       |
| PARTI  | $26k            | \-             | \-         | Yes       |
| SKYAI  | $12k            | \-             | \-         | Yes       |
| PUMP   | $8K             | $80m           | 10000      | No        |
| WLFI   | $10k            | $10m           | 1000       | No        |

Note: there is a minimum order size ($68 for BNB-USDT)

Entry points

- In the perp home screen
- When you search for a market that doesn’t exist
- When you’re on a perp asset screen

Ensure we track:

- How many users access MYX, and which entry point is used
- How many users convert to MYX

Eventually from an engineering perspective do we treat all of Perps DEXs as a liquidity layer and then have MYX serve as a fallback?
