---
name: review-style-mobile-core-ux
description: >-
  House review rules distilled from a year of @MetaMask/mobile-core-ux review
  comments on other people's PRs in metamask-mobile. Use before opening or
  updating any PR, especially one that touches navigation, Activity, Settings,
  Homepage, data mapping, loading states or list rendering. Gives a pre-PR
  checklist ordered by how often the team flagged each issue.
---

# Mobile Core UX review style guide (metamask-mobile)

Source: 238 review comments left by the Mobile Core UX team on other authors' PRs
between 2025-11-27 and 2026-11-27. 82 were approvals or thread replies with no
feedback, leaving 156 actionable comments across 92 PRs. See
[`../README.md`](../README.md) for how the data was collected and its limits.

Run the checklist below against your diff before asking for review. Each item is
phrased as a question you can answer yes or no. Fix every "no" first.

## How often each theme was flagged

A comment can touch more than one theme. Percentages are of the 156 actionable
comments.

| #   | Theme                                           | Comments | PRs | Share |
| --- | ----------------------------------------------- | -------- | --- | ----- |
| 1   | Handle errors and edge cases                    | 48       | 31  | 31%   |
| 2   | Pick the simpler shape                          | 23       | 22  | 15%   |
| 3   | Remove code that isn't needed                   | 22       | 13  | 14%   |
| 4   | Ownership, placement and cross-client alignment | 18       | 16  | 12%   |
| 5   | Rendering performance                           | 17       | 11  | 11%   |
| 6   | Reuse an existing helper, hook or component     | 14       | 11  | 9%    |
| 7   | Use the design system                           | 10       | 8   | 6%    |
| 8   | Test quality                                    | 6        | 5   | 4%    |
| 9   | Localization and copy                           | 5        | 5   | 3%    |
| 10  | PR hygiene                                      | 4        | 4   | 3%    |
| 10  | Generic shared code                             | 4        | 4   | 3%    |

## Pre-PR checklist (most flagged first)

### 1. Errors and edge cases (48)

