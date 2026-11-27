---
name: review-style-review-group
description: >-
  House review rules distilled from a year of review comments that five
  metamask-mobile reviewers (georgewrmarshall, vinnyhoward, amandaye0h,
  pedronfigueiredo, PatrykLucka) left on other people's PRs. Use before opening or
  updating any PR, especially one that touches error or edge-case handling,
  tests, shared components, or PR descriptions. Gives a pre-PR checklist ordered
  by how often the group flagged each issue.
---

# Review group style guide (metamask-mobile)

Source: 667 review comments by five reviewers on other authors' PRs between
2025-11-27 and 2026-11-27. 210 were approvals or thread replies with no feedback,
leaving 457 actionable comments across 205 PRs. See
[`../README.md`](../README.md) for how the data was collected and its limits.

Run the checklist below against your diff before asking for review. Each item is
phrased as a question you can answer yes or no. Fix every "no" first.

## How often each theme was flagged

A comment can touch more than one theme. Percentages are of the 457 actionable
comments.

| #   | Theme                                          | Comments | PRs | Share |
| --- | ---------------------------------------------- | -------- | --- | ----- |
| 1   | Handle errors and edge cases                   | 94       | 63  | 21%   |
| 2   | PR hygiene: visuals, CI, description           | 61       | 49  | 13%   |
| 3   | Test quality                                   | 57       | 45  | 12%   |
| 4   | Remove code that isn't needed                  | 49       | 41  | 11%   |
| 5   | Use the design system instead of hand-building | 46       | 31  | 10%   |
| 6   | Ownership and architecture                     | 41       | 32  | 9%    |
| 7   | Reuse an existing helper, hook or component    | 38       | 22  | 8%    |
| 8   | Pick the simpler shape                         | 32       | 25  | 7%    |
| 9   | Shared APIs: generic, forwardable, well named  | 31       | 18  | 7%    |
| 10  | Accessibility                                  | 21       | 13  | 5%    |
| 11  | Match the design                               | 20       | 15  | 4%    |
| 12  | Rendering performance                          | 16       | 12  | 4%    |
| 13  | Localization and copy                          | 14       | 11  | 3%    |

## Pre-PR checklist (most flagged first)

### 1. Errors and edge cases (94)

