# Collectibles agent index

Follow the repository `AGENTS.md` and the [module README](README.md).
Use **Collectibles**, always plural, for controllers, services, clients, hooks,
paths, routes and feature-owned keys. The README's [naming convention](README.md#naming-convention)
defines casing and external-contract exceptions. Do not add singular aliases.

Before adding or changing tests, read the README's [test conventions](README.md#test-conventions),
including localized queries, fresh elements after navigation and Engine cleanup.
Before preparing a PR, follow its [review evidence rules](README.md#review-evidence).

This branch contains only module initialization, standard controller lifecycle and
persistence wiring, feature gating and a minimal homepage entry. Keep providers,
data services and purchase/sale flows in their subsequent PRs.
