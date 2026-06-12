<!--
Please submit this PR as a draft initially.

Do not mark it as "Ready for review" until this PR meets the canonical
Definition of Ready For Review in `docs/readme/ready-for-review.md`.

In short: the template must be materially complete (not just section titles
present), all status checks must be currently passing, and the only expected
follow-up commits must be reviewer-driven.
-->
<!--
mms-check directive vocabulary — read by .github/scripts/shared/pr-template-checks.ts
at module load to build the validation plan. Directives are invisible in rendered
markdown and must NOT be removed or edited without updating the validator registry.

  type=text           Section must contain non-placeholder prose.
  type=changelog      Section must have a valid CHANGELOG entry: line.
  type=issue-link     Section must have a Fixes:/Closes:/Refs: line with a value.
  type=manual-testing Section must have real testing steps or an explicit N/A.
  type=screenshot     Section must have evidence (image/URL) or an explicit N/A.
  type=checklist      Section must have all checkboxes consciously checked.
  required=true|false Whether a missing/invalid section runs the validator at all.
  blocking=true|false Whether a failure of this check fails the CI workflow.
                      Default: false — failures are shown as warnings in the sticky
                      comment but do not block the PR.

Sections without a directive are checked for structural presence only.
-->

## **Description**

<!-- mms-check: type=text required=true -->

### Problem

The swap destination token override for the Arc network (EURC → USDC) was hardcoded directly inside `useTokenAtomicActions.ts` using ad-hoc constants (`ARC_CHAIN_ID`, `ARC_EURC_ADDRESS`, `ARC_USDC_DEST_TOKEN`). This had two problems:

1. **Not scalable** — adding an override for any other network or source token required touching component-level hook code and scattering network-specific constants across files.
2. **Poor separation of concerns** — configuration data (what token to swap to) was mixed with component logic (how to navigate to the swap flow).

In addition, the existing `DefaultSwapDestTokens` map stored a flat `BridgeToken` per chain with no way to express per-source overrides, forcing the workaround above.

### Solution

We redesigned `DefaultSwapDestTokens` and its surrounding API in three steps:

**1. Structured per-chain configuration (`ChainSwapDestConfig`)**

Each chain entry in `DefaultSwapDestTokens` now conforms to a `ChainSwapDestConfig` interface:

- `'*'` — the chain-wide default destination token (used when no source-specific override applies).
- Any EVM address key — a per-source override that routes swaps from that specific token to a different destination.

This makes the existing Arc override (EURC → USDC) declarative config rather than imperative hook logic.

**2. Single lookup utility (`getSwapDestToken`)**

We replaced two separate functions (`getSwapDestToken` + `getChainDefaultDestToken`) with a single function that accepts an optional `sourceAddress`:

- `getSwapDestToken(chainId)` — returns the chain-wide default.
- `getSwapDestToken(chainId, sourceAddress)` — checks for a per-source override first, then falls back to the chain-wide default.

This collapses the API surface and removes the need for callers to know which function to use.

**3. Utilities moved to `Bridge/utils/`**

`getSwapDestToken` and `getAllChainDefaultDestTokens` were moved to their own files under `Bridge/utils/` so that `default-swap-dest-tokens.ts` is pure data (interfaces + the config map), and the utility logic lives where utilities belong.

### No breaking changes

All existing call sites have been updated to import from the new locations. The runtime behaviour of every consumer is identical — the refactor only changes file organisation and the internal structure of the config object. No new network overrides have been added beyond the existing Arc EURC → USDC entry.

## **Changelog**

<!-- mms-check: type=changelog required=true blocking=true -->

CHANGELOG entry: null

## **Related issues**

<!-- mms-check: type=issue-link required=true -->

Fixes:

## **Manual testing steps**

<!-- mms-check: type=manual-testing required=true -->

This is an internal refactor with no user-facing behaviour change. Verify that the existing swap destination override logic still works correctly end-to-end:

```gherkin
Feature: Swap destination token override (Arc network)

  Scenario: user swaps EURC on Arc — destination is pre-filled with USDC
    Given the app is unlocked and the Arc network is selected
    And the user holds EURC on Arc

    When the user taps the EURC token and selects "Swap"
    Then the swap screen opens with USDC pre-selected as the destination token

  Scenario: user swaps any other token on Arc — chain default is used
    Given the app is unlocked and the Arc network is selected
    And the user holds a token other than EURC on Arc

    When the user taps that token and selects "Swap"
    Then the swap screen opens with EURC pre-selected as the destination token (Arc chain default)

  Scenario: user swaps a token on a non-Arc network — chain default is used
    Given the app is unlocked and a non-Arc network is selected (e.g. Mainnet)
    And the user holds any token on that network

    When the user taps a token and selects "Swap"
    Then the swap screen opens with the correct default destination token for that network (e.g. USDC on Mainnet)
```

<!--
## **Screenshots/Recordings**

### **Before**

### **After**
-->

## **Pre-merge author checklist**

<!-- mms-check: type=checklist required=true -->

<!--
Every checklist item must be consciously assessed before marking this PR as
"Ready for review". A checked box means you deliberately considered that
responsibility, not that you literally performed every action listed.

Unchecked boxes are ambiguous: they are not an implicit "N/A" and they are not
a silent "skip". See `docs/readme/ready-for-review.md` for the full checklist
semantics.
-->

- [ ] I've followed [MetaMask Contributor Docs](https://github.com/MetaMask/contributor-docs) and [MetaMask Mobile Coding Standards](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/CODING_GUIDELINES.md).
- [ ] I've completed the PR template to the best of my ability
- [ ] I've included tests if applicable
- [ ] I've documented my code using [JSDoc](https://jsdoc.app/) format if applicable
- [ ] I've applied the right labels on the PR (see [labeling guidelines](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/LABELING_GUIDELINES.md)). Not required for external contributors.

#### Performance checks (if applicable)

- [ ] I've tested on Android
  - Ideally on a mid-range device; emulator is acceptable
- [ ] I've tested with a power user scenario
  - Use these [power-user SRPs](https://consensyssoftware.atlassian.net/wiki/spaces/TL1/pages/edit-v2/401401446401?draftShareId=9d77e1e1-4bdc-4be1-9ebb-ccd916988d93) to import wallets with many accounts and tokens
- [ ] I've instrumented key operations with Sentry traces for production performance metrics
  - See [`trace()`](/app/util/trace.ts) for usage and [`addToken`](/app/components/Views/AddAsset/components/AddCustomToken/AddCustomToken.tsx#L274) for an example

For performance guidelines and tooling, see the [Performance Guide](https://consensyssoftware.atlassian.net/wiki/spaces/TL1/pages/400085549067/Performance+Guide+for+Engineers).

## **Pre-merge reviewer checklist**

<!--
Reviewer checklist items follow the same semantics as the author checklist: an
unchecked box is ambiguous, a checked box means the reviewer consciously
assessed that responsibility. See `docs/readme/ready-for-review.md`.
-->

- [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).
- [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.
