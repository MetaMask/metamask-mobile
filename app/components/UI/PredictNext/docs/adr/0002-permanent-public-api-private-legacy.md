# Permanent PredictNext APIs with private legacy Polymarket implementation

PredictNext owns the APIs used by code outside the Predict team's implementation. External consumers use canonical data and actions without selecting a Venue. PredictNext resolves the Active Venue and privately delegates to Kalshi or legacy Polymarket. This avoids a second caller migration when PRED-1356 replaces the legacy implementation.

Status: accepted for the PRED-1374 mobile design following the author's confirmation. Backend financial methodology, account isolation, and funding/security implementation still require their named owners' review. This ADR does not claim those reviews occurred.

## Preserve Polymarket

Polymarket keeps its existing legacy screens, styling, interactions, internal hooks, controller, and execution semantics at Kalshi launch. Legacy Predict does not have to consume canonical types internally. Compatibility changes belong at the external boundary, not throughout the legacy codebase.

PredictNext feature owners may privately wrap legacy presentation, hooks, and actions. Public component inputs, callback results, references, and data stay canonical. Conversion can read authoritative upstream data that the existing legacy mapper discarded. A wrapper must not fabricate a legacy object from incomplete canonical data merely to satisfy a component prop type. It can re-read the original entity within its private owner using canonical identity. There is no module-global raw-object sidecar.

Engine factories, messenger registration, route/provider composition, and transaction signing/publish callbacks are explicit implementation-wiring exceptions. Shared Home, Activity, Money, Rewards, Browser, Explore, and confirmation code are not exceptions. They cannot choose a Venue, compute proxy addresses, or import legacy product types.

## Contract decisions

- Keep displayed probability separate from true Ask and Bid Prices. The canonical conversion does not change existing legacy price presentation or buy-button behavior.
- Preserve decimal share quantities, fractional Polymarket Cash Out, authoritative valuation/PnL, transaction references, and existing Activity ordering and filters. Kalshi's whole-contract sell restriction remains private to its implementation.
- Allow incomplete historical metadata, including an absent Settlement result. Catalog retirement does not erase history. Invalid financial evidence still fails validation rather than becoming a fabricated value.
- Preserve the reported Kalshi Fill side and matching-leg price without claiming buy/sell direction or silently treating a reported side as a held Position. Only authoritative transacted-side evidence permits bought/sold copy.
- Separate person/account cache identity from public Venue reads. True identity replacement removes old account data and rejects late results. Submitted operations retain their original scope across same-person context changes.
- Order completion observation remains process-local. No new Order reference persistence is authorized. Funding recovery stays with its funding owners.
- PredictNext is unreleased. Coordinated breaking mobile/API changes are allowed. Do not add Activity v2, support negotiation, dual parsers, or compatibility infrastructure for older unreleased PredictNext clients.

The detailed contract, verified consumers, mappings, wire changes, and review requirements are in [the public API contract](../public-api-contract.md). Its executable examples are design checks, not production parsers.

## Deletion test

Replace private legacy reads, actions, and presentation with the Polymarket backend implementation under PRED-1356. External caller imports, canonical types, supported interactions, and visible behavior must not change. Only private implementation and the listed composition wiring disappear. Switching legacy internals to canonical types first is not a prerequisite.

## Alternatives rejected

A third PredictBridge layer would create another public API to maintain. Rebuilding Polymarket presentation or migrating its internal hooks would expand this work and risk production parity. Exposing legacy models would force external callers to migrate again later.

The Kalshi ADR files in [decisions PR #241](https://github.com/MetaMask/decisions/pull/241) contain `Status: Accepted`, but the PR was open and unmerged when checked at head `df8d493000017fc9a6b3b47d7612578203bab690`. Their publication status is not changed by this local ADR.
