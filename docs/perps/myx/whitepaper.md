# MYX V2 Whitepaper

# **1. Abstract**

Crypto traders have historically faced an impossible trilemma: **trustlessness, accessibility, and usability**—specifically, **asset security and fairness of execution**, **comprehensive access to opportunities**, and **liquidity depth with user experience**. No single venue has successfully delivered all three essential elements.

Top centralized exchanges gained dominance in an otherwise commoditized market by combining **custody trust** with the **wealth effects of curated listings**. These advantages are now challenged by decentralized alternatives, as seen in the rise of platforms like Pumpfun, where **immediacy of opportunity outweighs polished interfaces or deeper liquidity**.

**We propose MYX V2**, a non-custodial, permissionless infrastructure for perpetual futures. It enforces security through **deterministic self-custody**, enables **day-one perpetual markets for any token**, and provides **execution quality comparable to centralized venues**.

Just as ERC-20 removed permission from token issuance and Uniswap from spot exchange, MYX V2 removes permission from perpetuals**—closing the execution gap while unlocking what only decentralization makes possible.**

# **2. Introduction & Motivation**

MYX’s first phase addressed the core inefficiencies of decentralized derivatives. V1 proved that an on-chain **Matching Pool Mechanism** could match centralized exchanges on liquidity and fees while preserving self-custody and transparent settlement. It also closed the usability gap through **seamless trading**—making execution gasless and walletless.

**V2 raises the bar.** The question now becomes: _what unique capabilities can a decentralized system offer?_

MYX V2 introduces a new era for on-chain trading by extending permissionlessness to perpetuals. Creating a perpetual market becomes as simple as launching a token. Any on-chain asset can immediately support leverage and hedging without approvals or gatekeepers—a chain-abstracted model impossible for custodial exchanges to replicate.

Institutions gain certainty through transparent rules, user-controlled custody, and code-defined outcomes rather than discretionary decisions. This provides the predictability needed for large-scale institutional participation.

LPs gain access to programmable liquidity via risk-aligned vaults and mTokens that enable spot holders to earn on deposits. \*\*\*\*Markets can be supported with either base or quote asset alone, reducing participation barriers. This single-sided approach eliminates impermanent loss while maintaining risk alignment. Deposits become composable yield instruments with transparent, efficient compounding instead of facing asymmetric exposure erosion or being limited to low money-market yields.

V2's goal is applying V1's performance gains to permissionless design, enabling day-one perpetual markets for any asset with transparent rules and self-reinforcing liquidity.

The following sections detail the mechanisms ensuring this framework's practicality, resilience, and security.

# **3. Design Objectives**

MYX V2's design translates philosophy into concrete constraints, ensuring performance while maintaining decentralization, sustainability, and openness—building on V1 lessons and addressing next-generation market demands.

1. **Permissionless Market Creation** Any on-chain asset can host a perpetual market from day one, removing centralized listing bottlenecks and making hedging and leverage immediately available for all assets, aligning market access with blockchain innovation.
2. **Elimination of Impermanent Loss** MYX V2 aligns risk and return transparently through independent vaults and mTokens, allowing liquidity providers to earn based on chosen exposure without structural arbitrage penalties, creating sustainable liquidity provision.
3. **Decentralization and Trustless Custody** On-chain margining and settlement with user custody and code-enforced outcomes replace discretionary authority, providing necessary guarantees for institutional and retail adoption.
4. **Broker-Facing Infrastructure** MYX V2 serves as a service layer for brokers and trading interfaces, enabling connection to shared liquidity without custody competition—creating an aligned ecosystem with concentrated rather than fragmented liquidity.
5. **Resistance to Price Manipulation** A dynamic risk framework prices manipulation costs through risk-weighted, time-bounded profit locks, making price distortion prohibitively expensive by embedding protection directly into the mechanism.
6. **Native Chain Abstraction Support** Capital flows across chains with margin provable on a source chain and deployable to a target chain within two blocks. This creates seamless cross-ecosystem participation with full auditability, offering a unified venue without manual bridging.

# **4. Core Mechanisms**

## **4.1 System Overview**

MYX operates as a fully on-chain perpetual trading system where all participants interact under a deterministic framework. The protocol unifies users, brokers, oracles, vaults, and execution infrastructure, replacing discretionary control with transparent rules encoded in smart contracts.

At the system's edge are **brokers**—user-facing gateways to MYX. Each operates its own customizable contract for fees, referrals, and onboarding. The MYX front end is one such broker, alongside wallets, brokers, and independent platforms competing for distribution.

Orders flow through brokers into **MYX Core**, which governs execution, risk, orders, and accounting. Core logic is immutable: pricing, matching, and settlement are enforced by code, not intermediaries. **Keepers** monitor the system, relay transactions, and stake MYX tokens but cannot alter outcomes as all paths are pre-defined.

Each perpetual market uses two **asset-pure vaults**: **Base Vault** (underlying asset) and **Quote Vault** (stablecoins). Together they provide collateral and underwrite **residual exposure** after trader-to-trader netting. This structure eliminates impermanent loss, aligns coin-native and cash-native investor mandates, and ensures fully-backed trader profits. Depositors receive **mTokens** that preserve exposure while accruing fees, funding, and PnL.

**Active market makers (AMM)** complement passive vault liquidity by absorbing directional risk when open interest becomes imbalanced, earning rebates and funding fees. Vaults and AMMs form a dual liquidity layer that creates the depth for scaled operations..

