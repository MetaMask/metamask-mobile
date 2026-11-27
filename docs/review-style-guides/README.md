# Review style guide

Unwritten review rules, written down. This guide turns a year of review comments
that five `metamask-mobile` reviewers left on other people's PRs into a pre-PR
checklist. Agents and humans can run it before asking for review, so reviewers
stop retyping the same feedback.

| Guide                                              | Actionable comments | PRs |
| -------------------------------------------------- | ------------------- | --- |
| [`review-group/SKILL.md`](./review-group/SKILL.md) | 457                 | 205 |

The `SKILL.md` has skill front matter, so it can be copied into an agent skills
directory unchanged. `.agents/skills/` and `.cursor/skills/` are gitignored in
this repo and populated from `MetaMask/skills`, so the guide lives here as a doc
until it is published there.

## Reviewers

| Reviewer         | Actionable comments | Share of actionable |
| ---------------- | ------------------- | ------------------- |
| georgewrmarshall | 343                 | 75%                 |
| pedronfigueiredo | 44                  | 10%                 |
| PatrykLucka      | 34                  | 7%                  |
| vinnyhoward      | 28                  | 6%                  |
| amandaye0h       | 8                   | 2%                  |

Counts cover comments on PRs written by someone else, after noise is removed.
Because one reviewer supplies most of the comments, the guide reflects his
habits more than the group average.

## Top themes

| Rank | Theme                                          | Share of actionable comments |
| ---- | ---------------------------------------------- | ---------------------------- |
| 1    | Handle errors and edge cases                   | 21%                          |
| 2    | PR hygiene: visuals, CI, description           | 13%                          |
| 3    | Test quality                                   | 12%                          |
| 4    | Remove code that isn't needed                  | 11%                          |
| 5    | Use the design system instead of hand-building | 10%                          |

A comment can touch more than one theme, so the shares can add up to more than
100%.

## How the data was collected

Window: 2025-11-27 to 2026-11-27 (UTC), repository `MetaMask/metamask-mobile`.

1. Pulled every inline PR review comment in the window with the `gh` CLI
   (41,049 comments). Pulled the body of each top-level review that the five
   reviewers submitted on PRs in the window.
2. Pulled author and files for every PR created in the window (15,671 PRs)
   through the GraphQL API.
3. Kept only comments by the five reviewers on PRs authored by someone else.
4. Dropped noise: comments under 12 characters, bare acknowledgements (`LGTM`,
   `done`, `fixed`), `Updated <commit link>` replies, and screenshot-only
   comments.
5. Labelled each remaining comment with one primary theme from a fixed list, up
   to two extra themes, and a one-line generalized rule. Labelling was done by
   reading, with AI agents working in parallel and a manual spot-check. Approvals
   with no feedback and thread replies were excluded from the theme counts.
6. Grouped the generalized rules into checklist items. Theme counts are exact.
   The PR numbers next to each item are the strongest examples.

Reviewer handles are GitHub logins. `pedronfigueiredo` was matched to "Pedro"
from the group list and should be confirmed.

## Limits to know about

- **The group is a chosen list, not a GitHub team.** The token used for
  collection cannot list GitHub team members, so the five reviewers were taken
  from the group list as given, not checked against a team roster.
- **One reviewer dominates.** `georgewrmarshall` wrote 343 of the 457 actionable
  comments. Rules that mainly he raises carry more weight than they would across
  the group.
- **Ownership is current CODEOWNERS.** Paths owned by a team a year ago may have
  moved.
- **One PR can repeat a rule.** PR counts show how many distinct PRs raised each
  theme.
- **AI-assisted review bodies are included.** Some comments are marked as written
  by an agent on a reviewer's behalf. They are still the reviewer's published
  feedback.
- **Issue comments on the PR conversation tab were not collected.** Only inline
  review comments and review summaries were included.

## Refreshing the guide

Re-run the collection with the same window and the reviewer list above, then
re-label. A prompt like this covers the collection step:

> Use the gh CLI to pull every review comment our GitHub team left on others'
> PRs in `MetaMask/metamask-mobile` over the last 12 months. Drop LGTMs and bot
> noise, group the rest by theme, count each, and write a style guide skill with
> a pre-PR checklist, most flagged first.
