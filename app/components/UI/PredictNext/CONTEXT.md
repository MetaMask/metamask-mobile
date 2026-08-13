# PredictNext Context

PredictNext is the prediction-markets context in MetaMask Mobile. This glossary defines the canonical product language used for people, venues, events, markets, outcomes, orders, positions, funding, and settlement.

## Language

### People and Accounts

**Predict User**:
The person using Predict. A Predict User may use more than one MetaMask wallet account, but is still one person for venues that use person-level identity and verification.
_Avoid_: Address, wallet, account, owner

**Funding Wallet**:
The MetaMask wallet account selected to authorize or receive wallet-side Deposits and Withdraws. A Funding Wallet is execution context, not proof of the Predict User's identity.
_Avoid_: User, Venue Account, Predict account

**Venue Account**:
The venue-side account through which a Predict User's Orders, Positions, and Balance are represented. A Venue Account may be person-scoped, as with a Kalshi ISV sub-account, or wallet-scoped, as with some Polymarket account models.
_Avoid_: Provider account, Predict address, account

**Venue Session**:
Internal authentication, eligibility, readiness, and Venue Account context for one Predict User at one Venue. A Venue Session may also carry Funding Wallet context when the Venue is wallet-scoped. It is operational context, not product state.
_Avoid_: Auth cache, API key, session object passed through product modules

**Predict Client**:
The session-bound handle product modules use to perform account-scoped operations at one Venue for one Predict User. Public market discovery does not require a Predict Client. The handle exposes only the capability modules supported by the Venue.
_Avoid_: Provider, raw venue client, public market-data client

**Account Readiness**:
Whether a Predict User can trade through a Venue Account at a Venue. Readiness includes setup, eligibility, verification, and venue availability. For wallet-scoped venues it may also depend on the selected Funding Wallet. Readiness is a projection, not the onboarding workflow itself.
_Avoid_: Account state, wallet status, setup flags, portfolio-derived readiness

**Account Setup**:
The resumable workflow that turns an unready Predict User into a trade-ready Venue Account. For Kalshi this includes create or link user, email or phone verification, profile collection, KYC, and ISV sub-account creation. For Polymarket it may include wallet or deposit-wallet setup.
_Avoid_: Readiness, portfolio setup

**Proxy Wallet**:
A smart contract wallet created for a Venue to hold user funds and execute Orders.
_Avoid_: Venue Account, sub-wallet

### Core Data Model

**Event**:
A product grouping of one or more related binary Markets on a single topic, such as "2026 NBA Finals" or "Will ETH hit $5k?". A Venue's recurring series is a separate grouping and is not a canonical Event.
_Avoid_: Market, PredictMarket

**Market**:
A single binary question within an Event, resolved as Yes or No, such as "Lakers to win Game 7".
_Avoid_: Outcome, PredictOutcome, condition

**Outcome**:
One side of a binary Market, representing a tradeable position, usually labeled Yes or No but sometimes using a custom label. An Outcome has a Venue-qualified identifier that may be native to the Venue or deterministically derived by the adapter when the Venue exposes only a side label; this identifier is not necessarily a token identifier.
_Avoid_: OutcomeToken, token, share

**Position**:
A Predict User's holdings in a specific Outcome, measured in shares.
_Avoid_: Bet, wager, stake

**Order**:
A request to buy or sell Outcome shares at a specified price.
_Avoid_: Trade, transaction

### Order Lifecycle

**Active Order**:
An Order currently being processed through the placement pipeline, including preview, optional funding, placement, and confirmation.
_Avoid_: Pending order, in-flight order

**Immediate Order**:
An Order that must execute immediately under its time-in-force rule and does not remain open on the Venue order book. Fill-or-kill and immediate-or-cancel Orders are Immediate Orders.
_Avoid_: Market order when the Venue actually receives a priced order

**Resting Order**:
An accepted Order that can remain open on the Venue order book until filled, cancelled, or expired.
_Avoid_: Active Order; the latter describes the app workflow, not Venue order-book state

**Order Preview**:
A short-lived, venue-bound price quote showing estimated cost, fees, and potential return before an Order is placed. It has an expiry and cannot be trusted after it expires.
_Avoid_: Unbound estimate, mutable order payload

**Order Receipt**:
The canonical result returned after a Venue accepts, rejects, or fills a submitted Order. It includes the venue order identifier, status, spent and received amounts, and transaction hashes when applicable.
_Avoid_: Order Result, raw venue response

**Fill**:
Execution of some or all of an Order against another order. Activity should be derived from Fills rather than inferring execution from Order creation records.
_Avoid_: Order when referring to execution

**Cash Out**:
Selling an existing Position before Market resolution.
_Avoid_: Sell, exit, withdraw

**Claim**:
Collecting winnings from a resolved Market where the Venue requires explicit redemption. Some Venues settle winnings automatically; those payouts are represented as Settlement activity rather than manual Claims.
_Avoid_: Redeem, collect

**Settlement**:
A payout or portfolio adjustment produced when a resolved Market is finalized by a Venue. A Settlement may be automatic, as with Kalshi, or may follow an explicit Claim, as with Polymarket.
_Avoid_: Claim when no user action is required, payout without context

