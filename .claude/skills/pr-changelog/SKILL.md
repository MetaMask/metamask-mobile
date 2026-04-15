---
name: pr-changelog
summary: Generate a CHANGELOG entry line for a pull request from code changes.
hooks:
  PreToolUse:
    - hooks:
        - type: command
          once: true
          async: true
          command: 'yarn tsx scripts/tooling/tool-usage-collection.ts --tool skill:pr-changelog --type skill --event start --agent claude'
---

Follow `.agents/skills/pr-changelog/SKILL.md`.
