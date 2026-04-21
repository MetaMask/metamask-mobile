<!--
Please submit this PR as a draft initially.

Do not mark it as "Ready for review" until this PR meets the canonical
Definition of Ready For Review in `docs/readme/ready-for-review.md`.

In short: the template must be materially complete (not just section titles
present), all status checks must be currently passing, and the only expected
follow-up commits must be reviewer-driven.
-->

## **Description**

<!--
Write a short description of the changes included in this pull request, also include relevant motivation and context. Have in mind the following questions:
1. What is the reason for the change?
2. What is the improvement/solution?
-->

## **Changelog**

<!--
If this PR is not End-User-Facing and should not show up in the CHANGELOG, you can choose to either:
1. Write `CHANGELOG entry: null`
2. Label with `no-changelog`

If this PR is End-User-Facing, please write a short User-Facing description in the past tense like:
`CHANGELOG entry: Added a new tab for users to see their NFTs`
`CHANGELOG entry: Fixed a bug that was causing some NFTs to flicker`

(This helps the Release Engineer do their job more quickly and accurately)
-->

CHANGELOG entry:

## **Related issues**

Fixes:

## **Manual testing steps**

```gherkin
Feature: my feature name

  Scenario: user [verb for user action]
    Given [describe expected initial app state]

    When user [verb for user action]
    Then [describe expected outcome]
```

## **Screenshots/Recordings**

<!-- If applicable, add screenshots and/or recordings to visualize the before and after of your change. -->

### **Before**

<!-- [screenshots/recordings] -->

### **After**

<!-- [screenshots/recordings] -->

## **Pre-merge author checklist**

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
