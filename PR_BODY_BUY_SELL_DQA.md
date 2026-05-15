<!--
Paste this entire file into the GitHub pull request description when you open or edit the PR.
You can delete this file from the branch after the PR is merged if you prefer not to keep it in the tree.
-->

## **Description**

This PR polishes the **Buy & sell crypto** (Ramp aggregator) settings screen for internal builds and unified ramp flows:

- Migrates region headings and values to `@metamask/design-system-react-native` `Text` with `BodyMd` / `BodySm`, `FontWeight.Medium` where appropriate, and design-system text colors (`TextDefault`, `TextAlternative`).
- Improves **SDK activation keys**: title row with loading indicator spacing, description typography, and per-key label/value styling.
- Adds `activationKeysRow` spacing so the activation-keys block sits clearly below the region section.
- Sets **Change region** to `Secondary` in the unified ramp path so it reads as a supporting action next to the region summary.

## **Changelog**

CHANGELOG entry: Polished typography and layout on the Buy & sell crypto settings screen.

## **Related issues**

Fixes:

## **Manual testing steps**

```gherkin
Feature: Buy & sell crypto settings

  Scenario: Developer views Ramp settings with region and activation keys
    Given the app is an internal build with Ramp buy/sell settings available
    When user opens Settings and navigates to Buy & sell crypto
    Then the Current region section shows consistent typography and the Change region action is visible
    And the SDK activation keys section shows title, description, and list styling consistent with the design system
    When keys are loading
    Then a loading indicator appears beside the SDK activation keys title without breaking layout
```

## **Screenshots/Recordings**

### **Before**

_(No separate baseline screenshot; this change is an incremental polish on the existing Buy & sell crypto settings layout.)_

### **After**

![Buy & sell crypto settings — Current region, SDK activation keys, and Headless Buy entry (dark mode)](https://raw.githubusercontent.com/MetaMask/metamask-mobile/settings/buy-sell-dqa/.github/pull-request-images/buy-sell-crypto-settings-after.png)

## **Pre-merge author checklist**

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

- [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).
- [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.
