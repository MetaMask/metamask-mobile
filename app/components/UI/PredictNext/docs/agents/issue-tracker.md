# Issue tracker: Jira

Issues and PRDs for Predict live in Jira.

- Site: `https://consensyssoftware.atlassian.net`
- Project key: `PRED`
- Project name: `Trade - Prediction Markets`
- Backlog: https://consensyssoftware.atlassian.net/jira/software/c/projects/PRED/boards/1569/backlog

Use the Atlassian/Jira tools for all operations.

## Conventions

- Create work in project `PRED`.
- Prefer existing PRED issue types: Epic, Story, Task, Spike, Bug, Sub-task.
- When a skill says "publish to the issue tracker", create Jira issues in `PRED`.
- When a skill says "fetch the relevant ticket", fetch the Jira issue by key, e.g. `PRED-123`.
- For PRDs or larger plans, create an Epic and child Stories/Tasks/Spikes as appropriate.
- Link related issues where useful instead of duplicating context.

## Common operations

- Search: use JQL such as `project = PRED ORDER BY updated DESC`.
- Create: create a Jira issue with `projectKey: "PRED"`.
- Read/update/comment/transition: use the Jira issue key, e.g. `PRED-928`.
- Before changing status, fetch available transitions for the issue and transition by the matching status name.