### Financial Terms

**Deposit**:
Transferring settlement currency from a Funding Wallet into a Venue Account. The mechanics vary by Venue: a Polymarket Deposit may use an on-chain wallet transaction, while a Kalshi Deposit uses a one-time, amount-specific address followed by a venue deposit indication.
_Avoid_: Fund, top up

**Withdraw**:
Transferring settlement currency from a Venue Account to a Funding Wallet. A Withdraw may be a wallet transaction or a Venue operation depending on the Venue.
_Avoid_: Cash out

**Funding Plan**:
A short-lived, venue-produced plan prepared before a Predict User confirms a Deposit, Withdraw, or Claim. It describes either a wallet transfer or a Venue operation and carries a stable Venue Operation reference. Preparing a Funding Plan must not itself move funds.
_Avoid_: TransactionBatch as a product term, tx builder, completed transfer

**Venue Operation**:
A durable Venue-side operation reference for a write such as a Deposit, Withdraw, or Order. It lets the system resume observation or reconcile after app restarts and lost responses. The reference does not itself make an external Venue call idempotent; retry requires verified Venue semantics.
_Avoid_: UI request, transient loading state

**Balance**:
The Predict User's available settlement-currency amount in a Venue Account, ready for placing Orders.
_Avoid_: Funds, wallet balance, raw token amount

**Ask Price**:
The lowest currently available per-share price to buy an Outcome, expressed in settlement currency. A missing Ask Price means no current buy quote; it does not mean zero.
_Avoid_: Price, buy price, Yes ask

**Bid Price**:
The highest currently available per-share price to sell an Outcome, expressed in settlement currency. A missing Bid Price means no current sell quote; it does not mean zero.
_Avoid_: Price, sell price, Yes bid

**Volume**:
Total settlement currency traded on a Market or Event across all users.
_Avoid_: Liquidity

**Liquidity**:
The depth of available orders in a Market order book; higher liquidity means less price slippage.
_Avoid_: Volume

**Reference Price**:
A baseline asset price used to display or resolve an up/down Market, such as the starting BTC price for a crypto up/down prediction.
_Avoid_: Target price, strike price

**Live Update**:
A real-time change from a Venue that affects visible Events, Markets, Outcomes, prices, Orders, or Positions.
_Avoid_: WebSocket message, overlay

**Service Event**:
An internal PredictNext message emitted for observation, such as analytics or diagnostics. Service Events are not the system of record for cache mutation or financial workflow state.
_Avoid_: Event without qualifier, UI event, overlay

### Sports Terms

**Game**:
A sports contest represented as optional metadata on an Event, including scheduled time, live status, score, period, league, and participating Teams.
_Avoid_: Match, fixture, raw sports payload

**Team**:
A participant in a sports Game, including canonical display metadata such as name, abbreviation, logo, and color.
_Avoid_: Team DTO, venue team

### Venue Terms

**Venue**:
An external prediction market where Predict Users can browse Events, place Orders, and manage Positions, such as Polymarket or Kalshi.
_Avoid_: Provider, platform, exchange, source

**Venue Capability**:
A product capability supported by a Venue, such as Account Setup, Deposits, Withdrawals, Claims, Resting Orders, live prices, or order books. Venue mechanics such as proxy wallets, signing schemes, transaction shape, and sub-account routing are not capabilities.
_Avoid_: Provider feature

**Venue Status**:
A dynamic availability projection for a Venue, such as available, degraded, or unavailable. It is distinct from static Venue Capabilities and from user-specific Account Readiness.
_Avoid_: Capability, feature flag

**Active Venue**:
The Venue whose Predict experience is currently shown. The Active Venue may come from a regional default or a valid Venue Selection Preference.
_Avoid_: Provider, selected provider, current market source

**Venue Selection Preference**:
A Predict User's explicit settings choice of Active Venue. It overrides regional defaulting only while that Venue remains selectable; it is not proof of eligibility or availability.
_Avoid_: Provider toggle, eligibility, Venue Status

**Remote Venue Adapter**:
A mobile Venue Adapter implementation that translates canonical Predict calls into requests to a MetaMask Predict backend. The backend owns volatile Venue protocol logic and Venue credentials; mobile retains user intent, confirmation, and wallet signing.
_Avoid_: New Venue, backend provider, opaque proxy

## Relationships

