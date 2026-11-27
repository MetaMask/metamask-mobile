---
name: review-style-design-system-engineers
description: >-
  House review rules distilled from a year of @MetaMask/design-system-engineers
  review comments on other people's PRs in metamask-mobile. Use before opening
  or updating any PR, especially one that touches UI, component-library code,
  styling, tests that render components, or PR descriptions. Gives a pre-PR
  checklist ordered by how often the team flagged each issue.
---

# Design System Engineers review style guide (metamask-mobile)

Source: 579 review comments left by the Design System team on other authors' PRs
between 2025-11-27 and 2026-11-27. 155 were approvals or thread replies with no
feedback, leaving 424 actionable comments across 177 PRs. See
[`../README.md`](../README.md) for how the data was collected and its limits.

Run the checklist below against your diff before asking for review. Each item is
phrased as a question you can answer yes or no. Fix every "no" first.

## How often each theme was flagged

A comment can touch more than one theme. Percentages are of the 424 actionable
comments.

| #   | Theme                                          | Comments | PRs | Share |
| --- | ---------------------------------------------- | -------- | --- | ----- |
| 1   | Handle errors and edge cases                   | 65       | 41  | 15%   |
| 1   | Use the design system instead of hand-building | 65       | 38  | 15%   |
| 3   | PR hygiene: visuals, CI, description           | 59       | 49  | 14%   |
| 4   | Test quality                                   | 52       | 37  | 12%   |
| 5   | Remove code that isn't needed                  | 48       | 39  | 11%   |
| 6   | Shared APIs: generic, forwardable, well named  | 43       | 24  | 10%   |
| 7   | Ownership and architecture                     | 38       | 28  | 9%    |
| 8   | Reuse an existing helper, hook or component    | 31       | 17  | 7%    |
| 9   | Match the design                               | 27       | 21  | 6%    |
| 10  | Accessibility                                  | 22       | 14  | 5%    |
| 10  | Pick the simpler shape                         | 22       | 18  | 5%    |
| 12  | Localization and copy                          | 14       | 11  | 3%    |

## Pre-PR checklist (most flagged first)

### 1. Errors and edge cases (65)

