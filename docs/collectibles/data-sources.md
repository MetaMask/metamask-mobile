# Collectibles data sources

Collectibles is the mobile feature. PackPartner, Collectibles API and Social API are three distinct data sources, not selectable execution providers.

| Source           | Responsibility                                                                    | Mobile access                                                    |
| ---------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| PackPartner      | Catalogue, odds, pack inventory, owned NFTs, buyback offers, purchase and opening | PackPartnerDataService; commands through PackPartnerProvider     |
| Collectibles API | Indexed history, statistics, pack/card indicators, wallet summaries, Pokédex      | CollectiblesApiDataService and CollectiblesApiClient             |
| Social API       | Profiles, feed, follows, comments, reactions, sharing and leaderboard             | CollectiblesSocialApiDataService and CollectiblesSocialApiClient |

## Boundaries

PackPartner operations and owned NFTs must remain available when the other services fail. The controller stores operation recovery state, never an invented historical portfolio. Collectibles API supplies historical statistics; Social consumes its indexed summaries on the backend. Mobile displays endpoint responses and does not reconstruct those backend business rules.

The two future backend clients are temporarily implemented in exactly two self-contained files: `MockCollectiblesApiClient.ts` and `MockCollectiblesSocialApiClient.ts`. Their endpoints return fixed TypeScript responses, including static command receipts. There is no simulated indexer, mutable social database, dataset registry or mock-specific branch in hooks and screens. Injecting a real client replaces that transport boundary; it does not switch application modes. No real HTTP client is fabricated before the contracts exist.

Mainnet/devnet selection applies to PackPartner URLs, API keys, Solana scope and USDC mint. It is independent of the two temporary client implementations. Purchases and sales are real transactions on the selected network.

## Types

`providers/pack-partner/types` contains the current authoritative execution models. `Collectibles/types/index.ts` re-exports them as generic `Collectibles` type aliases for application consumers. This is a compile-time boundary, with no runtime copying or identity mapper. A future provider can adapt to the existing shape; an abstract multi-provider schema is deferred until a concrete requirement exists.

## Contract status

| Boundary              | Implemented in Mobile                                                                                                                                                                                                                                 | Still proposed or external                                                                                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PackPartner transport | [PackPartnerApiClient](../../app/components/UI/Collectibles/services/clients/PackPartnerApiClient.ts), runtime response schemas, mainnet/devnet configuration, complete wallet-card cursor pagination with `step=500`, real command and read paths    | Production proxy/auth arrangement and provider guarantees must be agreed; a passing mock test does not establish them                                                                                                         |
| Collectibles API      | [CollectiblesApiClient](../../app/components/UI/Collectibles/services/clients/CollectiblesApiClient.ts), DataService and consumers for indexed history, batched pack/card indicators, wallet summary and Pokédex                                      | ADR 0070 is Proposed. Routes, authentication, complete payload/error schemas and indexing/reconciliation semantics require backend agreement                                                                                  |
| Social API            | [CollectiblesSocialApiClient](../../app/components/UI/Collectibles/services/clients/CollectiblesSocialApiClient.ts), DataService and consumers for profiles/feed/leaderboards, batched social context, comments/reactions/follows and reviewed shares | ADR 0069 is Proposed. Collectibles typed-feed support and commands are not a deployed integration. Profile favorites, profile opening history and standalone card sharing are local client requirements awaiting confirmation |

The TypeScript interfaces are executable consumer contracts for this implementation, not assertions that matching HTTP endpoints already exist. In particular, `collectibles_cards`/`shareCards` describes sharing a card snapshot without fabricating an indexed pack ID. A profile's opening history is not proof of current NFT ownership. Real owned cards always come from PackPartner.