**Permissionless oracles** stream verifiable price data, with multiple providers ensuring no single point of failure. **Perpetual traders** interact with brokers and generate fees, funding flows, and open interest. **Spot holders** can convert their assets into mTokens to become liquidity providers and earn yield on their holdings.

**Relayers** forward transactions and abstract gas costs, enabling signature-free, gasless trading while maintaining user custody and settlement determinism.

The system functions as a closed loop where brokers connect users, vaults supply capital, oracles anchor prices, market makers balance flow, and keepers ensure execution—all governed by MYX Core's code-enforced rules. The result is a transparent, auditable, permissionless trading system delivering execution quality comparable to top centralized exchanges.

## **4.2 The Life Cycle of a Permissionless Market**

Crypto adoption accelerates when barriers fall. ERC-20 enabled permissionless token creation, unleashing the ICO boom. Uniswap made liquidity provision permissionless, transforming spot exchange into a public good. Recently, creation platforms have helped communities crowdsource liquidity, while broker platforms have broken down user frictions. MYX V2 continues this evolution by **making perpetual futures themselves permissionless.**

While other venues require gatekeepers for listings and market management, MYX V2 encodes these decisions in smart contracts. Markets form through liquidity, not discretion—instantiated by capital, activated by thresholds, and governed by transparent, auditable rules.

A market is **created** when someone deploys a pair through the MYX factory contract, specifying base and quote assets. The quote must be a stablecoin for now, simplifying execution to a single BASE/USD oracle feed. This restriction will disappear as oracle infrastructure evolves to further support reliable cross-pairs such as BTC/ETH.

**Activation** occurs when vaults meet an initial liquidity threshold. The protocol then charges a one-time fee to fund the oracle feed, which automatically begins streaming verifiable prices. Early liquidity providers receive Genesis LP tokens, granting a permanent 2% share of trading fees plus regular vault returns—fairly compensating those who enable new markets.

Once **activated**, trading begins. Orders execute at oracle prices with deterministic slippage curves. Only residual exposure passes to vaults after user flow nets. Risk parameters are maintained by the risk engine and enforced by keepers. Larger trades can use RFQ paths for specialized liquidity.

Markets must maintain minimum monthly volumes to cover oracle costs. If activity drops, the market enters **pending-deactivation**, allowing only position closing. Keepers assist in ensuring orderly settlement before trading halts. Deactivated markets can be revived by paying a new activation fee.

This creates a market lifecycle governed by code, not committees. Capital initiates markets; thresholds activate them; rules govern them; inactivity pauses them; renewed demand restores them. Like ERC-20 and Uniswap before it, MYX V2 extends permissionlessness to perpetual futures—crypto's most important market.

## **4.3 Liquidity Provisioning**

Derivatives venues depend on their capital backing. This capital follows two distinct paths: **Asset-denominated investors** seek to accumulate more of the underlying asset, while **Dollar-denominated investors** target stable returns regardless of the coin's performance. Traditional protocols force these different objectives into a single pool, creating inefficiencies.

**MYX V2 separates what must be separate.** Markets utilize two **asset-pure vaults**: a Base Vault (underlying asset) and a Quote Vault (stablecoin). Deposits generate **mTokens** that preserve the depositor's intended exposure while accumulating market earnings. By eliminating forced rebalancing, **impermanent loss is eliminated**. Each liquidity provider measures success in their preferred currency while contributing to the same market.

Returns are generated from three sources: **trading fees**, **funding transfers**, and **counterparty P&L**. MYX directs these earnings to risk-bearing vaults and **reinvests** them, enabling mTokens to compound over time. For blue-chip markets, returns can **autocompound** directly into base assets, while long-tail markets can maintain stable returns. All policies are transparently disclosed upfront for each market.

LPs maintain control over investment exposures with **opt-in take-profit and stop-loss policies** at the contract level. Coin-native providers can limit downside risk while earning returns, and cash-native providers can set return boundaries without sacrificing custody. Capital is programmable and portable with **no subscription or redemption fees** or slippage charges. This directs liquidity to its most productive use, with market depth following activity frictionlessly.

For token holders, mTokens improve upon spot by preserving price exposure while adding fee income, funding, and P&L claims with optional risk controls and self-custody. As adoption grows, markets naturally deepen, creating a self-reinforcing cycle of liquidity.

MYX liquidity is **fit-for-mandate, asset-pure, and compounding**. By aligning with investor objectives through code-enforced transparency, MYX creates sustainable market depth without impermanent loss or hidden costs, resulting in **lower LP hurdle rates and deeper liquidity for perpetual futures.**

## **4.4 Withdrawal, Redemption & Vault Accounting**

Per-market liquidity is held in two asset-pure vaults: the **Base Vault** (underlying asset) and the **Quote Vault** (stable quote). Deposits mint fungible **mTokens**, while redemptions burn them for a rule-based claim on vault assets. There are no protocol subscription or redemption fees; economics accrue transparently in the redemption ratios and public state.

### What an LP owns

- A **Quote LP** owns mTokens redeemable for more **QUOTE** over time.
- A **Base LP** owns mTokens redeemable for more **BASE** over time, plus a pro-rata claim on QUOTE proceeds attributed to the Base Vault.

These claims evolve deterministically via two core quantities:

1. **Redemption ratios** (public, per vault)

$$
R_{B} = \frac{\text{BASE units held by Base Vault}}{\text{Base mTokens outstanding}},


$$

$$
R_{Q} = \frac{\text{QUOTE units held by Quote Vault}}{\text{Quote mTokens outstanding}}.


