# Collectibles module architecture

This is the ownership map for the current Mobile module. [Data sources](./data-sources.md) defines the contracts; the [DataService README](../../app/components/UI/Collectibles/services/data/README.md) owns read/write policy. Do not duplicate their cache or recovery rules here.

## Runtime paths

```text
Screen → query hook → @metamask/react-data-query / Messenger → DataService → API client
Screen → command hook → CollectiblesController → PackPartnerProvider → API client / Snap
Screen visibility → usePackPartnerOpenings → PackPartnerDataService → public REST snapshots
```

PackPartner execution and ownership remain usable if Collectibles API or Social fails. These services enrich the same screens; they are not alternative purchase providers. Reads do not trigger recovery or transaction creation. Financial workflow status and last-second offer validation are uncached observations controlled by the workflow, not display queries.

## Module ownership

Paths below are relative to `app/components/UI/Collectibles/` unless stated otherwise.

| Location                                                     | Responsibility                                                                                        | Keep out                                                                    |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `controllers/CollectiblesController*`                        | Engine/messenger commands and persisted operation journal                                             | Artwork selection, owned-card snapshots and server-response TTLs            |
| `providers/pack-partner/PackPartnerProvider.ts`              | Purchase, opening, sale and restart transitions; validates reviewed intent before requesting the Snap | Display caches and speculative provider dispatch                            |
| `providers/pack-partner/{schemas,types,utils,constants}`     | Current provider models, validation, protocol calculations and network configuration                  | Social/Collectibles API business calculations                               |
| `services/clients`                                           | Typed transport contracts, validated PackPartner client and the two temporary static backend clients  | UI state, navigation and a simulated indexer/backend                        |
| `services/data`                                              | Background cached reads, descriptors, invalidation and live subscriptions                             | Persisted financial workflow state                                          |
| `types/index.ts`                                             | Application names that directly alias current PackPartner types                                       | A second schema or identity mapper                                          |
| `hooks` and `providers/pack-partner/hooks`                   | Compose query/messenger access with screen lifecycle and expose command intent                        | Direct HTTP, independent response caches or duplicate backend calculations  |
| `views`                                                      | Route/screen orchestration, navigation, sheets and screen-local state                                 | Protocol parsing and signing rules                                          |
| `components`                                                 | Reusable rendering and interactions built from the installed design system                            | Owning a route merely because a tile opens it                               |
| `constants/packArtwork.ts` and `utils/packClassification.ts` | Explicit provider:code names/images/halo colors, category grouping and numbered tier badges           | Price-based artwork inference, catalogue snapshots or controller state      |
| `assets` and `components/CollectiblesMotion`                 | Reviewed bundled artwork/video and Replit animation source/runtime bridge                             | Remote executable scripts, wallet access or replacement animation timelines |
| `app/core/Engine/controllers/collectibles-*`                 | Initializes services, clients and the controller                                                      | Screen-specific behavior                                                    |

`DiscoveryCard` is a reusable public-card tile: it renders metadata and invokes an `onPress` callback. `views/CollectiblesCard/DiscoveryCardDetail.tsx` owns the public/historical detail orchestration and purchase-review navigation. Owned-card sale actions stay separate from that public detail. Import the tile and detail from their own files; do not re-export the screen through a tile module.

Presentation reuse follows the installed MetaMask design system: `SectionHeader`, `Card`, `ActionListItem`, `ListItemSelect` and the `BottomSheet` family own generic interaction and layout. `CollectiblesSheetModal` only hosts a sheet in a native modal with safe-area and gesture contexts; it does not own dismissal policy or purchase/sale state. Keep those guards in the consuming sheet. `DiscoveryCard` renders public pool items and openings; `CardTile` renders owned cards, with `CardTileSkeleton` matching its compact and grid geometry. `CollectiblesSearchEntry` shares navigation-versus-inline input behavior around `TextFieldSearch`. Do not copy feature-owned components or add a second gesture/animation implementation.

Pack presentation uses one explicit name/image/optional halo-color map keyed by `provider:pack-code`. Screens and search share the same lookup; unmapped packs retain their API name and a fallback illustration. Background lighting belongs to the component, and artwork keeps its transparent margins. Display assets never change a provider offer's code, quoted amount, odds or transaction payload.

## State and extension rules

Server reads belong to their DataService; form inputs and visual progress belong to their screen. The controller retains the references and receipts required by financial operations and reveal recovery. Its standard controller persistence path and restoration limits are specified in [recovery and persistence](../../app/components/UI/Collectibles/services/data/recovery-persistence.md). Engine saves metadata-filtered state asynchronously with a 200 ms debounce; a crash can lose the latest unflushed update.

There is one execution provider today. Do not introduce a provider registry, generic capability framework or provider-to-application mapper in anticipation of another one. If a second concrete provider is introduced, first try adapting it to the current aliased application shape and document an actual incompatibility before broadening the model. Social and Collectibles API remain distinct clients with their own ownership.

Keep changes local: separate reusable presentation from screen orchestration, but do not split every JSX section into a new abstraction. Read the [module agent index](../../app/components/UI/Collectibles/AGENTS.md) and the [validation entrypoints](../../app/components/UI/Collectibles/README.md#validation) before changing behavior.

## Keep the pattern, limit the surface

This module uses the MetaMask/PredictNext foundation: `BaseDataService` and TanStack Query for cached reads, Messenger registration at the Engine composition root, React query hooks, and the standard controller journal for operation recovery. The workflow provider calls the validated API client directly when the operation requires fresh reads or deliberate retry policy. See the [concrete PackPartner cases](../../app/components/UI/Collectibles/services/data/README.md#workflow).

Only add endpoints, hooks and component variants with a current consumer. The two static backend clients implement those active contracts; they do not anticipate every possible backend endpoint. Keep query results read-only in consumers. Remove unreachable UI and its effects together: an invisible legacy funding sheet must not keep a funding state machine mounted. Preserve recovery checks whose similar code handles different uncertainty states. The [agent entrypoint](../../app/components/UI/Collectibles/AGENTS.md) maps each task to its owner and validation boundary.
