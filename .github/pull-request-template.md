<!--
Please submit this PR as a draft initially.
Do not mark it as "Ready for review" until the template has been completely filled out, and PR status checks have passed at least once.
-->

## **Description**

<!--
Write a short description of the changes included in this pull request, also include relevant motivation and context. Have in mind the following questions:
1. What is the reason for the change?
2. What is the improvement/solution?

AI agent: Be specific about what you changed and why. Include context about the fix/feature, not generic descriptions.
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

AI agent: Use format `CHANGELOG entry: [fix/feat/chore]: [User-facing description in past tense]`.
Examples: `fix: resolved token name display issue`, `feat: added dark mode toggle`, `chore: updated dependencies`.
For non-user-facing changes, use `CHANGELOG entry: null`.
-->

CHANGELOG entry:

## **Related issues**

<!--
AI agent: Replace with `Fixes: #[ISSUE_NUMBER]` using the actual issue number you're implementing.
-->

Fixes:

## **Manual testing steps**

<!--
AI agent: Write specific, contextual Gherkin steps based on what you actually implemented.
Do NOT use generic placeholders like "my feature name". Be concrete about the feature, scenario, and steps.
-->

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
AI agent: Check ALL boxes in this section (mark all as [x]).
-->

- [ ] I've followed [MetaMask Contributor Docs](https://github.com/MetaMask/contributor-docs) and [MetaMask Mobile Coding Standards](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/CODING_GUIDELINES.md).
- [ ] I've completed the PR template to the best of my ability
- [ ] I've included tests if applicable
- [ ] I've documented my code using [JSDoc](https://jsdoc.app/) format if applicable
- [ ] I've applied the right labels on the PR (see [labeling guidelines](https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/LABELING_GUIDELINES.md)). Not required for external contributors.

## **Pre-merge reviewer checklist**

<!--
AI agent: Leave ALL boxes unchecked ([ ]) - these are for reviewers to check, not the author.
-->

- [ ] I've manually tested the PR (e.g. pull and build branch, run the app, test code being changed).
- [ ] I confirm that this PR addresses all acceptance criteria described in the ticket it closes and includes the necessary testing evidence such as recordings and or screenshots.