$$

_where the Base or Quote units held by each vault is adjusted for any unrealized profit and losses._

A burn of $s$ mTokens returns $s R_{\mathrm{B}} \;\text{BASE}$
or $R_{\mathrm{Q}} \;\text{QUOTE}$, respectively (modulo any position-level risk controls the depositor attached to the mTokens).

1. **Quote tracker for Base LPs** (public, per market): QUOTE-denominated proceeds attributable to the Base Vault (fees, funding, and its share of residual P&L) are recorded as a cumulative **tracker** $\Theta$
   (QUOTE per Base mToken). A Base LP who minted when the tracker was $\Theta_{\text{entry}}$
   may, upon redemption, claim:

$$
⁍
$$

Intuition: Base LPs remain coin-native; QUOTE flows owed to them are accounted explicitly, not commingled, and paid on exit—or reinvested automatically if compounding is enabled.

### Pre-settlement Profit and Loss attribution

Before processing any **mint** or **burn**, outstanding QUOTE proceeds are attributed so new capital cannot capture old profits and exiting capital cannot leave liabilities behind. Attribution splits the pending QUOTE buffer $B$ by each vault's QUOTE value at the oracle anchor $P_{\text{oracle}}$
:

$$
⁍
$$

$$
⁍
$$

Then update redemption ratio for quote $R_Q$ and Quote tracker for Base $\Theta$ accordingly:

$$
⁍
$$

$$
\Theta \leftarrow \Theta + \frac{B_{\mathrm{B}}}{\text{Base mTokens outstanding}},B \leftarrow 0


$$

This single step keeps entry/exit equitable without pausing the market or introducing discretionary "gates."

**Mint and burn Formulas**

**Mint Base:** depositor receives $s = \frac{\text{BASE}{\text{in}}}{R{\mathrm{B}}}$
; records $\Theta_{\text{entry}} = \Theta$

**Burn Base:** receives $sR_{\mathrm{B}}$ BASE **and** $s \bigl(\Theta - \Theta_{\text{entry}}\bigr) \;\text{QUOTE}$

**Mint Quote:** depositor receives $s = \frac{\text{QUOTE}{\text{in}}}{R{\mathrm{Q}}}$

**Burn Quote:** receives $s R_{\mathrm{Q}} \;\text{QUOTE}$

All quantities are on-chain and auditable.

## 4.5 Brokers as Distribution and Infrastructure

MYX separates execution core from distribution edge. **MYX Core** handles trading logic, risk, and settlement, while brokers function as the access layer. This architecture creates neutral infrastructure with competitive front ends.

Brokers deploy permissionlessly through the **broker factory**. Any entity can create a broker contract defining its own fees, referrals, and onboarding processes, while leveraging MYX Core for execution. The MYX front end operates as just one broker among many.

MYX Core applies a **base protocol fee** scaled to broker volume—larger brokers pay less, smaller ones pay more. This approach rewards scale, drives competition, and maintains efficient distribution without fragmenting liquidity. All trades clear against the same pool under identical rules.

This model effectively modularizes compliance. Brokers implement their own KYC/AML requirements based on jurisdiction. Regulated and permissionless brokers coexist, both accessing the same liquidity pool while custody remains on-chain and settlement stays deterministic.

MYX functions as an **infrastructure layer for perpetual futures** rather than a single decentralized exchange. Brokers serve different audiences at the surface, while MYX Core provides shared liquidity. This balance combines decentralization with usability: core rules remain on-chain, with flexibility at the edge.

## **4.6 Seamless Trading**

Users default to centralized venues due to friction in decentralized venues, despite custody concerns in centralized ones. MYX V2 addresses this with its **seamless key** design and relayer-based submission, eliminating gas pre-funding, repetitive prompts, and custodial designs.

Seamless keys can be authorized by asset holding EOAs or smart contracts in MYX core to trade on their behalf. Orders are signed by authrozied seamless keys and submitted through MYX Relayers while maintaining security. The keys are **not** custody keys—they cannot withdraw funds or bypass checks. This enables **gasless, wallet-less entry** through broker interfaces or Telegram without sharing private keys with operators.

The benefits are substantial: retail users enjoy frictionless position management without repetitive signing; traders can secure assets in cold storage while actively trading via non-custodial seamless keys; investors can delegate trading authority to specialized trading firms without surrendering custody; and brokers can decentralize their infrastructure while maintaining seamless user experiences.

Seamless trading bridges the usability gap between centralized platforms while preserving trustlessness. Users maintain custody, brokers extend their reach, and MYX Core ensures verifiability—combining an app-like experience with auditable settlement.

## **4.7 Matching Engine**

Matching is the core challenge of exchange design. Centralized orderbooks pair makers and takers through proprietary engines, with market makers effectively matching takers while managing inventory. Though high-performing, this approach is expensive and impractical on-chain due to prohibitive costs and latencies.

First-generation decentralized derivatives (e.g., GMX) introduced peer-to-pool models where takers traded directly against liquidity pools at oracle prices. This solved posting issues but used liquidity sub-optimally as traders never matched against each other.

MYX V1 pioneered **peer-to-pool-to-peer** settlement, or **asynchronous matching**. LPs act as temporary counterparties until offsetting positions appear, then exposure nets through the pool and redistributes among traders. This innovation delivered industry-leading capital efficiency and competitive fee structures.

