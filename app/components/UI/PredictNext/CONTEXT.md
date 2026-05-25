# PredictNext Context

PredictNext is the prediction markets context in MetaMask Mobile. This glossary defines the canonical product language used for events, markets, outcomes, positions, orders, balances, and account readiness.

## Language

### Core Data Model

**Event**:
A group of related binary **Markets** on a single topic, such as "2026 NBA Finals" or "Will ETH hit $5k?".
_Avoid_: Market, PredictMarket

**Market**:
A single binary question within an **Event**, resolved as Yes or No, such as "Lakers to win Game 7".
_Avoid_: Outcome, PredictOutcome, condition

**Outcome**:
One side of a binary **Market**, representing a tradeable position, usually labeled Yes or No but sometimes using a custom label.
_Avoid_: OutcomeToken, token, share

**Position**:
A user's holdings in a specific **Outcome**, measured in shares.
_Avoid_: Bet, wager, stake

**Order**:
A request to buy or sell **Outcome** shares at a specified price.
_Avoid_: Trade, transaction

### Order Lifecycle

**Active Order**:
An **Order** currently being processed through the placement pipeline, including preview, deposit, placement, and confirmation steps.
_Avoid_: Pending order, in-flight order

**Order Preview**:
A price quote showing estimated cost, fees, and potential return before an **Order** is placed.
_Avoid_: Quote, estimate

**Order Receipt**:
The canonical confirmation returned after a **Venue** accepts or fills a submitted **Order**, including venue order identifier, status, spent amount, received amount, and transaction hashes when applicable.
_Avoid_: Order Result, raw venue response

**Cash Out**:
Selling an existing **Position** before **Market** resolution.
_Avoid_: Sell, exit, withdraw

**Claim**:
Collecting winnings from a resolved **Market** where the user held the winning **Outcome**.
_Avoid_: Redeem, collect

### Financial Terms

**Deposit**:
Transferring USDC from the user's wallet to their prediction market account, usually into a Polymarket **Proxy Wallet**.
_Avoid_: Fund, top up

**Withdraw**:
Transferring USDC from the prediction market account back to the user's wallet.
_Avoid_: Cash out

**Balance**:
The user's available settlement-currency amount at a **Venue**, ready for placing **Orders**.
_Avoid_: Funds, wallet balance, raw token amount

**Volume**:
Total USDC traded on a **Market** or **Event** across all users.
_Avoid_: Liquidity

**Liquidity**:
The depth of available orders in a **Market** order book; higher liquidity means less price slippage.
_Avoid_: Volume

**Reference Price**:
A baseline asset price used to display or resolve an up/down **Market**, such as the starting BTC price for a crypto up/down prediction.
_Avoid_: Target price, strike price

**Live Update**:
A real-time change from a **Venue** that affects visible **Events**, **Markets**, **Outcomes**, prices, or **Positions**.
_Avoid_: WebSocket message, overlay

**Service Event**:
An internal PredictNext message emitted by one service to notify other services about workflow progress or cache-relevant changes, such as an **Order** being submitted or a **Claim** failing.
_Avoid_: Event without qualifier, UI event, overlay

### Sports Terms

**Game**:
A sports contest represented as optional metadata on an **Event**, including scheduled time, live status, score, period, league, and participating **Teams**.
_Avoid_: Match, fixture, raw sports payload

**Team**:
A participant in a sports **Game**, including canonical display metadata such as name, abbreviation, logo, and color.
_Avoid_: Team DTO, venue team

### Venue Terms

**Venue**:
An external prediction market where users can browse **Events**, place **Orders**, and manage **Positions**, such as Polymarket, Kalshi, or Myriad.
_Avoid_: Provider, platform, exchange, source

**Venue Capability**:
A product capability that may or may not be supported by a **Venue**, such as deposits, withdrawals, claims, live prices, order books, or proxy wallets.
_Avoid_: Provider feature

**Predict Client**:
The session-bound handle product services use to call one **Venue** on behalf of one MetaMask account. It is retrieved from `PredictSessionService`. There is no separately-declared `PredictClient` interface; the handle is a session-bound view of the active `VenueAdapter` with the `session` parameter pre-bound. The conceptual name stays so docs and discussion can refer to "the Predict Client" without dragging in adapter implementation details.
_Avoid_: Provider, venue-specific client, raw venue client, separate client interface

**Venue Session**:
Internal auth, eligibility, readiness, and account context for one MetaMask account at one **Venue**. It is owned and refreshed by `PredictSessionService`, passed into the **Predict Client** internally, and not exposed as product state.
_Avoid_: Auth cache, API key, session object passed through services

**Venue Account**:
The venue-side account through which a user's **Orders**, **Positions**, and prediction market **Balance** are represented at a **Venue**.
_Avoid_: Provider account, Predict address, account

**Account Readiness**:
Whether a MetaMask account can trade at a **Venue**, including required setup, eligibility, or verification. Owned by `PredictSessionService`, which holds a per-owner readiness record in its `BaseController` state slice. Readers (hooks, services, components) consume readiness through Redux selectors on that slice; refreshing readiness is a messenger action on `PredictSessionService`. The venue raw assessment comes from `VenueAdapter.fetchAccountReadiness(session)`, but only `PredictSessionService` invokes it.
_Avoid_: Account state, wallet status, setup flags, portfolio-derived readiness

