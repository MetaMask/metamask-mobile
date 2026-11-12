# Collectibles agent index

Follow the repository `AGENTS.md` first. This is the agent entrypoint for Collectibles, including its Engine registration and wallet-home integration. It routes work to the owning code and document; it does not duplicate their specifications.

## Naming

Always use the plural feature name **Collectibles** for controllers, services,
clients, hooks, paths, routes and feature-owned keys. Follow the casing and
external-contract exceptions in [Naming convention](README.md#naming-convention).
Never reintroduce singular feature names or aliases.

## Read before changing the module

1. [Source index and ADR status](../../../../docs/collectibles/README.md): distinguish current product decisions, Replit presentation, Accepted ADR 0020, and Proposed ADRs 0068–0070. The external decisions checkout contains older Gacha/cache/Quick Buy assumptions; do not silently restore them.
2. [Data sources and contracts](../../../../docs/collectibles/data-sources.md): PackPartner, Collectibles API and Social are distinct sources. Exactly two static backend clients are injected; screens have no alternate mock mode.
3. [Module ownership](../../../../docs/collectibles/architecture.md): choose the owning folder before adding code.
4. For reads or commands, [DataService policy](services/data/README.md). For recovery/storage/broadcast, [persistence contract](services/data/recovery-persistence.md). Keep those policies in their owning document.
5. For Core behavior, [business rules and test coverage](../../../../docs/collectibles/pack-partner-business-rules.md). For artwork/motion, [the module README](README.md#artwork-and-animation-source) and the reviewed Replit source.

## Route the task

| Task                                          | Start with                                                                                                                                                                           | Verification boundary                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Change an API response or add a display read  | `services/clients`, the owning `services/data` descriptor/service, then its query hook; [data policy](services/data/README.md)                                                       | Real service + messenger with mocked transport                    |
| Change purchase, opening, buyback or recovery | `providers/pack-partner`, `controllers`, [business rules](../../../../docs/collectibles/pack-partner-business-rules.md), [persistence limits](services/data/recovery-persistence.md) | Provider/controller integration; no real transaction              |
| Change a screen, navigation or entry intent   | Owning `views`/`components`; wallet entry in `app/components/Views/Homepage/Sections/Collectibles`                                                                                   | Existing component-view renderer and fixtures                     |
| Change pack artwork or motion                 | `constants/packArtwork.ts`, owning component, [artwork policy](README.md#artwork-and-animation-source)                                                                               | Registry tests; native/WebView checks when rendering changes      |
| Change initialization, reset or environment   | `app/core/Engine/controllers/collectibles-*`, provider environment config                                                                                                            | Engine registration/reset tests and account/environment isolation |

Paths above are module-relative except those beginning with `app/`. Test entrypoints are linked below. Read only the documents relevant to the task after the source index; do not infer a live API contract from a static mock or an older design screenshot.

## Working boundaries

- For branch extraction or history changes, follow the [PR stack](README.md#pr-stack). Keep `collectibles-rest` above the latest numbered branch, with only the unextracted changes in its own commit. Verify that restacking preserves the final application code.
- Preserve the neutral `PackPartner` naming across Mobile and the companion Snap. Real partner origins, keys and partner-specific source links belong only to ignored local configuration or privately shared references; never invent a documentation hostname. [Environment and access](README.md#environment-and-access) owns configuration and the coordinated future rename policy.

- Preserve the current read-service versus financial-workflow split. Public inventory and offers are not controller caches. Application types are direct aliases, not a new provider framework.
- For public openings, read [the feed specification](services/data/recent-openings.md). Keep polling, bounded queue and pause/resume in `usePackPartnerOpenings`. Views only report visibility/scrolling and may override filters, list limit and poll/insert intervals. Do not reintroduce a socket service or a second component snapshot cache.
- Keep the MetaMask/PredictNext foundation: `BaseDataService`, query descriptors, Messenger, `@metamask/react-data-query`, and standard controller persistence. Simplification removes unused paths; it does not replace these with ad hoc fetching or caches.
- Purchases use existing Solana USDC only: insufficient funds disable Buy and alternate-token payment remains disabled until MetaMask Pay supports Solana. Do not add QuickBuy funding adapters, callbacks or analytics sources for Collectibles; the shared QuickBuy feature is outside this scope.
- Implement only interfaces consumed by the current feature. Keep the two static mock clients at the transport boundary; do not add mock switches, simulated backend state, unused endpoints or pass-through facades. Query results are read-only to consumers; copy an array before sorting it.
- Keep operation persistence on the standard controller metadata and Engine storage path. Do not add a feature-specific storage implementation or claim recovery of references that were not saved; the persistence document owns these limits.
- Keep the explicit pack name/artwork map in `constants/packArtwork.ts`, background and image rendering in their `components`, and route/detail orchestration under `views`. Do not infer artwork from prices or add automatic transparent-margin cropping. Use installed design-system components first.
- Reuse Replit-authored animations; do not invent a parallel animation timeline. Onboarding is video. The motion bridge cannot access the wallet or submit transactions.
- Before changing tier-based rendering or media playback, read the [capability and media policy](README.md#capability-and-media-policy): preserve product content separately from rendering budgets and follow the cited MetaMask rules and performance evidence requirements.
- The wallet may contain real funds even in a development app. Tests use mocked HTTP/Snap/storage boundaries; deployment or visual inspection does not authorize buying, selling, swapping, funding or Social publication.
- Do not edit the external decisions/Replit repositories as a side effect of a Mobile change. Record a needed source/ADR update in the owning documentation.

## Before declaring a change complete

- For a deletion, check production consumers, module exports, Engine action registration, fixtures, tests, assets and copy. Remove tests that exercise a removed path, but preserve tests of still-supported behavior.
- Do not merge similar transaction/recovery branches without checking their different failure states. A pending submission is not proof of failure; a reveal is never a trigger for financial work.
- Update the document that owns the changed behavior, including its rule IDs and test references. Check that cited tests still exist and exercise the stated assertion; remove stale “pending coverage” labels only when the tests cover the rule. Keep this index short; do not create another architecture or rule list elsewhere. Mark historical test/screenshot evidence as historical.
- Report changed behavior, checks actually run and remaining limits. Do not claim full native parity, full-project type safety or production API support from scoped tests.

## Validation

Use the repository `mms-mobile-testing` skill and [tests/AGENTS.md](../../../../tests/AGENTS.md). Reuse existing coverage: component-view tests for screen/navigation behavior, integration tests for controller/service/messenger/storage seams, unit tests for pure helpers. [Module validation commands](README.md#validation) identify the configurations and representative suites. Run only relevant suites first; native video, WebView motion and gestures require separate device validation when affected. Never report historical test counts or a mocked restart test as current native runtime proof.