**MYX V2 enhances asynchronous matching with a slippage function** that distributes depth across a virtual curve, resembling traditional orderbooks. This compensates LPs for taking imbalanced flow while protecting against one-sided position accumulation. As markets move directionally, additional exposure becomes more expensive, stabilizing long-tail assets by discouraging toxic flow.

MYX V2 implements three complementary matching modes:

1. **Asynchronous matching** remains the foundation. When Alice opens a long at price A against the LP, and Bob and Jack later open shorts at prices B and C, the LP closes equivalent exposure and effectively connects Alice to Bob and Jack. Market makers receive rebates to tighten Lp entry and exit spreads and help realize LP’s paper gains. The slippage function distributes depth around oracle prices, enabling higher capital efficiency with auto-deleveraging as a final safeguard.
2. **Instant in-block matching** pairs offsetting orders arriving in the same block directly, with only residual exposure absorbed by vaults. This minimizes slippage, reduces LP capital requirements, and improves system efficiency at scale.
3. **Off-chain matching** enables high-frequency and dark orders. Users sign orders without broadcasting them on-chain; dark pools route this information to market makers streaming prices. Matches execute on-chain for settlement, creating a distributed dark pool architecture that improves performance and privacy while maintaining settlement guarantees.

Together, these mechanisms create a flexible matching engine balancing decentralization constraints with professional trading requirements. Liquidity flows through multiple pathways: asynchronous bridging, slippage-shaped virtual depth, in-block netting, and decentralized RFQ. The result is an execution layer serving both retail and institutional needs without compromising decentralization.

## **4.8 Trading Rules and Settlement**

MYX V2 establishes a **QUOTE-margined, isolated perpetual market** as its default structure. Every position is collateralized exclusively in the market's designated quote asset, which the protocol assumes to be worth one U.S. dollar at par. This simplifies accounting and ensures consistency. If a stablecoin depegs, trading continues uninterrupted with the base vault's purchasing power intact, though users' collateral and P&L remain exposed to quote asset devaluation.

MYX V2's risk framework centers on two parameters: **initial margin rate** (determining maximum leverage) and **maintenance margin rate** (setting liquidation threshold). A $x%$ initial margin enables $\frac{\text{1}}{x}$ leverage. When a position's value drops below maintenance requirements, it's liquidated with remaining margin directed to the market's **risk reserve**.

Formally, if a user opens a position of notional value $V$, then:

$$
⁍
$$

$$
⁍
$$

Where $\text m_{\text{init}}$ is the initial margin rate and $\text m_{\text{maint}}$ is the maintenance margin rate

Both parameters are **dynamic**. Assets receive deterministic liquidity ratings based on depth, volatility, and manipulation risk. More liquid pairs like BTC/ETH have lower margin requirements allowing higher leverage, while long-tail assets have stricter requirements. Liquidity ratings only affect new or modified positions—existing positions maintain entry parameters to prevent retroactive liquidations.

Each market maintains its own segregated **risk reserve** from collected liquidation margins. This prevents extreme events in one market from affecting others—a volatile altcoin's collapse won't impact BTC or ETH markets. These reserves serve as buffers against shortfalls and provide transparent accounting of system risk.

This structure balances flexibility with prudence. Institutions can trade in highly liquid markets with competitive leverage and segregated reserves, while retail traders can access long-tail markets with appropriate risk parameters. The system remains rule-based, predictable, and protected against contagion.

### 4.8.2 Prices: Execution Anchors and Slippage

Trade execution in MYX V2 is anchored to **verifiable oracle prices**, ensuring reproducible and tamper-proof settlement. In MYX V1, each order executed at the oracle price, with cross-referencing checks comparing an index price to the oracle price at execution. While this provided transparency, it failed to account for the real-world cost of liquidity, especially in thin or asymmetric markets.

MYX V2 addresses this by introducing a **slippage function** that distributes liquidity around the oracle anchor like an orderbook. Instead of filling all trades at a single price point, the protocol prices depth along a deterministic curve. This creates two key benefits: first, it enhances asynchronous matching profitability by compensating LPs for one-sided flow, preventing liquidity providers from being drained without reward; second, it acts as a stabilizer—as a market moves in one direction without offsetting flow, the marginal cost of new positions increases. This discourages toxic position buildup and strengthens long-tail markets where liquidity is naturally thin.

Formally, let $\text P_{\text{oracle}}$ be the oracle price, and $Q$ the net position imbalance. The execution price can be expressed as:

$$
P_{\mathrm{exec}} = P_{\mathrm{oracle}} \bigl(1 + f(Q)\bigr)


$$

Where $f(Q)$ is a slippage function increasing in $Q$, calibrated by the asset's liquidity rating. In liquid markets, $f(Q)$ is shallow, closely approximating the oracle price; in illiquid markets, it steepens quickly, making large imbalances prohibitively expensive.

In practice, these rules make MYX V2 markets behave more like traditional orderbooks in both price formation and liquidity cost. Oracle anchors ensure fairness and reproducibility, while the slippage function creates depth and protects LPs. Traders benefit from transparent and predictable execution, LPs maintain capital efficiency, and the overall system preserves market integrity.

### 4.8.3 Trading Fee

MYX V2 charges a **transaction fee** on each trade's notional value. If $N$ is the trade size and $f$ is the fee rate:

$$
\text{Trading Fee} = N \times f
$$

Fee rates vary across three dimensions:

1. **Broker policies**: Front-end entities set their own fee schedules and referral programs, creating competition without changing MYX's core rules.
2. **Tiered VIP systems**: Brokers can offer reduced fees to high-volume traders, aligning with industry standards.
3. **Asset liquidity profile**: Liquid assets like BTC have lower fees, while less liquid markets have higher fees to compensate for additional risk.

