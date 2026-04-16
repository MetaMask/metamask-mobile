---
name: pr-codeowners
description: Identify code owners for changed files and map them to Slack group handles. Use when the user asks who owns changed files, which teams to tag for review, or to find code owners for a PR.
---

# PR Code Owners

## Steps

1. Get changed files:

   ```bash
   git diff --name-only main...HEAD
   ```

2. Read `.github/CODEOWNERS` and match each changed file against the patterns to collect unique `@MetaMask/<team>` owners

3. Map each owner to a Slack group handle using the lookup table below

4. If an owner is not in the table, fall back to `@metamask-mobile-platform` and warn the user about the unmapped team

## Code owner to Slack handle lookup

| CODEOWNERS team         | Slack group handle           |
| ----------------------- | ---------------------------- |
| perps                   | mm-perps-engineering-team    |
| confirmations           | metamask-confirmations-team  |
| metamask-earn           | earn-dev-team                |
| mobile-core-ux          | mobile-core-ux               |
| accounts-engineers      | accounts-team-devs           |
| swaps-engineers         | swaps-engineers              |
| metamask-assets         | assets-dev-team              |
| card                    | card-dev-team                |
| notifications           | notifications-dev-team       |
| mobile-platform         | metamask-mobile-platform     |
| web3auth                | onboarding-dev               |
| wallet-integrations     | wallet-integrations-team     |
| wallet-api-platform     | wallet-integrations-team     |
| ramp                    | ramp-team                    |
| predict                 | predict-team                 |
| rewards                 | rewards-team                 |
| design-system-engineers | metamask-design-system-team  |
| core-platform           | core-platform-team           |
| supply-chain            | mm-supply-chain-reviewers    |
| mobile-admins           | metamask-mobile-platform     |
| transactions            | mm-transactions-stx-core-dev |
| delegation              | delegators                   |
| qa                      | metamask-qa-team             |

## Output

List of unique `{ team, slackHandle }` pairs for all code owners of the changed files.