- A Predict User may control multiple Funding Wallets.
- A Predict User may have one or more Venue Accounts depending on the Venue's identity model.
- A Kalshi member has one MetaMask ISV Venue Account regardless of which Funding Wallet is selected.
- A wallet-scoped Venue may use the Funding Wallet as part of Venue Account selection.
- A Predict Client is bound to one Predict User, one Venue, and the Venue Account context required by that Venue.
- A Venue Session is internal operational context used by a Predict Client; it is not product state.
- Account Readiness is assessed for a Predict User at a Venue and may depend on Funding Wallet context for wallet-scoped Venues.
- Account Setup can change Account Readiness from setup-required to ready.
- Account Readiness is distinct from Balance and Venue Status; a Predict User can be ready with zero Balance, or funded while a Venue is unavailable.
- Each Event originates from exactly one Venue and contains one or more Markets.
- A Venue's recurring Series is distinct from the canonical Event grouping.
- Each Market contains exactly two Outcomes, typically Yes and No.
- Each Position is tied to exactly one Outcome.
- Each Order targets exactly one Outcome and may produce zero or more Fills.
- An Immediate Order does not remain open; a Resting Order may later be cancelled or amended when the Venue supports those capabilities.
- Each submitted Order may produce one Order Receipt.
- A Funding Plan is prepared before confirmation and references a durable Venue Operation.
- A Deposit increases Venue Account Balance.
- A Withdraw decreases Venue Account Balance.
- A Settlement records winnings paid after a Market is finalized.
- A Cash Out reduces or closes a Position; it is not a Withdraw.
- A crypto up/down Market compares asset prices against a Reference Price.
- A Live Update refreshes the current understanding of an existing domain object; it is not a separate Event or Order.
- A Service Event is not a prediction-market Event; always use the qualifier for internal messages.
- Exactly one Venue is the Active Venue for a rendered Predict experience.
- Without a valid Venue Selection Preference, US geolocation defaults the Active Venue to Kalshi and non-US geolocation defaults it to Polymarket.
- A valid Venue Selection Preference takes precedence over regional defaulting, but does not override eligibility, Venue Status, or rollout controls.
- A sports Event may have one Game, and a Game has participating Teams.
- Extended sports child Events are represented as additional Markets grouped under one canonical parent Event, with child provenance preserved in metadata.

## Flagged Ambiguities

- "user" can mean a person or a wallet address. Use Predict User for the person and Funding Wallet for the selected wallet account.
- "account" is ambiguous. Use Venue Account for venue-side holdings, Funding Wallet for wallet-side execution, Account Readiness for the ability to trade, and Proxy Wallet for a venue-created smart contract wallet.
- "market" was used in the old codebase to mean what is now an Event. In PredictNext, Market means one binary question within an Event.
- "outcome" was used in the old codebase to mean what is now a Market. In PredictNext, Outcome means one side of a Market.
- "cash out" can mean Withdraw or selling a Position. Use Withdraw for funds leaving a Venue Account and Cash Out for selling a Position.
- "balance" is ambiguous. Use Balance for funds in a Venue Account and wallet balance for funds in a Funding Wallet.
- "provider" is legacy implementation language. Use Venue for the external market, Predict Client for an account-scoped canonical handle, and Venue Adapter for protocol translation.
- "target price" is legacy UI language for a crypto up/down Reference Price.
- "event" is overloaded. Event is a product grouping of Markets; Service Event is an internal observation message.
- "pending order" is ambiguous. Use Active Order for app workflow state and Resting Order for accepted order-book state.
- "selected provider" conflates product choice with implementation language. Use Active Venue for the rendered Venue and Venue Selection Preference for an explicit settings choice.

## Venue Terminology Mapping

| Canonical Term | Polymarket Term                            | Kalshi Term                                         |
| :------------- | :----------------------------------------- | :-------------------------------------------------- |
| Predict User   | Wallet owner / user                        | Kalshi member, one real person                      |
| Funding Wallet | Owner wallet                               | User-controlled payout/deposit wallet               |
| Venue Account  | Safe / deposit wallet                      | MetaMask ISV sub-account                            |
| Event          | Event                                      | Event                                               |
| Market         | Market / Condition                         | Market / Contract                                   |
| Outcome        | Outcome token                              | Yes/No side                                         |
| Position       | Position                                   | Position                                            |
| Order          | Order                                      | Order                                               |
| Fill           | Fill                                       | Fill                                                |
| Venue          | Polymarket                                 | Kalshi                                              |
| Venue Session  | CLOB credential + account context          | MetaMask backend session + Kalshi account context   |
| Account Setup  | Wallet/deposit-wallet setup                | ISV KYC or existing-user linking                    |
| Funding Plan   | Wallet transaction or bridge/on-chain flow | One-time deposit transfer or API withdrawal preview |
| Settlement     | Manual Claim may be required               | Automatic exchange Settlement                       |

## Example Dialogue

> **Dev:** "When a user opens 'Will ETH hit $5k?', is that a Market?"
>
> **Domain expert:** "It is an Event. The Event contains a binary Market, and that Market has Yes and No Outcomes."
>
> **Dev:** "Is their selected address also their Kalshi account?"
>
> **Domain expert:** "No. The Predict User is the person, Kalshi represents them through a Venue Account, and the selected MetaMask address is the Funding Wallet. Those concepts may coincide for wallet-scoped Venues, but they are not interchangeable."
>
> **Dev:** "What happens after they choose Yes?"
>
> **Domain expert:** "They confirm an Order Preview and submit an Order for the Yes Outcome. Any execution is recorded as one or more Fills, which update their Position. If the Market resolves in their favor, Kalshi creates an automatic Settlement; a Venue that requires redemption would instead offer a Claim."