This structure benefits all participants: brokers gain flexibility, institutions receive predictable scaling costs, retail traders access transparent markets with potential fee reductions, and the protocol maintains sustainability with risk-aligned fee income.

### 4.8.4 Funding as a balancing mechanism

Funding transfers shift costs from the **crowded** side of open interest to the **uncrowded** side, nudging positions toward equilibrium. In MYX V2's **QUOTE-margined** model, all amounts are denominated in Base units. The **risk engine** calculates the funding rate based on the net long/short imbalance, the steepness of the slippage function curve, and the market's liquidity rating. Funding accrues **continuously** in time but settles **discretely** when a user interacts with their position (open/increase/decrease/close), preserving accuracy while minimizing chain updates across markets.

**Formalization**

Let $r_{daily}(t)$ represent the daily funding rate at time $t$, defined as **positive when longs pay shorts**. This converts to a per-second rate:

$$
\hat r(t) = \frac{r_{\text{daily}}(t)}{86{,}400}
$$

Let $P_{\text{oracle}}(t)$ be the execution anchor (QUOTE per 1 unit of BASE). We define a **global funding index** $F(t)$ with units "QUOTE per 1 BASE," updated at keeper broadcast times $t_k$ as:

$$
F(t_{k+1}) = F(t_k) + \hat r(t_k)\,\Delta t_k\, P_{\text{oracle}}(t_k),\Delta t_k = t_{k+1} - t_k
$$

_Intuition:_ During the period $[t_k, t_{k+1})$, each **+1 BASE** long position accrues a payable of $\hat r \cdot \Delta t \cdot P_{oracle}$ QUOTE (while each short receives the equivalent amount).

For a user position $i$ with **BASE-denominated size** $q_i$ (long if $>0$, short if $<0$), we store its **position funding index** $F_i$ at the last interaction. On the next interaction at time $t$:

$$
\mathrm{FundingPayable}_i(t) \;=\; \bigl(F(t)-F_i\bigr)\, q_i .
$$

- If $r>0$ and $q_i>0$ (crowded longs), then $\mathrm{FundingPayable}_i>0$: the long position **pays** QUOTE.
- If $r>0$ and $q_i<0$, the short position **receives** QUOTE (negative payable).

After settlement, we set $F_i\leftarrow F(t)$ and update $q_i$ according to the user's new position size. This approach is algebraically equivalent to continuous integration but realized **only** when users interact with the system, which is critical for scalability.

Funding credits and debits are posted to the position's **QUOTE margin balance** at settlement. **Debits** reduce free margin, while **credits** increase it. Funding is calculated before liquidation tests; consequently, prolonged adverse funding can push a position toward its maintenance threshold even when the price remains flat.

### **4.8.5 Trader PnL and Settlement**

MYX V2 operates entirely in QUOTE under an isolated, QUOTE-margined model. A position holds $q$ units of BASE (long when $q>0$, short when $q<0$), with a volume-weighted entry price $P_{\text{entry}}$. At any oracle mark price $P_{\text{oracle}}$ (QUOTE per BASE), the notional value is $N(P)=|q|\,P$. Unrealized PnL is marked continuously:

$$
\mathrm{UPnL} = (P_{\text{oracle}} - P_{\text{entry}})\, q \quad (\text{QUOTE}).
$$

When a position is partially reduced by $\Delta q$ (same sign as $q$) at execution price $P_{\text{exec}}$, the realized PnL is:

$$
\mathrm{RPnL}{\text{slice}} = (P_{\text{exec}} - P_{\text{entry}})\,\Delta q \quad (\text{QUOTE}).
$$

Adding to a position updates $P_{\text{entry}}$ by VWAP, while reductions keep $P_{\text{entry}}$ unchanged for the remaining position.

Position equity is calculated as:

$$
\mathrm{Equity} = \mathrm{Collateral} + \mathrm{RPnL}_{\text{cum}} + \mathrm{UPnL} - \mathrm{Fees}_{\text{cum}} - \mathrm{FundingPayable}_{\text{net}} \quad (\text{QUOTE}),
$$

Trading fees are applied on notional value at execution, and funding is settled upon interaction via the global funding index. Both fees and funding are posted before any liquidation checks are performed.

### **4.8.6 Liquidation and Bankruptcy Handling**

Liquidation in MYX V2 operates under an isolated, QUOTE-margined framework designed to guarantee that traders cannot incur negative balances. Each position is continuously monitored against its maintenance margin requirement. A position of size $q$ BASE units (long when $q>0$, short when $q<0$), held at price $P_{\text{oracle}}$, carries initial notional

$$
N_{t} = |q| \cdot P_{\text{oracle}}
$$

Liquidation is triggered when equity falls to or below

$$
\mathrm{Equity} \;\le\; m_{\text{maint}} \cdot N_{t} ,
$$

where $m_{\text{maint}}$ is the maintenance margin rate.

From this condition, the protocol derives closed-form liquidation levels. For a **long position** ($q>0$):

$$
P_{\text{liq}}^{\text{long}}  = P_{\text{entry}} \Bigl( 1 + m_{\text{maint}} - \tfrac{\Phi}{N_{t}} \Bigr),
$$

and for a **short position** ($q<0$):

$$
P_{\text{liq}}^{\text{short}}  = P_{\text{entry}} \Bigl( 1 - m_{\text{maint}} + \tfrac{\Phi}{N_t} \Bigr),
$$

