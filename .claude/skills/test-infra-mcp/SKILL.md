---
name: test-infra-mcp
description: Use when spinning up test infrastructure outside of Detox withFixtures — mock servers, fixture servers, dapp servers, local blockchain nodes, or WebSocket servers. Use when running ad-hoc tests, Maestro tests, ralph-loop experiments, or any scenario that needs API mocking, app state, or a local Ethereum node without a Detox spec file.
---

**BLOCKING REQUIREMENT**: When the user asks to spin up a mock server, fixture server, dapp server, local node, or any test infrastructure outside of a Detox spec — invoke this skill via the Skill tool **immediately**, before taking any action.

Canonical skill (full content, tool reference, patterns): [.agents/skills/test-infra-mcp/SKILL.md](../../.agents/skills/test-infra-mcp/SKILL.md).
