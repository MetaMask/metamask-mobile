# PredictNext Context

PredictNext is the prediction markets context in MetaMask Mobile. This glossary defines the canonical product language used for events, markets, outcomes, positions, orders, and prediction market account state.

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
The user's available USDC in their prediction market account, ready for placing **Orders**.
_Avoid_: Funds, wallet balance

**Volume**:
Total USDC traded on a **Market** or **Event** across all users.
_Avoid_: Liquidity

**Liquidity**:
The depth of available orders in a **Market** order book; higher liquidity means less price slippage.
_Avoid_: Volume

### Platform Terms

**Provider**:
An external prediction market platform integrated as a data source, such as Polymarket or Kalshi.
_Avoid_: Platform, exchange, source

**Proxy Wallet**:
A smart contract wallet created on a **Provider** platform to hold user funds and execute **Orders**.
_Avoid_: Account, sub-wallet

## Relationships

- Each **Event** contains one or more **Markets**.
- Each **Market** contains exactly two **Outcomes**, typically Yes and No.
- Each **Position** is tied to exactly one **Outcome**.
- Each **Order** targets exactly one **Outcome**.
- Each **Event** originates from exactly one **Provider**.
- A **Deposit** increases prediction market **Balance**.
- A **Withdraw** decreases prediction market **Balance**.
- A **Cash Out** reduces or closes a **Position**; it is not a **Withdraw**.

## Flagged Ambiguities

- "market" was used in the old codebase to mean what is now an **Event**. In PredictNext, **Market** specifically means a single binary question within an **Event**.
- "outcome" was used in the old codebase to mean what is now a **Market**. In PredictNext, **Outcome** specifically means one side of a **Market**.
- "cash out" is ambiguous. It can mean **Withdraw**, moving USDC back to the wallet, or selling a **Position**. Use **Withdraw** for funds leaving the prediction market account and **Cash Out** for selling a **Position**.
- "balance" is ambiguous without context. Use prediction market **Balance** for funds in the provider account or **Proxy Wallet**, and wallet balance for the main MetaMask wallet.
- "provider" means the external prediction market platform. Avoid using it for implementation modules.

## Provider Terminology Mapping

| Canonical Term | Polymarket Term         | Kalshi Term          |
| :------------- | :---------------------- | :------------------- |
| Event          | Event                   | Event                |
| Market         | Market / Condition      | Market / Contract    |
| Outcome        | Outcome token           | Yes/No contract      |
| Position       | Position                | Position             |
| Order          | Order                   | Order                |
| Proxy Wallet   | Polymarket proxy (Safe) | N/A (direct trading) |

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
