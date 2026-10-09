# Predict issue tracker

Predict issues and PRDs live in Consensys Jira:

- Site: `https://consensyssoftware.atlassian.net`
- Project: `PRED` — Trade: Prediction Markets
- Kalshi initiative: [PRED-1109](https://consensyssoftware.atlassian.net/browse/PRED-1109)

Jira owns delivery scope, sequencing, acceptance criteria, and current status. Do not maintain a second backlog in this directory.

## Conventions

- Fetch the active Jira issue before implementation.
- Link related issues rather than copying mutable requirements into architecture docs.
- Put durable, non-obvious decisions in an accepted ADR; put domain vocabulary in `CONTEXT.md`.
- Use existing PRED issue types and statuses.
- `Selected for Development` is reserved for AFK-agent-ready work with explicit acceptance criteria, verification instructions, relevant links, and no unresolved product, design, or architecture questions.
- Use `Blocked` with a comment naming the exact unresolved dependency.

Use the Atlassian/Jira tooling against `consensyssoftware.atlassian.net` for reads and updates.