The proposed indexed contract uses opaque pack IDs, provider-qualified pack types, `{ namespace, address }` accounts, decimal-string monetary fields and `null` for unknown values. Keep those semantics at the client boundary. Do not infer mint ownership, an opening recipient, historical PnL, a Pokédex unlock or a leaderboard score from presentation metadata. Current screen totals such as the sum of current insured values are distinct from backend historical metrics. The [collection loading and valuation rationale](../../app/components/UI/Collectibles/README.md#collection-loading-and-valuation) documents the complete-read strategy and the holder counts behind it.

## Execution vocabulary and guarantees

| Term or field                      | Meaning and owner                                                                                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pack code                          | PackPartner catalogue offer, used to request a checkout; never an individual purchase ID                                                            |
| `memo`                             | One PackPartner purchase or buyback operation, scoped to the account and environment in the local journal                                           |
| `batchId` / `batchMemos`           | Groups a multipack checkout and its ordered individual memos; grouping does not make payments or sales atomic                                       |
| Mint / asset ID                    | The NFT identity; it is not the ID of an opening, since a card may return to the pool                                                               |
| Indexed `packId` / `packType`      | Proposed Collectibles API identities; do not substitute a provider memo or a display name without the agreed derivation                             |
| `priceAmount` / transaction amount | Integer USDC base-unit strings; the six-decimal settlement amount is validated before signing. Display prices/valuations are not transaction inputs |
| Opening versus reveal              | Opening obtains the provider result; reveal only presents it. Navigation or skipping an animation must not create an opening or sale                |
| Insured value versus buyback       | Provider valuation versus a current executable offer; one is not evidence of the other                                                              |

The implemented client validates response shape and operation correlation: a populated `/pack/status` response must carry the requested memo. An empty unknown-operation response may omit it. An awarded opening requires a non-blank mint and transaction signature; buyback creation requires a non-blank memo and serialized transaction. An explicit `success: false` cannot be treated as an award or a created buyback just because other payload fields are present. Errors expose only a known code, an allowlisted context and an HTTP status; raw messages and payload-bearing causes do not cross into logs or persisted operations. Legacy error messages are stripped on restoration and persistence.

Read cancellation propagates to HTTP and wallet-card pagination. Caller cancellation is not retried; a timeout remains a retryable network failure. Cancellation of a shared-data aggregate stops new work without cancelling reads still shared by other consumers. None of these read rules imply that a submitted financial transaction can be cancelled.

Provider deadlines, refund behavior, and negative status answers remain external contract assumptions to confirm against reviewed PackPartner documentation. HTTP 4xx alone is not treated as proof of no broadcast. The workflow and [recovery contract](../../app/components/UI/Collectibles/services/data/recovery-persistence.md) define how uncertain operations are retained; local tests prove our handling of responses, not a remote idempotency guarantee.

## Temporary clients

Engine currently injects exactly these two implementations:

- [MockCollectiblesApiClient](../../app/components/UI/Collectibles/services/clients/MockCollectiblesApiClient.ts)
- [MockCollectiblesSocialApiClient](../../app/components/UI/Collectibles/services/clients/MockCollectiblesSocialApiClient.ts)

Each file contains fixed responses behind its normal client interface. There is no layer gate, `source: 'demo'` branch, mock registry, mutable social store or mock indexing/reconciliation engine. Command receipts are static too: submitting a mocked command does not imply its next mocked read changes. Network selection remains independent of this injection.

Batch methods accept the list the screen needs (for example pack types or card IDs); keep this boundary when a real backend client is installed rather than issuing one ad hoc Social/Collectibles API request per tile. Static pagination examples and batched responses exercise consumer contracts; they do not implement backend pagination, aggregation or business rules. Tests may inject controlled responses at this same boundary to exercise loading, failure and invalidation.

Before replacing either temporary client, agree the live contract, authentication, error behavior, pagination, batching and post-command consistency with its backend team. Add transport validation and integration coverage at that boundary. Do not invent endpoint URLs or propagate mocked receipts into PackPartner ownership or financial operation state.

See the [source index and ADR status](./README.md), [Core business rules](./pack-partner-business-rules.md), [module ownership](./architecture.md) and [DataService implementation](../../app/components/UI/Collectibles/services/data/README.md).
