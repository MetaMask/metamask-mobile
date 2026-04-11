# Ubiquitous Language

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

| Term             | Definition                                                                                                  | Aliases to avoid                         |
| :--------------- | :---------------------------------------------------------------------------------------------------------- | :--------------------------------------- |
| **Provider**     | An external prediction market platform integrated as a data source. Examples include Polymarket and Kalshi. | Platform, exchange, source               |
| **Adapter**      | The code module that translates between a provider's native API and Predict's canonical data model.         | Provider (overloaded), bridge, connector |
| **Proxy Wallet** | A smart contract wallet created on the provider's platform to hold user funds and execute trades.           | Account, sub-wallet                      |

## UI Terms

| Term               | Definition                                                                         | Aliases to avoid                     |
| :----------------- | :--------------------------------------------------------------------------------- | :----------------------------------- |
| **Event Card**     | A card component displaying an event with its markets and outcomes.                | Market card (old term)               |
| **Outcome Button** | A tappable button representing one outcome of a market, showing the current price. | Bet button (old term), action button |
| **Position Card**  | A card displaying a user's position in a specific market, including P&L.           | Position row, position detail        |

## Architecture Terms

| Term           | Definition                                                                                                            | Aliases to avoid                              |
| :------------- | :-------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------- |
| **Service**    | A deep module encapsulating a specific domain with a slim public interface. Examples include trading and market data. | Controller (different role), manager, handler |
| **Controller** | A thin orchestrator that delegates to services. It serves as the entry point for write operations from the UI.        | Service (different role)                      |

## Relationships

- Each **Event** contains one or more **Markets**.
- A **Market** contains exactly two **Outcomes**, typically Yes and No.
- Every **Position** is tied to exactly one **Outcome**.
- An **Order** targets exactly one **Outcome**.
- The **Provider** is accessed through exactly one **Adapter**.
- An **Event** originates from exactly one **Provider**.

## Example Dialogue

> **Dev:** "When a user taps a market card and sees the details..."
>
> **Domain expert:** "That's an **Event Card**. This component shows an Event. For example, 'Will ETH hit $5k?' One Event may contain one or more Markets. In this case there's just one Market, the binary Yes/No question."
>
> **Dev:** "So when they tap the Yes button at $0.65 to place a bet..."
>
> **Domain expert:** "They're tapping an **Outcome Button** for the Yes Outcome. Such an action creates an Order to buy shares of that Outcome. We don't call it a 'bet' in code, it's an **Order**."
>
> **Dev:** "And after the order goes through, their holdings show up as a position?"
>
> **Domain expert:** "Exactly. The Order creates a Position. Users now hold shares of the Yes Outcome in that Market. If the Market resolves Yes, they can Claim their winnings."

## Flagged Ambiguities

- "market" was used in the old codebase to mean what is now an **Event**. In the new codebase, **Market** specifically means a single binary question within an **Event**.
- "outcome" was used in the old codebase to mean what is now a **Market**. In the new codebase, **Outcome** specifically means one side of a **Market**.
- "cash out" is ambiguous. It could mean **Withdraw**, moving USDC back to the wallet, or selling a **Position**. Use the specific term.
- "balance" is ambiguous without context. Always qualify as "prediction market **Balance**", funds in the proxy wallet, versus "wallet balance", the main MetaMask wallet.
- "provider" can mean the platform or the code module. Use **Provider** for the platform and **Adapter** for the code module.

## Provider Terminology Mapping

| Canonical Term | Polymarket Term         | Kalshi Term          |
| :------------- | :---------------------- | :------------------- |
| Event          | Event                   | Event                |
| Market         | Market / Condition      | Market / Contract    |
| Outcome        | Outcome token           | Yes/No contract      |
| Position       | Position                | Position             |
| Order          | Order                   | Order                |
| Proxy Wallet   | Polymarket proxy (Safe) | N/A (direct trading) |
