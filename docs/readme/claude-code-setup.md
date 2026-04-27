# Claude Code Setup

This guide covers how to set up [Claude Code](https://docs.anthropic.com/en/docs/build-with-claude/claude-code/overview) for the MetaMask Mobile project.

## Prerequisites

- Claude Code CLI installed ([installation guide](https://docs.anthropic.com/en/docs/build-with-claude/claude-code/overview#getting-started))
- MetaMask Mobile repo cloned and on the `main` branch

## Generate Project Rules

The project maintains coding guidelines in `.cursor/rules/*.mdc` files. Claude Code does not read these files directly — it reads `CLAUDE.md` at the repo root. To generate `CLAUDE.md` from the cursor rules, run:

```
/generate-claude-rules
```

This aggregates all `.cursor/rules/*.mdc` files into a single `CLAUDE.md` that Claude Code loads automatically. The generated file covers:

- General coding guidelines
- UI development (design system, Tailwind, component hierarchy)
- Unit testing
- Component-view testing
- E2E testing
- Deeplink handler patterns
- Pull request creation (template compliance, Gherkin format, labels, branch naming)

## When to Regenerate

Re-run `/generate-claude-rules` whenever `.cursor/rules/` files are updated. If you are updating a cursor rule, consider regenerating `CLAUDE.md` in the same PR.

## Available Commands

Claude Code commands are defined in `.claude/commands/`. Run them with `/<command-name>` in a Claude Code session:

| Command                    | Description                                |
| -------------------------- | ------------------------------------------ |
| `/generate-claude-rules`   | Generate `CLAUDE.md` from `.cursor/rules/` |
| `/commit`                  | PR commit agent                            |
| `/unit-test`               | Unit test runner                           |
| `/unit-test-coverage`      | PR unit test coverage agent                |
| `/lint-staged`             | PR lint-staged agent                       |
| `/create-bug`              | Create a bug report on GitHub              |
| `/create-deeplink-handler` | Create a new deeplink handler              |
| `/setup-project`           | MetaMask Mobile project setup              |
| `/setup-jira-mcp`          | Jira/Atlassian MCP setup                   |
| `/setup-ios-simulator-mcp` | iOS Simulator MCP setup                    |
