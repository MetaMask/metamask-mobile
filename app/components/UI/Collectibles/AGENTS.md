# Collectibles agent index

Follow the repository `AGENTS.md` and the [module README](README.md).
Use **Collectibles**, always plural, for controllers, services, clients, hooks,
paths, routes and feature-owned keys. The README's [naming convention](README.md#naming-convention)
defines casing and external-contract exceptions. Do not add singular aliases.

This branch adds Pack Partner to the initialization foundation. Keep Social and
Collectibles API services and all POC product screens out of this PR.

- Read `services/data/README.md` and `services/data/recovery-persistence.md` before
  changing caching, commands or storage. Read services own server data; the
  controller owns only the durable operation journal. Commands use an uncached
  client and explicit recovery, never generic automatic replay.
- Keep plural Collectibles feature names and neutral PackPartner vendor names.
- Never commit private endpoints/keys or a filesystem dependency on a local Snap.
  Signing needs the companion Snap methods; unsupported versions fail closed.
- No QuickBuy integration. Future UI disables purchases with insufficient USDC
  until MetaMask Pay supports Solana.
- Tests mock HTTP, Snap and storage; testing never authorizes real purchases.
- Preserve standard MetaMask DataService/Messenger/StorageService patterns. Do not
  add a custom persistence layer or migrations from unreleased POC state.
- Use the repository mobile-testing skill. Run the focused unit/integration suites
  and init navigation regression tests listed in README after extraction changes.

- Recent openings use REST polling, never a second live service or socket. Read
  `services/data/recent-openings.md` before changing the feed. Keep scheduling,
  bounded queue and pause/resume in `usePackPartnerOpenings`; views only supply
  filters, visibility and optional list/poll/insert limits and report scrolling.
