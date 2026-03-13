# Environment Notes

Common setup pitfalls:
- Ensure the repo Node version matches the documented one.
- Keep secrets out of git; use local env files only.
- If builds become inconsistent after branch switches, clear caches/artifacts before retrying.

Suggested cleanup:
- Remove build outputs and caches (project-specific)
- Reinstall dependencies
