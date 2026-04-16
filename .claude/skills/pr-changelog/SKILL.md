---
name: pr-changelog
summary: Generate a CHANGELOG entry line for a pull request from code changes.
hooks:
  PreToolUse:
    - hooks:
        - type: command
          once: true
          async: true
          command: '[ -z "$CI" ] && [ "$TOOL_USAGE_COLLECTION_OPT_IN" != "false" ] && yarn tsx scripts/tooling/tool-usage-collection.ts --tool skill:pr-changelog --type skill --event start --agent claude || true'
---

Follow `.agents/skills/pr-changelog/SKILL.md`.