- [ ] `undefined` means unavailable, never zero. Do not render unknown or
      unlimited amounts as `0`, `-0 ETH` or a misleading fallback. Return an
      empty state instead of `markets[0]` style guesses (#34682, #34683, #34763,
      #30427).
- [ ] Zero, hex-zero and empty strings are handled explicitly in truthiness
      checks (#33284). Values are formatted once, not twice (#39654).
- [ ] Loading skeletons gate on the first fetch only and show cached data when
      there is some. Add a timeout or fallback for a status that may never be
      written. Render a skeleton rather than `null` while state settles
      (#40020).
- [ ] Every status maps to a sensible color and copy. Derive copy from the
      transaction type, not a debit or credit boolean (#35054).
- [ ] After auth, the user returns to the screen they asked for
      (`postAuthRedirect`). Navigate only to screens registered in the current
      navigator tree (#35054, #25388, #36486).
- [ ] URL opening checks `canOpenURL` and handles Android and iOS scheme
      caveats. Remote URLs are parsed inside `try`/`catch` with a user-facing
      error (#25003, #35054).
- [ ] Chain-specific logic handles non-EVM chains (#27009). Chain identifiers
      come from CAIP-2 constants, not network names (#35741).
- [ ] Replacing a shared mapper or upgrading a library does not drop decoded
      amounts, flags or categories the UI depends on (#34683, #34655).
- [ ] Caught errors go to `Logger.error`, never swallowed silently (#29189).
- [ ] Network-triggering actions respect the Basic Functionality setting
      (#36735). User consent such as marketing opt-out stays in sync for other
      clients (#39376).
- [ ] Pull-to-refresh refetches every data source on the screen (#35036). Query
      keys depend only on what the data depends on (#30106), and use shared
      query key factories (#35054).
- [ ] Disable inputs through native props while loading rather than ignoring
      changes in handlers (#28343).
- [ ] No `try`/`finally` or other syntax React Compiler cannot compile in
      components (#32982).
- [ ] Sentry spans meant to be queryable set `forceTransaction` (#36172).
- [ ] You exercised the flow manually and addressed bot-reported bugs before
      requesting review (#25877, #36486).

### 2. Simpler shape (23)

- [ ] Static values, constants and helpers live outside the component body.
      Animation durations and magic numbers become named constants at the top
      of the file (#32615, #26430).
- [ ] Logic-bearing empty states and large render branches are their own
      component. Conditions move into the render helper that uses them (#31438,
      #27073, #37621).
- [ ] Repeated loading checks and return blocks are hoisted. Resolution logic
      sits in one place (#27364, #31914).
- [ ] Single-pass collection work: partition or de-duplicate with one `reduce`
      and a `Set` instead of several filters (#27958, #31016).
- [ ] Write conditionals in their clearest form: `every` instead of negated
      `some`, `Boolean(value)` over `!!value`, no `x || (!x && y)`, no checks
      for conditions already guaranteed earlier (#28337, #25745, #29956, #28021).
- [ ] Add a variant as a section of the existing screen rather than a duplicate
      screen. Render a component conditionally rather than toggling props on one
      that is always mounted (#24856, #24468).
- [ ] Handlers use `useCallback` instead of inline ternaries in render (#34763).
- [ ] Type a shared shape once (#24855).

### 3. Remove what isn't needed (22)

- [ ] Every changed file belongs to this PR. Undo editor settings, native
      project files, CI config, locale and unrelated refactors (#26396,
      #27884, #28174, #28343).
- [ ] A change with no behavior change is not made at all (#28174).
- [ ] No unused imports, selectors, flag registry entries, hooks or folders left
      behind after a feature moves (#29767, #24856, #30427, #30129).
- [ ] No leftover or changelog-style comments describing removed code (#36041,
      #36535).
- [ ] Type casts that do not change the result are removed (#24129).
- [ ] No scratch files such as PR description drafts. Split workflow and config
      changes into a separate PR (#25853, #24060).

### 4. Ownership and placement (18)

- [ ] Feature wiring lives in the feature's own renderless component, not shared
      views. Dev tooling lives in the owning team's directory so CODEOWNERS
      applies (#25296, #39135).
- [ ] Do not import types or code across another team's domain. Do not modify
      deprecated folders during a transition (#23662, #28270).
- [ ] Local-only enrichment state stays out of shared types. Categorization goes
      inside the shared mappers (#31402, #35350).
- [ ] Mobile data modeling lines up with the extension: keep original movements
      and exact asset ids (#36619, #32441, #34224).
- [ ] Call the shared analytics helper wherever the tracked action happens
      (#31016). Link follow-up tickets for planned unification work (#24857,
      #26430).
- [ ] Update CODEOWNERS when you add components next to sibling sections
      (#35036).

### 5. Rendering performance (17)

- [ ] Handlers and derived callbacks passed to children or list items are wrapped
      in `useCallback`. Functions returned from hooks are memoized (#24745,
      #25347, #31016, #31995).
- [ ] Derived values use `useMemo`. Lookups against arrays become precomputed
      `Set`s (#26306, #26235).
- [ ] Return early before computing values the early branch does not need
      (#26235).
- [ ] Keep `FlatList` for potentially large lists (#27254).
- [ ] Do not add duplicate polling providers or per-item subscriptions. Lift
      them to the parent and respect enabled and geo flags (#33981, #39070).

### 6. Reuse (14)

- [ ] Check for an existing address, chain id or CAIP helper before writing one.
      Use `@metamask/utils` parsing helpers and installed package helpers
      (#26379, #32441).
- [ ] Reuse existing hooks such as `useFormatters` and the cached
      transaction-lookup hooks (#31402, #32291).
- [ ] Re-export existing types from their owning file rather than redeclaring
      them (#25544).
- [ ] Repeated redirect or navigation logic becomes one shared util returning
      everything callers need. Frequently used selectors become a shared hook
      (#27364, #32615, #39437).
- [ ] Reuse existing accessory resolvers and document which header to use
      (#37825).

### 7. Use the design system (10)

- [ ] Use `Box` and `twClassName` instead of new `StyleSheet` styles or
      `.styles` files, and spacing tokens instead of arbitrary values (#25347,
      #34673, #23556, #29120).
- [ ] Use MMDS `Icon`, `Spinner` and list item components in new code, not legacy
      font-awesome icons, loading indicators or `Base` components (#31995,
      #35741, #36745).
- [ ] Bottom sheets use the theme surface helpers for elevated colors (#31099).

### 8. Test quality (6)

- [ ] Do not test mock wiring such as prototype chains. Simplify the mock and
      test the real behavior (#24129).
- [ ] Render real components and do not mock locales (#24468, #27857).
- [ ] Persistence tests go through the real persistence path, and network mocks
      assert the request body, not just the resulting local state (#40056).

### 9. Localization and copy (5)

- [ ] All user-visible strings go in the locale files, including dev-only screens
      and abbreviations (#25347, #33981).

### 10. PR hygiene and generic code (8)

- [ ] Videos of the change are in the PR description (#24911, #25347).
- [ ] Component tests pass before you request approval (#39262).
- [ ] Shared components stay generic. Apply provider-specific overrides at the
      call site. Name hook options by purpose, and pass several booleans as a
      named options object (#31772, #25467, #27859).

## Notes for agents

- Treat unchecked items as blockers. Reviewers on this team usually prefix
  optional feedback with `nit:`.
- This guide describes what the Mobile Core UX team flags. It complements, and
  does not replace, the `mms-*` skills and `AGENTS.md`.
- If a rule here conflicts with `AGENTS.md`, `AGENTS.md` wins. Open a PR to
  update this guide.
