# Team review style guides

Unwritten review rules, written down. Each guide turns a year of review comments
that a team left on other people's `metamask-mobile` PRs into a pre-PR checklist.
Agents and humans can run it before asking for review, so reviewers stop
retyping the same feedback.

| Team                      | Guide                                                                    | Actionable comments | PRs |
| ------------------------- | ------------------------------------------------------------------------ | ------------------- | --- |
| `design-system-engineers` | [`design-system-engineers/SKILL.md`](./design-system-engineers/SKILL.md) | 424                 | 177 |
| `mobile-core-ux`          | [`mobile-core-ux/SKILL.md`](./mobile-core-ux/SKILL.md)                   | 156                 | 92  |

Each `SKILL.md` has skill front matter, so it can be copied into an agent skills
directory unchanged. `.agents/skills/` and `.cursor/skills/` are gitignored in
this repo and populated from `MetaMask/skills`, so the guides live here as docs
until they are published there.

## Top themes

| Rank | Design System                              | Mobile Core UX                      |
| ---- | ------------------------------------------ | ----------------------------------- |
| 1    | Errors and edge cases (15%)                | Errors and edge cases (31%)         |
| 1    | Use the design system (15%)                | Pick the simpler shape (15%)        |
| 3    | PR hygiene: visuals, CI, description (14%) | Remove code that isn't needed (14%) |
| 4    | Test quality (12%)                         | Ownership and placement (12%)       |
| 5    | Remove code that isn't needed (11%)        | Rendering performance (11%)         |

Percentages are the share of actionable comments that touch the theme. A comment
can touch more than one theme.

## How the data was collected

Window: 2025-11-27 to 2026-11-27 (UTC), repository `MetaMask/metamask-mobile`.

1. Pulled every inline PR review comment in the window with the `gh` CLI
   (41,049 comments), and the body of every top-level review submitted by a team
   member on a PR created in the window.
2. Pulled author, files and reviews for all 15,671 PRs created in the window
   through the GraphQL API, to know who authored each PR and which files it
   touched.
3. Kept only comments by team members on PRs authored by someone else.
4. Dropped noise: comments under 12 characters, bare acknowledgements (`LGTM`,
   `done`, `fixed`), `Updated <commit link>` replies, and screenshot-only
   comments.
5. Labelled each remaining comment with one primary theme from a fixed list, up
   to two extra themes, and a one-line generalized rule. Labelling was done by
   reading, by AI agents working in parallel, and spot-checked by hand.
   Approvals with no feedback and thread replies were labelled and excluded
   from the theme counts.
6. Grouped the generalized rules into the checklist items. Theme counts are
   exact. The PR numbers next to each item are the strongest examples.

To refresh a guide, run a prompt like:

> Use the gh CLI to pull every review comment our GitHub team left on others'
> PRs in `MetaMask/metamask-mobile` over the last 12 months. Drop LGTMs and bot
> noise, group the rest by theme, count each, and write a style guide skill with
> a pre-PR checklist, most flagged first.

## Limits to know about

- **Team rosters were inferred.** The API token used for collection could not
  list GitHub team members. Members were inferred from CODEOWNERS and review
  history: people who repeatedly approve PRs whose changed files are owned only
  by the team, and who author PRs in the team's paths. Rosters used:
  - `design-system-engineers`: `brianacnguyen`, `georgewrmarshall`,
    `amandaye0h`, `AndyMBridges`.
  - `mobile-core-ux`: `vinnyhoward`, `PatrykLucka`, `n3ps`, `wachunei`.

  People who approve broadly across the repo, or whose own PRs sit in other
  teams' code, were left out. If the real membership differs, the counts will
  shift. Edit the roster and re-run.

- **Ownership is current CODEOWNERS.** Paths owned by a team a year ago may have
  moved. Mobile Core UX in particular picked up the Activity and Homepage code
  during the window.
- **One reviewer can dominate.** `georgewrmarshall` wrote 479 of the 579 Design
  System comments, so that guide leans toward his review habits. For Mobile Core
  UX, `wachunei` wrote 105 of 238.
- **One PR can repeat a rule.** The PR counts in the guides show how many
  distinct PRs raised each theme.
- **Review bodies from AI-assisted reviews are included.** Some comments are
  marked as written by an agent on a reviewer's behalf. They are still the
  reviewer's published feedback.
- **Comments on PRs reviewed outside the window** are not counted, and issue
  comments on the PR conversation tab were not collected.