**Proxy Wallet**:
A smart contract wallet created for a **Venue** to hold user funds and execute **Orders**.
_Avoid_: Account, sub-wallet

## Relationships

- Each **Event** contains one or more **Markets**.
- Each **Market** contains exactly two **Outcomes**, typically Yes and No.
- Each **Position** is tied to exactly one **Outcome**.
- Each **Order** targets exactly one **Outcome**.
- Each submitted **Order** may produce one **Order Receipt**.
- Each **Event** originates from exactly one **Venue**.
- Each **Venue** has one or more **Venue Capabilities**.
- A user may have one **Venue Account** per **Venue**.
- A **Predict Client** is bound to one MetaMask account and one active **Venue**.
- A **Venue Session** is internal operational context used by a **Predict Client**; it is not product state.
- **Account Readiness** is assessed for a MetaMask account at a **Venue**.
- **Account Readiness** is distinct from **Balance**; a user can be ready to trade with zero **Balance**, or have funds while a **Venue** is temporarily unavailable.
- A **Deposit** increases prediction market **Balance**.
- A **Withdraw** decreases prediction market **Balance**.
- A crypto up/down **Market** compares asset prices against a **Reference Price**.
- A **Live Update** refreshes the current understanding of one or more existing domain objects; it is not a separate **Event** or **Order**.
- A **Service Event** is not a prediction-market **Event**; always use the qualifier when discussing internal service messages.
- A sports **Event** may have one **Game**.
- A **Game** has participating **Teams**.
- Extended sports child events are represented as additional **Markets** grouped under one canonical parent **Event**, with child provenance preserved in metadata.
- A **Cash Out** reduces or closes a **Position**; it is not a **Withdraw**.

## Flagged Ambiguities

- "market" was used in the old codebase to mean what is now an **Event**. In PredictNext, **Market** specifically means a single binary question within an **Event**.
- "outcome" was used in the old codebase to mean what is now a **Market**. In PredictNext, **Outcome** specifically means one side of a **Market**.
- "cash out" is ambiguous. It can mean **Withdraw**, moving USDC back to the wallet, or selling a **Position**. Use **Withdraw** for funds leaving the prediction market account and **Cash Out** for selling a **Position**.
- "account" is ambiguous without context. Use **Venue Account** for the prediction-market-side account, **Proxy Wallet** for a venue-created smart contract wallet, **Account Readiness** for whether a MetaMask account can trade at a **Venue**, and MetaMask account for the user's wallet account.
- "account state" is ambiguous. Use **Account Readiness** for the product-level ability to trade; use **Venue Account** only when discussing the venue-side account itself.
- "balance" is ambiguous without context. Use prediction market **Balance** for funds in the **Venue Account** or **Proxy Wallet**, and wallet balance for the main MetaMask wallet.
- "provider" is legacy implementation language. In old code it names classes and interfaces such as `PolymarketProvider` and `PredictProvider`; in PredictNext, use **Venue** for the external prediction market, **Predict Client** for the canonical product-facing venue interface, and venue adapter only for internal protocol translation.
- "target price" is legacy UI language for a crypto up/down **Reference Price**. Use **Reference Price** in PredictNext code and docs.
- "event" is overloaded. In product/domain language, **Event** means a group of related **Markets**. Use **Service Event** for internal service-to-service notifications.

## Venue Terminology Mapping

| Canonical Term   | Polymarket Term                           | Kalshi Term                           |
| :--------------- | :---------------------------------------- | :------------------------------------ |
| Event            | Event                                     | Event                                 |
| Market           | Market / Condition                        | Market / Contract                     |
| Outcome          | Outcome token                             | Yes/No contract                       |
| Position         | Position                                  | Position                              |
| Order            | Order                                     | Order                                 |
| Venue            | Polymarket                                | Kalshi                                |
| Venue Capability | Feature support                           | Feature support                       |
| Venue Account    | Safe / deposit wallet                     | Kalshi account                        |
| Predict Client   | Canonical client using Polymarket adapter | Canonical client using Kalshi adapter |
| Venue Session    | CLOB API key + account context            | Auth session + account context        |
| Proxy Wallet     | Polymarket proxy (Safe)                   | N/A (direct trading)                  |

## Example Dialogue

> **Dev:** "When a user opens 'Will ETH hit $5k?', is that a Market?"
>
> **Domain expert:** "It is an **Event**. One **Event** may contain one or more **Markets**. In this case there's one **Market**: the binary Yes/No question."
>
> **Dev:** "So when they choose Yes at $0.65 to place a bet..."
>
> **Domain expert:** "They're choosing the Yes **Outcome** and creating an **Order** to buy shares of that **Outcome**. We don't call it a bet in code or docs."
>
> **Dev:** "And after the Order goes through, their holdings show up as a Position?"
>
> **Domain expert:** "Exactly. The **Order** creates or updates a **Position**. The user now holds shares of the Yes **Outcome** in that **Market**. If the **Market** resolves Yes, they can **Claim** their winnings. If they sell before resolution, they **Cash Out**. If they move USDC back to MetaMask, they **Withdraw**."
