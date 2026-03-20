# Skill Authoring Standard

Canonical guidance for creating and updating repo-local skills in MetaMask Mobile.

## Purpose

Use this standard when the repo needs a reusable agent workflow with stable instructions, validation, or harness shims.

Do not create a skill when one of these is enough:

- `AGENTS.md` or a narrow `tests/AGENTS.md` pointer
- Existing product or engineering docs in `docs/`
- A one-off prompt that does not need to be reused

Create a skill when the work is repeated, fragile, or benefits from a shared workflow across agents.

## Agent Skill Entrypoint

Use these entrypoints:

- SSOT policy + execution standard: this document
- Codex skill entrypoint: `.agents/skills/skill-authoring/SKILL.md` (`$skill-authoring`)
- Claude skill entrypoint: `.claude/skills/skill-authoring/SKILL.md`
- Claude command entrypoint: `.claude/commands/create-skill.md`
- Cursor command entrypoint: `.cursor/commands/create-skill.md`

## Repo Skill Shape

Required shape for a repo-local skill:

```text
docs/<topic>.md
.agents/skills/<skill-name>/SKILL.md
.agents/skills/<skill-name>/agents/openai.yaml
.claude/skills/<skill-name>/SKILL.md
```

Optional shape, when the workflow needs it:

```text
.agents/skills/<skill-name>/scripts/
.agents/skills/<skill-name>/references/
.agents/skills/<skill-name>/assets/
.claude/commands/create-<thing>.md
.cursor/commands/create-<thing>.md
```

## Naming And Trigger Rules

- Skill folder names use lowercase letters, digits, and hyphens only.
- The folder name and `SKILL.md` frontmatter `name` must match exactly.
- The Codex `description` must say what the skill does and when to use it.
- Prefer names that describe the reusable workflow, not the implementation detail.
- Keep the thin skill entrypoint short. Put the durable, human-readable guidance in `docs/<topic>.md`.

## Agent Execution Standard (SSOT)

For agent implementation and review tasks, follow this workflow:

1. Define the user/problem shape.
   - Write down the jobs the skill should handle.
   - Prefer concrete trigger phrases and in-scope task examples.
2. Split the content deliberately.
   - Put the canonical workflow, conventions, and examples in `docs/<topic>.md`.
   - Keep `.agents/skills/<name>/SKILL.md` thin and point it back to this SSOT.
   - Add `scripts/` only when deterministic validation or repeated logic is worth the maintenance cost.
   - Add `references/` only when the detailed content should be loaded on demand instead of sitting in the thin skill file.
3. Add the thin skill entrypoint.
   - Include frontmatter `name` and `description`.
   - State that the repo doc is the single source of truth.
   - Point agents to `Agent Execution Standard (SSOT)`.
4. Add the multi-harness shims.
   - Add `.claude/skills/<name>/SKILL.md`.
   - If the workflow should be invokable as a creation command, add matching `.claude/commands/...` and `.cursor/commands/...` shims.
   - Keep shims thin and point them back to the same SSOT doc.
5. Sanity check the result.
   - Confirm the SSOT doc, thin skill entrypoint, and shims all point to the same workflow.

Authoring principle:

- Match the A/B-test pattern. The repo doc is the SSOT. The skill entrypoints are small wrappers around it.

Required agent response sections:

1. `Implementation Checklist`
2. `Files To Add Or Modify`
3. `Validation`
4. `Assumptions`

## Minimal Examples

### SSOT Doc Skeleton

```md
# Topic Standard

## Agent Skill Entrypoint

- SSOT policy + execution standard: this document
- Codex skill entrypoint: `.agents/skills/topic/SKILL.md` (`$topic`)
- Claude skill entrypoint: `.claude/skills/topic/SKILL.md`
- Claude command entrypoint: `.claude/commands/create-topic.md`
- Cursor command entrypoint: `.cursor/commands/create-topic.md`

## Agent Execution Standard (SSOT)

1. Discover current implementation.
2. Apply repo-specific workflow.
3. Confirm the doc and shims stay aligned.
```

### Codex SKILL.md

````md
---
name: topic
description: Create and update the repo-local topic workflow. Use for new docs, shims, and validation tied to this workflow.
---

# Topic

`docs/topic.md` is the single source of truth.

Follow `docs/topic.md` section `Agent Execution Standard (SSOT)` for:

- workflow
- required response sections

````

### Claude Skill Shim

```md
---
name: topic
summary: Create or update the repo-local topic workflow.
---

Follow `docs/topic.md` section `Agent Execution Standard (SSOT)`.
```

### Claude Command Shim

```md
# Create Topic

Follow `docs/topic.md` section `Agent Execution Standard (SSOT)`.
```

### Cursor Command Shim

```md
# Create Topic

@.claude/commands/create-topic.md
```

### agents/openai.yaml

```yaml
interface:
  display_name: "Topic"
  short_description: "Create and validate the repo-local topic workflow."
  default_prompt: "Use $topic to create or update the repo-local topic workflow with the canonical SSOT."
```
