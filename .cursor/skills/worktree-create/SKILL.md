---
name: worktree-create
description: Creates or removes a git worktree using the project scripts and shared config. Use when the user asks to create a worktree, add a worktree, remove a worktree, delete a worktree, or work on a parallel branch in a separate directory.
---

# Worktree create and remove

## Create a worktree

Run from the **repo root**:

- If the user provided a path and/or branch: `yarn worktree:create <path> <branch>` or `yarn worktree:create <path> <branch> --from main` for a new branch. Use `yarn worktree:create --cd <path> <branch>` to spawn a shell in the new worktree after create.
- If the user did not specify path or branch: run `yarn worktree:create` without arguments so the script runs in **interactive** mode; the user can enter path and branch in the terminal.

Do not run raw `git worktree add` or manual copy/setup steps; the script runs the commands from `.cursor/worktrees.json` as the single source of truth.

After the script succeeds, remind the user to run `yarn setup` or `yarn setup:expo` and `git submodule update --init --recursive` in the new worktree as needed.

## Remove a worktree

- If the user provided a path: `yarn worktree:remove <path>`.
- Otherwise: `yarn worktree:remove` (interactive; lists worktrees and prompts to choose).

## Reference

Full worktree docs: [Development Process – Git worktrees](../../../docs/readme/development-process.md).