where $\Phi$ is the adjusted free balance after fees and funding are settled.

The execution price of liquidation is straightforward—it is the **liquidation price itself**. By design, the liquidation engine guarantees that a trader's balance cannot fall below zero. Liquidity providers know the exact liquidation level in advance, allowing them to hedge proactively if desired. This deterministic liquidation price ensures losses are capped at the user's posted collateral, preventing deficit situations.

All liquidations incur a **liquidation fee**, charged on the position's notional value at liquidation. Unlike trading fees, this fee goes entirely to the market's **risk reserve** rather than to LPs. The reserve acts as an insurance buffer that absorbs any mismatch between collateral and payout obligations. Each market maintains its own reserve, ensuring that shortfalls remain contained within that specific market without spreading elsewhere.

## 4.9 LPs as Counterparties

Liquidity providers on MYX V2 underwrite the net exposure remaining after trader-to-trader positions are offset. Their role follows transparent, rule-based processes through two **asset-pure vaults**: the Base Vault (holding the underlying token) and the Quote Vault (holding the market's stable quote). This separation eliminates impermanent loss and ensures each provider maintains exposure in their chosen denomination while guaranteeing user profits are always fully collateralized.

**Collateral allocation.** When aggregate user flow is net long, the protocol first draws on the Base Vault, as BASE naturally counters long positions. Each unit of residual long is matched with an equivalent unit of locked BASE collateral. If BASE is insufficient, the Quote Vault supplements by locking QUOTE according to a **Quote-lock coefficient** $k_Q$, which determines the forced take-profit (FTP) threshold. Conversely, when net flow is short, the Quote Vault supplies QUOTE first. If Quote depth is insufficient, the Base Vault locks additional BASE under a **Base-lock coefficient** $k_B$. These coefficients determine both how much collateral is immobilized per unit of exposure and how far price can move before triggering an FTP. For example, a coefficient of 2 means positions are forcibly realized after a 66.7% adverse move, ensuring LP losses never exceed their posted collateral.

Despite the preferred sequence of collateral usage based on net exposures, the Base and Quote vaults share market exposure proportionally to their TVL. This prevents Base vaults from assuming excessive short positions against traders and Quote vaults from taking on too many long positions.

LP Pending PnL pools temporarily store profits and losses, settling directly with traders without distributing to vaults per transaction. This reduces gas costs from the asset-pure vault design and enables profit reinvestment.

The result is balanced risk exposure for LPs with no impermanent losses and well-managed risks to prevent bankruptcy.

## 4.10 Clearing and Settlement Center

The Clearing and Settlement Center reconciles BASE and QUOTE flows, enables compounding, and executes automated risk controls including stop-loss, take-profit, and liquidation payouts.

This system operates through **spot swap intents**. Vaults publish standing intents to rebalance collateral when needed. These on-chain intents are fulfilled by solvers who deliver assets at oracle-anchored prices plus incentive spreads, ensuring fair, immediate, and fully collateralized conversions while maintaining open competition.

The Center supports four key functions:

1. **Debt Coverage.** When user profits exceed LP pending PnL buffer, the Base Vault posts BASE as collateral needed double the size of debt(Quote payout borrowed from pool). Solvers can deliver QUOTE for BASE at a discounted oracle price until Debt is covered, with surplus BASE returning to the vault. This maintains QUOTE-denominated payouts while preserving LP solvency.
2. **Profit Compounding.** Compounding vaults convert accumulated QUOTE profits to BASE through swap intents. Solvers provide BASE for QUOTE at oracle price plus discount, automatically growing Base Vault holdings without manual intervention.
3. **mToken Stop-Loss/Take-Profit.** Token holders can set on-chain trigger orders. When triggered, vaults express swap intents at execution price. Solvers fulfill these orders without requiring centralized matching engines, enabling automated portfolio management.
4. **Oracle Fee Funding.** The Center collects activation fees from vaults proportional to TVL, converting collateral through swap intents when necessary to compensate oracle providers without external dependencies.

This intent-solver model creates a **robust and composable** clearing layer. Competitive solving ensures efficiency, LPs maintain asset purity with seamless rebalancing, and users receive predictable QUOTE payouts even under stressThis effectively creates the foundation for expanding into an intent based spot trading facility within the MYX protocol.

## 4.11 Risk Management

MYX V2's trustworthiness is built on transparent failure handling. All failure modes follow explicit, verifiable rules that any participant or independent keeper can validate. This version introduces four key improvements: (i) **a decentralized Liquidity Assessment System**; (ii) **dynamic margins** based on this assessment; (iii) **slippage & OI controls** that protect LPs while attracting counter-flow; and (iv) **lock-coefficient–based forced take-profit** ensuring solvency within MYX's asset-underwriting model. We also maintain core V1 safeguards.

1. **Dynamic Liquidity Assessment**

**Risk.** Long-tail assets, episodic liquidity, or sudden crowding can render static parameters unsafe.

**Control.** MYX V2 introduces a **Liquidity Assessment System** computed by **decentralized keepers nodes** under a public rulebook. Each keeper ingests a published **factor library** (e.g., depth/impact around the oracle, short-horizon volatility, spread dispersion, frequency of oracle deviations, OI concentration and turnover, slot-pressure metrics) and applies a **deterministic scoring function** to produce a scalar **liquidity rating** $L$ (e.g. ,$L\in[0,1]$ or tiered). Keepers stake to publish $L$ per market and epoch; MYX aggregates via a robust operator (e.g., weighted median over honest quorums). Because the mapping **factors → $L$** and **$L$ → parameters** is public, independent keeper systems arrive at the **same rating** for the same inputs.

Crucially, $L$ **couples** into risk-critical parameters via monotone, published formulas, for example:

$$
\begin{aligned}m_{\text{init}}(L) &= m_{\min} + \alpha L, \\m_{\text{maint}}(L) &= m_{\min}^{\!*} + \beta L, \\\kappa_{\text{slip}}(L) &\uparrow \ \text{with } L \;(\text{steeper curve in thinner markets}), \\r_{\text{fund}}(L) &\uparrow \ \text{with imbalance and thinness}, \\\tau_{\text{lock}}(L) &\uparrow \ \text{(longer profit-lock horizon in thinner markets)}.\end{aligned}
$$

Parameters are **applied prospectively**: new positions bind to current $L$; existing positions retain their entry-time parameters (no retroactive liquidations). The rulebook, factors, and formulas are on-chain or anchor-hashed so any party can recompute and audit.

Determinism replaces discretion; parameter tightness scales with measured liquidity, not headlines. Liquid majors remain efficient; long tails are constrained before they become dangerous.

1. **Dynamic Initial & Maintenance Margins**

**Risk.** Static margin ladders either strand capital on major assets or inadequately margin volatile assets.

**Control.** MYX sets **initial** and **maintenance** margin rates as direct functions of the liquidity rating $L$. Higher $L$ (thinner markets) results in higher $m_{\text{init}}$ (lower max leverage $=1/m_{\text{init}}$) and higher $m_{\text{maint}}$ (earlier liquidation), strengthening safety cushions **before** stress occurs. Smoothing mechanisms and floors/ceilings prevent abrupt changes; updates happen dynamically and apply **only to new or updated positions**. Liquidation prices for long/short positions remain closed-form and publicly calculable, allowing traders to know exact thresholds in advance. Suppose $L$ deteriorates for an asset, a user holding an existing position who wants to increase their holdings will face the new initial margin requirement. This ensures users have sufficient margin to meet the updated market requirements before adding to their positions.

Leverage is proportional to liquidity. Long-tail assets can list permissionlessly, but cannot over-leverage the system.

1. **Slippage & OI Control (LP protection and maker incentives)**

**Risk.** One-sided flow can accumulate against LPs. Static fills at oracle prices invite predatory flow, especially in thin markets.

**Control.** Execution anchors to the **oracle**, but price is shaped by a **slippage function** that distributes virtual depth around the anchor:

$$
P_{\text{exec}} \;=\; P_{\text{oracle}} \bigl( 1 + f(Q; \kappa_{\text{slip}}(L)) \bigr), \quad f'(\cdot)>0,
$$

where $Q$ is net residual order size and $\kappa_{\text{slip}}(L)$ steepens impact as markets thin. Flow inside the slot nets with minimal impact, while orders pushing beyond limits face sharply rising slippage. Rebates and RFQ integrations invite **external market makers** to provide counter-flow, compressing the curve.

LPs receive compensation for adverse selection, making one-sided accumulations expensive and economically incentivizing market makers to balance open interest.

1. **Lock Coefficients & Forced Take-Profit (FTP) under flexible underwriting**

**Risk.** Under V2's flexible underwriting (Base and Quote can back either side when primary collateral is insufficient), collateral must still cap maximum payable profit **deterministically**.

**Control.** MYX uses per-side **lock coefficients** to immobilize collateral when the primary vault has insufficient funds:

- **Long-skew** (users net long). The **Base Vault** locks BASE first; if insufficient, the **Quote Vault** posts QUOTE using a **Quote-lock coefficient** $k_Q$.
- **Short-skew** (users net short). The **Quote Vault** posts QUOTE first; if insufficient, the **Base Vault** locks BASE under a **Base-lock coefficient** $k_B$.

Invoking $k_Q$ or $k_B$ establishes a **Forced Take-Profit (FTP)** level: when price moves so far that user profit would exceed posted collateral, the system automatically realizes the position at FTP. Higher $k$ values push FTP further away (e.g., $k{=}1\approx50\%$ adverse move; $k{=}2\approx66.7\%$; $k{=}3\approx75\%$). When the **Base Vault** owes QUOTE, it over-collateralizes with BASE and creates a **spot swap intent**. Any solver can then deliver QUOTE (at oracle-anchored, discounted prices) to retire the liability, with surplus BASE collateral returned to the vault. Throughout this process, user accounting remains QUOTE-native, with all collateralization happening behind the scenes.

Even with flexible asset application, the system mechanically enforces that **liability ≤ collateral**; FTP prevents bankruptcy.

1. **Manipulation Deterrence**

Thin markets are vulnerable to price manipulations. MYX V2 counters this with a **PnL Lock** on gains in long-tail pairs: profits **vest over time** based on liquidity rating $L$. Each position's PnL enters a **locked balance** vesting over $\tau_{\text{lock}}(L)$; new PnL $\Delta$ **resets** the vesting clock. While locked portions cannot be withdrawn, unrealized PnL remains usable as margin.

This lock operates under public rules and includes an **objective review process**. During the vesting period, if trades exhibit manipulation patterns, LPs can submit an **on-chain challenge** using mToken as bonds. Keeper votes determine outcomes. Successful challenges redirect **locked PnL back to LPs**, while rejected challenges allow normal vesting to continue.

This mechanism renders manipulation **net negative EV** (expected value): costs occur immediately while gains are delayed and remain at risk. Legitimate trading proceeds unaffected: liquid pairs have minimal or no locks, while long-tail markets have longer locks (up to 24 hours). This creates effective **risk-pricing friction** that protects market integrity without impeding legitimate activity.

1. **Circuit Breakers**

MYX operates without discretionary controls like whitelists or blacklists. All users interact with the protocol under the same rules, with on-chain custody and settlement enforcement. Consistent with its permissionless design, markets remain continuously open except during narrowly defined risk events.

During exceptional cases—such as oracle failure or extreme divergence from fair value—the protocol may enter a **reduce-only state** at the market level. In this mode, traders can close or reduce positions but cannot add new exposure. This ensures risk can be unwound while preventing the introduction of new liabilities.

The **DAO** governs these circuit-breaker rules through transparent governance. The DAO determines the exact conditions under which markets may enter or exit reduce-only status. This approach balances permissionless access with systemic safety—preserving user rights while maintaining deterministic protections against scenarios where continued risk-opening would threaten solvency.

1. **Inherited Safeguards from V1**

While MYX V2 introduces new mechanisms for liquidity assessment and collateral management, it also preserves key safeguards pioneered in V1 that continue to form the backbone of execution integrity.

**Time Rewind.** On-chain execution is vulnerable to congestion, block delays, and temporary oracle outages. In conventional systems, these interruptions can reorder trades, distort fill prices, and create unwarranted bankruptcies. MYX's time rewind mechanism prevents this by deterministically "replaying" orders against the oracle price points that would have applied without disruption. This ensures orders execute in the correct sequence at the correct prices, preserving stop-loss and take-profit integrity, maintaining effective hedges, and preventing LPs from inheriting unhedged exposures due to delayed balancing trades.

**Index vs. Oracle Cross-Check.** Execution requires the oracle anchor and index reference to remain within a defined tolerance. Orders are rejected if divergence exceeds this threshold, ensuring settlement occurs near fair value and preventing exploitation of stale or manipulated prices.

**Two-Step Execution.** Order submission and execution occur in separate blocks, reducing MEV vulnerability and ensuring committed orders execute deterministically under published rules.

**Auto-Deleveraging (ADL).** When liquidations or exits skew open interest beyond vault collateral capacity, MYX activates auto-deleveraging. This partially reduces profitable positions to release capacity, based on a transparent priority function of effective leverage and unrealized PnL per notional. Unlike reserves or spot swap intents, ADL addresses the structural risk when the counterparty base disappears entirely.

V2's risk framework replaces discretionary judgment with **public formulas coupled to a decentralized rating**. Margins, slippage, funding sensitivity, profit-lock horizons, and FTP levels all function as **measures of liquidity**. Under flexible underwriting, **lock coefficients** and **spot swap intents** make insolvency mechanically impossible, while inherited controls (time rewind, index–oracle checks, two-step execution, ADL) preserve execution integrity. The result is a system where **risk is priced, collateralized, and auditable**—before, during, and after stress.

# 5. Compliance

MYX V2 is built as neutral, permissionless infrastructure. Code enforces execution, custody, and settlement; the protocol has no whitelists, blacklists, or ability to censor individual on-chain accounts. Compliance responsibilities reside at the edges.

Broker mandate covers KYC: each broker integrating MYX Core implements jurisdiction-appropriate onboarding and access controls—ranging from full regulatory KYC for licensed operators to lighter approaches where permitted—without passing identity data to the protocol.

AML oversight follows this same boundary: the protocol maintains complete, public ledgers of orders, positions, funding transfers, liquidations, and redemptions. Brokers handle sanctions screening, transaction monitoring, and required reporting. This separation preserves MYX as an execution and settlement layer while equipping regulated distributors with tools to meet legal obligations.

This model aligns with major regulatory frameworks: licensed access points perform KYC/AML and maintain audit trails, while immutable settlement layers remain identity-agnostic. MYX's design achieves this by making all state transitions on-chain auditable and positioning identity and reporting where law can effectively apply—at the broker interface. In practice, MYX serves as an infrastructure layer: open by default, fully transparent for supervisors, and compatible with various broker compliance models, enabling institutions to meet obligations without compromising the protocol's permissionless core.

# Conclusion and Future Directions

MYX V2 transforms perpetual trading through permissionless design. By separating liquidity functions, implementing efficient matching, and codifying risk rules, the protocol delivers centralized-quality execution with on-chain guarantees. All participants benefit—traders get access, institutions receive certainty, and LPs earn mandate-aligned returns without hidden costs or intervention.

This foundation opens several development paths:

**Chain abstraction.** The system will support proving margin on one chain while executing on another, creating a unified experience across execution layers.

**Multi-collateral margining.** MYX will accept **mTokens and other receipt tokens as collateral**, letting users leverage **without selling into stables**. Capital stays productive while securing positions.

**Cross-margin via risk units.** Built-in **risk units** will contain positions and collateral under shared limits. By netting exposures at portfolio level, accounts become **more resilient** while maintaining clear liquidation prices.

**Transferable positions.** Positions will become **transferable**, enabling risk markets and broker workflows without closing and reopening.

MYX V2 does for derivatives what ERC-20 did for issuance and Uniswap for spot trading. The future is expansion across chains, collaterals, and account models while preserving neutrality—transforming on-chain finance into true **infrastructure**: user custody, transparent rules, and verifiable outcomes.
