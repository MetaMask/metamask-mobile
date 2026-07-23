# Triage Labels

Predict uses Jira statuses, not dedicated triage labels, for the five canonical triage roles.

Do not create new Jira labels for these roles unless explicitly asked.

| Role in mattpocock/skills | PRED Jira status / convention | Meaning                                                                  |
| ------------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| `needs-triage`            | `To Do`                       | Human needs to evaluate the issue                                        |
| `needs-info`              | `Blocked` + comment           | Waiting for missing information; comment with the exact question/blocker |
| `ready-for-agent`         | `Selected for Development`    | Fully specified, ready for an AFK agent                                  |
| `ready-for-human`         | `To Do`                       | Requires human action or implementation                                  |
| `wontfix`                 | `Canceled`                    | Will not be actioned                                                     |

## Agent-ready rule

Only move an issue to `Selected for Development` when it is AFK-ready:

- The problem is clear.
- Relevant context and links are included.
- Acceptance criteria are explicit.
- Test/verification instructions are included.
- There are no unresolved product, design, or architecture questions.

Agents should self-serve work only from `Selected for Development`.
