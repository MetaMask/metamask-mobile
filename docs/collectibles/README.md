# Collectibles documentation and sources

Start here for `app/components/UI/Collectibles/`. Agents should first read the module [AGENTS.md](../../app/components/UI/Collectibles/AGENTS.md), then follow its task routing and the owning documents below. The feature is Collectibles; the external PackPartner API and the Replit repository still use Gacha in some names.

## Read by task

| Document                                                                                               | Owns                                                                                                |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| [Data sources and contract status](./data-sources.md)                                                  | Current service boundaries, real versus proposed contracts, and the two temporary static clients    |
| [Module architecture](./architecture.md)                                                               | Folder ownership, dependency direction and where a change belongs                                   |
| [PackPartner business rules](./pack-partner-business-rules.md)                                         | Core behavior and the tests that exercise it                                                        |
| [DataService boundary](../../app/components/UI/Collectibles/services/data/README.md)                   | Query descriptors, caching, invalidation, polling lifecycle and workflow policy                     |
| [Recovery and persistence](../../app/components/UI/Collectibles/services/data/recovery-persistence.md) | Journal contents, standard persistence, restoration, reset and their limits                         |
| [Module README](../../app/components/UI/Collectibles/README.md)                                        | Local environment, screens, payment, artwork, animations and test commands                          |
| [Replit parity review](./replit-parity-review.md)                                                      | Recorded screen comparisons and the revisions tested, not a guarantee about a later Replit revision |
| [Data-service review](./data-services-review.md)                                                       | Historical migration decisions; dated test counts are not current validation results                |

## Product and design sources

The latest explicit product decisions govern the work. Use the business-rule documents for meaning and data ownership, and Replit for presentation and authored animations. A Replit animation or mocked balance is not permission to submit a transaction or evidence of an API contract. Current code and tests describe what is implemented; they do not turn an unapproved backend proposal into an accepted contract.

| Source                                                 | Location and scope                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Business Rules and Data Sources                        | [Product document](https://consensyssoftware.atlassian.net/wiki/spaces/EO/pages/402113134598/Business+Rules+and+Data+Sources); supplied export: `Business Rules and Data Sources.md`                                                                                                                                                            |
| Collectibles features by layer: Core, Social, Advanced | [Scope document](https://consensyssoftware.atlassian.net/wiki/spaces/EO/pages/402128109686/Collectibles+features+by+layer+Core+Social+Advanced); supplied export: `Collectibles features by layer- Core, Social, Advanced.md`                                                                                                                   |
| Replit                                                 | Local checkout `../external/replit/Gacha-North-Star` relative to the MetaMask directory; active UI under `artifacts/figma-design/src/components/gacha`. Inspect active imports and flags, rather than copying dormant screens. The [parity review](./replit-parity-review.md) records reviewed commits.                                         |
| Demo brief                                             | Sibling decisions checkout: `../decisions/collectible-core-demo-brief.md` relative to the Mobile root. Useful scope summary; contains historical implementation assumptions listed below.                                                                                                                                                       |
| PackPartner                                            | Reviewed partner API, metadata, buyback and test-funds contracts; source links and host configuration are shared privately by the integration owner. Request those references before changing transport behavior. Neutral naming does not create a public documentation domain. Validate the contract against real responses and local schemas. |

The two supplied Markdown exports originally came from `~/Library/Mobile Documents/com~apple~CloudDocs/Downloads/`. They are source material, not additional copies to maintain inside this module.

## ADR status and known drift

The following paths are relative to the sibling **MetaMask/decisions** checkout, not this Mobile repository. Status was read from that checkout on 2026-11-10.

| ADR                                          | Status   | Path                                                         |
| -------------------------------------------- | -------- | ------------------------------------------------------------ |
| 0020, TanStack Query for External API Data   | Accepted | `decisions/core/0020-tanstack-query-adoption.md`             |
| 0068, Collectibles Core integration          | Proposed | `decisions/mobile/0068-collectibles-core-integration.md`     |
| 0069, Collectibles integration in Social API | Proposed | `decisions/platform/0069-collectibles-social-integration.md` |
| 0070, Collectibles API                       | Proposed | `decisions/platform/0070-collectibles-api.md`                |

ADRs 0068–0070 describe the intended product/backend boundaries, but require synchronization with the current Mobile decisions. In particular, ADR 0068 and the brief still mention `GachaController`, MetaMask NFT API ownership plus a local NFT/offer cache, controller-owned public reads, a generic multi-provider catalogue, Quick Buy/Fund & Buy, a 1–20 pack limit, and Rive reveal assumptions. The current implementation instead uses Collectibles naming, PackPartner-owned inventory and offers through DataServices, one execution provider with direct application type aliases, a maximum of five packs, disabled alternate-token payment until the required Solana support exists, and Replit-authored reveal animations. Layer names describe data responsibilities; they are not switches or alternate application modes for the static clients.

The external decisions repository is not updated by a Mobile implementation change. Update those proposed ADRs in their owning repository before claiming they match the implementation or have been approved. Keep persistence behavior and limits in the dedicated [recovery document](../../app/components/UI/Collectibles/services/data/recovery-persistence.md), without inferring additional guarantees from mocked recovery tests.
