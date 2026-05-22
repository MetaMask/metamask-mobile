# PredictNext Context

PredictNext is the prediction markets context in MetaMask Mobile. This glossary defines the canonical product language used for events, markets, outcomes, positions, orders, and account state.

## Core Data Model

| Term         | Definition                                                                                                                | Aliases to avoid                                                       |
| :----------- | :------------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------- |
| **Event**    | A group of related binary markets on a single topic. For example, "2026 NBA Finals" or "Will ETH hit $5k?"                | Market (old codebase term), PredictMarket (old type name)              |
| **Market**   | A single binary question within an event, resolved as Yes or No. For example, "Lakers to win Game 7"                      | Outcome (old codebase term), PredictOutcome (old type name), condition |
| **Outcome**  | One side of a binary market, representing a tradeable position. Usually labeled "Yes" or "No" but may have custom labels. | OutcomeToken (old codebase term), token, share                         |
| **Position** | A user's holdings in a specific outcome, measured in shares.                                                              | Bet, wager, stake                                                      |
| **Order**    | A request to buy or sell outcome shares at a specified price.                                                             | Trade, transaction                                                     |

## Order Lifecycle

| Term              | Definition                                                                                                                   | Aliases to avoid               |
| :---------------- | :--------------------------------------------------------------------------------------------------------------------------- | :----------------------------- |
| **Active Order**  | An order currently being processed through the placement pipeline. This includes preview, deposit, place, and confirm steps. | Pending order, in-flight order |
| **Order Preview** | A price quote showing estimated cost, fees, and potential return before placement.                                           | Quote, estimate                |
| **Cash Out**      | Selling an existing position before event resolution.                                                                        | Sell, exit                     |
| **Claim**         | Collecting winnings from a resolved market where the user held the winning outcome.                                          | Redeem, collect                |

## Financial Terms

| Term          | Definition                                                                                                                   | Aliases to avoid                                          |
| :------------ | :--------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------- |
| **Deposit**   | Transferring USDC from the user's wallet to their prediction market account. This usually goes to a Polymarket proxy wallet. | Fund, top up                                              |
| **Withdraw**  | Transferring USDC from the prediction market account back to the user's wallet.                                              | Cash out (ambiguous, also means selling positions)        |
| **Balance**   | The user's available USDC in their prediction market account, ready for placing orders.                                      | Funds, wallet balance (ambiguous, could mean main wallet) |
| **Volume**    | Total USDC traded on a market or event across all users.                                                                     | Liquidity (different concept)                             |
| **Liquidity** | The depth of available orders in a market's order book. Higher liquidity means less price slippage.                          | Volume (different concept)                                |

## Platform Terms

| Term             | Definition                                                                                                  | Aliases to avoid           |
| :--------------- | :---------------------------------------------------------------------------------------------------------- | :------------------------- |
| **Provider**     | An external prediction market platform integrated as a data source. Examples include Polymarket and Kalshi. | Platform, exchange, source |
| **Proxy Wallet** | A smart contract wallet created on the provider's platform to hold user funds and execute trades.           | Account, sub-wallet        |

## Relationships

- Each **Event** contains one or more **Markets**.
- A **Market** contains exactly two **Outcomes**, typically Yes and No.
- Every **Position** is tied to exactly one **Outcome**.
- An **Order** targets exactly one **Outcome**.
- An **Event** originates from exactly one **Provider**.

## Example Dialogue

> **Dev:** "When a user opens 'Will ETH hit $5k?', is that a Market?"
>
> **Domain expert:** "It is an **Event**. One Event may contain one or more **Markets**. In this case there's one Market: the binary Yes/No question."
>
> **Dev:** "So when they choose Yes at $0.65 to place a bet..."
>
> **Domain expert:** "They're choosing the Yes **Outcome** and creating an **Order** to buy shares of that Outcome. We don't call it a 'bet' in code or docs."
>
> **Dev:** "And after the order goes through, their holdings show up as a position?"
>
> **Domain expert:** "Exactly. The Order creates a **Position**. Users now hold shares of the Yes Outcome in that Market. If the Market resolves Yes, they can **Claim** their winnings."

## Flagged Ambiguities

- "market" was used in the old codebase to mean what is now an **Event**. In the new codebase, **Market** specifically means a single binary question within an **Event**.
- "outcome" was used in the old codebase to mean what is now a **Market**. In the new codebase, **Outcome** specifically means one side of a **Market**.
- "cash out" is ambiguous. It could mean **Withdraw**, moving USDC back to the wallet, or selling a **Position**. Use the specific term.
- "balance" is ambiguous without context. Always qualify as "prediction market **Balance**", funds in the proxy wallet, versus "wallet balance", the main MetaMask wallet.
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