- [ ] Platform-specific workarounds are guarded with `Platform.OS` and scoped to
      the affected platform only (iOS-only style fixes broke Android, #26835).
- [ ] You tried the change on a small and a large device, and on Android as well
      as iOS. Safe-area insets can be `0` on Android and produce negative
      padding (#35548). Native font changes need a fresh native build (#35760).
- [ ] When you change a shared style, prop or component, you checked every
      consumer and every sibling variant (all `BottomSheet`s in a screen #30708,
      mirrored flows like stake and unstake #38402, every call site #32938).
- [ ] Zero, empty, null, loading and placeholder values render sensibly. Hide
      dividers and containers when no rows are visible (#39864). Format zero and
      non-zero amounts with the same formatter (#40048). Use `||` not `??` when
      an empty string needs a fallback (#39995).
- [ ] No test-only values as production fallbacks, such as `mockTheme` (#27816).
- [ ] No refs written during render. Store previous values in effects after
      commit (#38118). Components remount only when you intend them to, so pick
      `key` values deliberately (#37414).
- [ ] Props the component accepts are actually rendered. Controls such as a
      clear button are not rendered without a handler (#25745, #32892).
- [ ] When you delete a shared file or helper, nothing on `main` still imports
      it (#38406).
- [ ] You addressed warnings that show up in the test run (#32938).

### 2. Use the design system (65)

- [ ] Headers use the shared header components, such as `HeaderCenter`,
      rendered inline rather than set through navigation options (#22712,
      #25135, #25388).
- [ ] Buttons use an MMDS `Button` variant (`endAccessory`, `endIconName`,
      `isFullWidth`, `isDisabled`), `ButtonFilter`, `ButtonToggle` or
      `TextButton` for link-style actions, not custom pressables (#28030,
      #37075, #35891). Use `Pressable`, not deprecated `TouchableOpacity`
      (#23768).
- [ ] Styling uses Tailwind and tokens: `Box`, `Text` variants, `twClassName`,
      4px-grid spacing, `rounded-full`. No arbitrary pixel or hex values, no raw
      `fontSize` overrides, no new `.styles` files, no direct `twrnc` (#34970,
      #37367, #38135, #24086).
- [ ] Icon circles, tags, toasts, section headers and help text use MMDS
      `AvatarIcon`, `Tag`, `Toast`, `SectionHeader` and `HelpText` instead of
      hand-built versions (#36196, #39864, #36602, #37221, #37290).
- [ ] Check `app/component-library` for deprecation notices and migrate to the
      MMDS equivalent. Import MMDS names unaliased and alias the legacy one with
      a `Legacy` prefix (#25678, #32924).
- [ ] Rely on default design-system styles. Drop overrides that restate the
      default (#36248).

### 3. PR hygiene (59)

- [ ] Every PR that changes visible UI has before and after screenshots or
      recordings in the PR description, covering every affected variant and
      both platforms (about 30 comments asked for this, for example #26683,
      #37016, #38406).
- [ ] Screenshots and recordings are not committed to the repo (#36100, #38406,
      #38499).
- [ ] You did not hand-edit `CHANGELOG.md` (#35916). The changelog line and the
      PR description match what the code does (#37414, #38406).
- [ ] CI is green and merge conflicts are resolved before you request review
      (#31518, #38070, #40293).
- [ ] The PR template is filled in, with manual testing steps and a full Jira
      URL (#38853, #39995).
- [ ] Large or mixed PRs are split: deletions, polish and refactors separate from
      behavior changes. Non-blocking suggestions get a follow-up ticket (#33470,
      #36524, #32924).
- [ ] Non-obvious fallbacks and workarounds carry a short comment explaining
      why they exist (#32938, #26835).

### 4. Test quality (52)

- [ ] Every test has an expectation. A test with none is removed (#29441).
- [ ] Prefer a `testID` on the real element over mocking a child component or
      reaching in with `.props` or `UNSAFE_getByProps` (#30509, #33358, #37935).
      Do not add props only so tests can read them (#37635).
- [ ] No tests for static default styling or for features that were removed
      (#36801, #38135, #34961).
- [ ] Use `toBeOnTheScreen` rather than `toBeTruthy` for element assertions
      (#26242).
- [ ] Do not mock design-system components. Assert rendered output instead
      (#24913).
- [ ] Use `mockTheme.colors` from `util/theme` in test mocks, not raw
      `brandColor` tokens (#26396).
- [ ] Press-to-navigate behavior belongs in a component view test (#39614).
- [ ] Behavior you describe in the PR has a test: filters, refetch on focus,
      memoization claims (#40277, #40722).

### 5. Remove what isn't needed (48)

- [ ] Every changed file is needed for this PR. Revert unrelated files, locale
      and snapshot edits, dependency bumps and doc updates (#24083, #26535,
      #31518, #34290).
- [ ] No wrapper `View`, wrapping `Text` or redundant footer style where the
      component already provides it. Put the `testID` on the existing element
      (#29441, #31571, #25499).
- [ ] No props that already pass through `...props`, and no variant or weight
      props fully overridden by explicit styles (#26691, #38853).
- [ ] No unused imports, dead helpers or stale comments. Update comments and
      README examples when behavior changes (#28028, #40055, #40058).
- [ ] Do not alias an import unless there is a name collision (#38135).

### 6. Shared APIs (43)

- [ ] Forward underlying component props through a typed prop object such as
      `titleProps`, `iconProps` or `Partial<...>` and spread it, rather than
      adding one prop per field (about 25 comments, for example #27891, #27285,
      #29684).
- [ ] Shared components expose a `testID` prop. They do not set default
      `testID`s or expose child `testID` props (#27775, #37539, #29137).
- [ ] Prop names are descriptive and booleans use `is` or `should`. Use generic
      slots such as `endAccessory` rather than feature-specific props (#29889,
      #23598, #36602).
- [ ] Use existing `style` and `twClassName` overrides before adding a one-off
      layout prop. Do not change a shared contract for one screen (#25499,
      #38816, #29473).
- [ ] Use `type` rather than `interface` for design-system component props
      (#26712).
- [ ] Parent containers own the surface color, not child pressables (#30543).

### 7. Ownership and architecture (38)

- [ ] Changes to deprecated or shared design-system components go into MMDS first
      and are mirrored or removed here once published (#27273, #27998, #36456).
- [ ] Legacy components you touch carry `@deprecated` with a pointer to the MMDS
      replacement (#32938).
- [ ] New reusable components live in `app/components/UI`, not `components-temp`
      (#36664). Export shared components from the library index (#25678).
- [ ] Behavior changes to prominent UX are confirmed with Product and Design
      (#38118, #38135, #35526).
- [ ] Deferred work has a linked follow-up ticket (#38853, #34290, #40549).

### 8. Reuse (31)

- [ ] Look for an existing helper, hook, constant or component first, in the
      repo, in MMDS (`ImageOrSvg`, `Tag`, `Box`) and in packages such as
      `@metamask/utils` (#27201, #39245, #34290).
- [ ] Duplicated style values and platform fixes become one exported helper
      (#38135, #38369, #38406).

### 9. Match the design (27)

- [ ] Spacing, alignment and sizes match the design spec, including 16px
      horizontal padding in lists (#23768, #25499, #25611).
- [ ] Icon swaps keep the same meaning and visual weight (#35526). Assets are
      exported correctly from Figma and link the source (#25157). Transparent
      PNGs where backgrounds may change (#28731).

### 10. Accessibility (22)

- [ ] Layouts survive larger font sizes: prefer `minHeight` to fixed height
      (#23931, #25751).
- [ ] Custom pressables set `accessibilityRole`, label and disabled state.
      Icon-only buttons get a localized default label (#40038, #38517, #40281).
- [ ] Do not disable `accessible` on buttons without checking VoiceOver and
      TalkBack. Fix iOS `testID` discovery with `accessible` rather than swapping
      components (#29124, #29119).
- [ ] A screen that loses its visible title keeps an accessible name (#40048).
- [ ] Respect Reduce Motion for shimmer and autoplay (#40048).

### 11. Simplicity (22)

- [ ] Name intermediate conditions rather than packing guards into one
      expression. Extract nested ternaries into a small component with early
      returns (#30637, #40277).
- [ ] Derive values instead of mirroring them in state through effects (#37414).
- [ ] Extract magic numbers into named constants (#33598, #38406).
- [ ] Use the same pattern as sibling components for the same problem (#33600).

### 12. Localization and copy (14)

- [ ] All user-facing and accessibility strings go through `strings()` and the
      locale files, including `Close` labels and tooltip suffixes (#28030,
      #29700, #38458).
- [ ] Sentence case for section labels, applied consistently to every adjacent
      string (#25611, #35255).

## Notes for agents

- Treat unchecked items as blockers, not suggestions. Reviewers on this team
  prefix optional feedback with `non-blocking:`.
- This guide describes what the Design System team flags. It complements, and
  does not replace, the `mms-*` skills and `AGENTS.md`.
- If a rule here conflicts with `AGENTS.md`, `AGENTS.md` wins. Open a PR to
  update this guide.