- [ ] `undefined` means unavailable, never zero. Unknown or unlimited amounts
      are not shown as `0` or `-0 ETH`. An empty state beats a misleading
      fallback (#34682, #34683, #30427).
- [ ] Replacing a mapper or upgrading a library keeps every decoded amount, flag
      and derived value the UI reads, not only the fees (#34655, #34683).
- [ ] Zero is handled explicitly: hex-zero and `0` in truthiness checks (#33284),
      `||` rather than `??` when an empty string needs a fallback (#39995), and
      zero and non-zero amounts go through the same formatter (#40048). Format a
      value once, not twice (#39654).
- [ ] Empty states hide containers with no visible rows (#39864), and each row
      uses its own visibility flag (#40048).
- [ ] Loading skeletons gate on the first fetch or a timeout. They show cached
      data when there is some, and render a skeleton rather than `null` while
      state settles (#40020).
- [ ] Platform fixes are guarded with `Platform.OS` and scoped to the affected
      platform (#26835). Safe-area insets are made Android-aware (#35548). Font
      and native changes are verified on physical devices with a fresh build
      (#35760). Your PR says which platforms it affects (#36292).
- [ ] Shared changes were checked at every call site, sibling and mirrored flow,
      such as all `BottomSheet`s in a screen, stake and unstake, and onboarding
      toasts (#32938, #33600, #38401, #38402, #33489).
- [ ] Nothing on `main` still imports a file or helper you delete (#38406).
- [ ] Refs are not written during render. Previous values are stored in effects
      after commit (#38118, #33332).
- [ ] Components remount only when intended, so `key` values are chosen on
      purpose (#37414). Timers restart when content changes (#34413).
- [ ] Queries and refetches cover the scope the data depends on: every data
      source in pull-to-refresh (#35036), keys scoped to what the data depends
      on (#30106), and list and by-id filtering agree (#39642).
- [ ] Navigation targets are registered in the current navigator tree (#25388),
      and every caller of a moved screen is updated (#39993).
- [ ] Network-triggering actions respect the Basic Functionality setting
      (#36735). Consent is synced for other clients (#39376).
- [ ] Caught errors go to `Logger.error`, never swallowed (#29189).
- [ ] A helper behaves as its JSDoc says, including what it throws (#40492).
      Comments describe the failure direction and native versus token paths
      correctly (#40492).
- [ ] Bad data from providers cannot crash render. Address parsing sits inside
      error handling (#40492).
- [ ] Test-only mocks such as `mockTheme` are never production fallbacks
      (#27816).
- [ ] Controls such as a clear button are not rendered without a handler
      (#25745). Calls that arrive before mount are not dropped (#34290).
- [ ] Sentry spans meant to be queryable set `forceTransaction` (#36172).
- [ ] You exercised the flow manually before requesting review (#25877).

### 2. PR hygiene (61)

- [ ] Any visible UI change has before and after screenshots or recordings, with
      every affected variant and banner (#26683, #34975, #37016, #37076, #38406).
      Recordings cover iOS and Android when layout changes (#38406).
- [ ] Screenshots and images are not committed to the repo. They go in the PR
      description (#36100, #36230, #38406, #38499).
- [ ] You did not hand-edit `CHANGELOG.md` (#35916). Changelog entries describe
      the code change accurately (#37414).
- [ ] Merge conflicts are resolved, unit tests pass, and CI checks are green
      before you request approval (#31518, #37825, #38070, #38711, #40293, #39262).
- [ ] The PR description matches the diff. Claims about tests point to tests that
      exist, and reported test counts come from the final head (#38406, #40492).
- [ ] The template is filled in: manual testing steps, a full Jira URL, and
      close-up device screenshots where asked (#38853, #39995, #40055).
- [ ] Deletions, polish and refactors are separated from behavior changes. Large
      PRs are split, and unready ones are drafts (#33470, #32933, #36524, #25751).
- [ ] Non-blocking suggestions you defer get a follow-up ticket (#32924).
- [ ] Non-obvious safety nets, such as fallback timeouts, carry an inline
      comment (#32938, #27313).

### 3. Test quality (57)

- [ ] Assert with `testID`s, not mocks or internals. Don't mock `BottomSheet` or
      design-system components in tests. Don't assert via `.props` or
      `UNSAFE_getByProps` (#24913, #28166, #29690, #30509, #33358, #37414, #37935).
- [ ] Add a `testID` to the real element rather than a mock or a test-only prop
      (#36196, #37635).
- [ ] Every test has an expectation. Remove tests that only check default
      styling, default settings or features that were removed (#34961, #34967,
      #36801, #37290, #38135, #39864).
- [ ] Each new branch, flag or public return value of a hook has a test
      (#35934, #36130, #33643).
- [ ] When a new gate is added, test both the affected and the unaffected cases
      (#33983). Test the success path, not only the rejection path. Make mocks
      return a successful response when that's what you want to cover (#40492).
- [ ] Platform-guarded behavior and known platform edge cases have regression
      tests (#26835).
- [ ] Persistence tests go through the real persistence path. Network mocks
      assert the request body, not only resulting local state (#40056).
- [ ] Press-to-navigate behavior belongs in component-view tests (#39614).
- [ ] Use `toBeOnScreen` rather than `toBeTruthy` (#26242). Don't mock locales
      (#27857).
- [ ] Remove duplicate tests that exercise identical behavior (#33489).
- [ ] Test names match the fixture and the behavior they assert (#35934).

### 4. Remove what isn't needed (49)

- [ ] Every changed file belongs to this PR. Revert unrelated snapshots, locale
      and test edits, dependency bumps and doc updates (#26535, #31518, #34290,
      #24083).
- [ ] No unused imports, exports, hooks or folders left behind after a move, and
      no feature-flag registry entries nothing references (#28028, #29767,
      #30129, #30427, #33789).
- [ ] No wrapper `View`, wrapping `Text` or prop already handled by `...props`
      (#24083, #26712, #29371, #31571). Put the `testID` on the existing element.
- [ ] Comments stay accurate when behavior changes. Remove stale, changelog-style
      and leftover comments before merging (#36041, #36535, #40055, #33489,
      #35934). Keep history-explaining comments in the PR, not the code (#37039).
- [ ] No CI checks that only get bumped and never catch anything (#28046).
- [ ] Non-essential enhancements go into a follow-up PR (#32933, #27688).

### 5. Use the design system (46)

- [ ] Styling uses Tailwind and tokens: 4px-grid spacing, `twClassName`,
      `rounded-full` for pills, and no arbitrary values (#34970, #37367, #38458).
      Don't add new `.styles` files (#34673). Don't call `twrnc` directly
      (#24086).
- [ ] Text uses MMDS `Text` and its variants, not static fonts or raw `fontSize`
      overrides (#30633, #38135).
- [ ] Hand-built versions are replaced with MMDS components: `Tag` (#30633,
      #39864), `AvatarIcon` with a `size` prop (#36196, #40055), `Toast` (#36602),
      `SectionHeader` (#37221), `HelpText` with its `variant` (#37290), and
      `BottomSheetHeader` (#35481).
- [ ] Buttons use the right variant and props: `TextButton` for link-style
      actions (#37075), `isDisabled` instead of `disabled` (#24083), and
      `isFullWidth` instead of a Tailwind class (#35891).
- [ ] Legacy imports are aliased with a `Legacy` prefix, and MMDS names stay
      unaliased (#25678, #32924).
- [ ] Use the default design-system styles. Drop overrides that restate them
      (#36248), and check size variants before adding static widths (#37539).
- [ ] Bottom sheets use the theme surface helpers for elevated colors (#31099).

### 6. Ownership and architecture (41)

- [ ] Changes to shared or deprecated components go into MMDS first. Mirror them
      here, and remove temporary workarounds once the release is published
      (#27273, #35471, #36456, #34290).
- [ ] Changes to prominent UX, such as a loading treatment or a shared asset, are
      confirmed with Product, Design or the owning team first (#38118, #35526).
- [ ] Reusable components live in `app/components/UI`, not `components-temp`
      (#36664). Shared components are exported from the library root index
      (#25678).
- [ ] Legacy components you touch are marked `@deprecated` with a pointer to the
      replacement (#32938, #28171).
- [ ] Dev tooling and new components sit in the owning team's directory so
      CODEOWNERS applies (#39135, #35036). Shared util code that changes often
      stays out of owned folders so tweaks don't need owner review (#38249).
- [ ] Deferred work gets a linked follow-up ticket (#38853, #34290, #40549).
- [ ] Logic that exists upstream is reused once it's released, not copied
      (#40492).

### 7. Reuse (38)

- [ ] Before writing a helper, check the repo, MMDS and installed packages. Use
      `@metamask/utils` CAIP helpers, existing address and chain helpers, and
      `ImageOrSvg` or `Box` from MMDS (#26379, #32441, #27201, #29120).
- [ ] Use the codebase's standard numeric helper, not a one-off library (#24270).
- [ ] Share one helper for a predicate or guard used in more than one file. Keep
      one owner for each rule (#33489, #36130, #35934, #38135, #38369).
- [ ] In tests, use `mockTheme` from `util/theme`, not hand-built color objects
      or raw `brandColor` tokens (#26396).
- [ ] Pass computed visibility variables instead of recomputing them inline
      (#40048).
- [ ] Use the standard ESLint directives and rules rather than custom syntax
      (#38762).

### 8. Pick the simpler shape (32)

- [ ] Name intermediate conditions and predicates for what they check, not for
      one flow-specific rule (#30637, #35934). Extract nested ternaries into a
      small component with early returns (#40277).
- [ ] Derive values rather than mirroring them in state through effects (#37414).
- [ ] Return one explicit status instead of independent booleans that can
      diverge (#35934).
- [ ] Drop return fields and defensive checks the caller or the type already
      guarantees (#36130, #35934).
- [ ] Extract magic numbers into named constants (#33598). Use a single stable
      ref rather than many refs and wrappers (#33598).
- [ ] Use `background.pressed` with a transparent default instead of many
      variants (#30543). Use named exports rather than default re-exports
      (#26712).
- [ ] Use component default props rather than custom wrappers (#37076).
- [ ] Split large components into smaller pieces (#37621). Use the same pattern as
      sibling components for the same problem (#33600).
- [ ] Centralize fallback handling in the hook instead of each caller (#38670).

### 9. Shared APIs (31)

- [ ] Forward underlying component props through a typed props object, such as
      `titleProps`, `iconProps` or `Partial<...>`, and spread it. Don't add one
      prop per field (#27891, #27285, #29137).
- [ ] Shared components expose a `testID` prop. They do not set default
      `testID`s that can collide, and they do not expose child `testID`s
      (#27775, #37539, #37635, #23931).
- [ ] Use `type` rather than `interface` for design-system component props
      (#26712, #26745).
- [ ] Don't change a shared contract for one screen. Keep existing consumers
      working, and keep spacing caller-controlled (#29473).
- [ ] Name variants as abstract slots, not as the colors they map to (#37635).
- [ ] Use existing `style` and `twClassName` overrides before a one-off layout
      prop (#38816).
- [ ] Multiple booleans go in a named options object (#27859).
- [ ] Document in shared types when to use each variant or size (#24913).

### 10. Accessibility (21)

- [ ] Layouts survive larger font sizes. Prefer `minHeight` to a fixed height
      (#23931, #25751). Check it at large font sizes before replacing padding
      with a fixed height (#23931).
- [ ] Custom pressables set `accessibilityRole`, label and disabled state. Use
      the role before the rest spread (#37635, #40038). Tappable toggles get a
      role, label and hint (#40048).
- [ ] Icon-only buttons get a localized default label, not the icon name
      (#38517, #40281).
- [ ] A screen that loses its visible title keeps an accessible name (#40048).
- [ ] Loading spinners are labelled, and errors are announced to screen readers
      (#40055).
- [ ] Respect Reduce Motion for shimmer and autoplay (#40048).

### 11. Match the design (20)

- [ ] Spacing, alignment and sizes match the design spec, including 16px
      horizontal spacing on dividers and lists (#25158, #25611, #38135).
- [ ] Icon swaps keep the same meaning and visual weight, and standard platform
      icons stay unchanged (#35526). Icon assets match their names.
- [ ] Use transparent PNGs where backgrounds can change (#28731). Keep shapes
      consistent with the agreed radii (#37295). Avoid `tabular-nums` where the
      rest of the app doesn't use it (#37892).
- [ ] Confirm unusual designs are intentional before you build them (#30137).

### 12. Rendering performance (16)

- [ ] Handlers and derived callbacks passed to children or list items are
      wrapped in `useCallback`. Derived values use `useMemo` (#24745, #26306).
- [ ] Lookups against arrays become precomputed `Set`s, and early branches
      return before computing values they don't need (#26235).
- [ ] Keep `FlatList` for potentially large lists (#27254).
- [ ] Don't add duplicate polling providers or per-item listeners. Lift them to
      the parent and respect the enabled and geo flags (#33981, #39070).
- [ ] Memoize child components and style objects that parent re-renders would
      otherwise rebuild (#38118). Optimize image assets that grow the bundle
      (#37147).

### 13. Localization and copy (14)

- [ ] Every user-facing and accessibility string goes through `strings()` and the
      locale files, including abbreviations and tooltip suffixes (#29700, #33981,
      #38458).
- [ ] Section labels use sentence case, applied consistently to every adjacent
      string (#25611, #35255).
- [ ] Copy is consistent with state, especially failure copy (#40277).

## Notes for agents

- Treat unchecked items as blockers, not suggestions.
- This guide describes what this group flags. It complements, and does not
  replace, the `mms-*` skills and `AGENTS.md`.
- If a rule here conflicts with `AGENTS.md`, `AGENTS.md` wins.
