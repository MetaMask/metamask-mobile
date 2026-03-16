# Development Process

This doc covers workflow and process topics for day-to-day development on MetaMask Mobile.

## Git worktrees

[Git worktrees](https://git-scm.com/docs/git-worktree) let you have multiple branches checked out at once in separate directories, so you can switch context or run parallel tasks (e.g. different features, or main + a hotfix) without stashing or cloning the repo again.

### What this repo provides

- **`.cursor/worktrees.json`** – Used when you run a Cursor chat agent with worktree context (parallel agents) and when you run **`yarn worktree:create`**. It is the single source of truth for post-creation setup (env and plan files). The raw `git worktree` command does **not** read this file.

  Current setup copies env and plan files from the main workspace into the worktree:
  - `.js.env`, `.ios.env`, `.android.env`, `.e2e.env`
  - `.cursor/plans` (so plan context is available in the worktree)

  For full Cursor worktree behavior and options (e.g. `setup-worktree-unix`, script paths), see [Cursor Worktrees configuration](https://cursor.com/docs/configuration/worktrees).

- **`yarn worktree:create`** – Creates a worktree and runs the post-creation commands from `.cursor/worktrees.json` (same config as Cursor), so envs and plans are in place for the new worktree.

- **`yarn worktree:remove`** – Removes a worktree using `git worktree remove -f` (required for this repo because of submodules).

### Using `yarn worktree:create`

Run from repo root:

- **Interactive**: `yarn worktree:create` – you are prompted for path, branch, whether to create a new branch (and from which ref), and whether to go to the new worktree directory. If you answer yes to “Go to new worktree directory?”, the script spawns an interactive shell in the new worktree (you are cd’d directly into it).
- **With arguments**: `yarn worktree:create <path> <branch>` or `yarn worktree:create <path> <new-branch> --from main`. Use `yarn worktree:create --cd <path> <branch>` to spawn an interactive shell in the new worktree after creation (same “cd directly” behavior).
- **Pipe-friendly**: On success the script prints the worktree path on **stdout** (all other messages on stderr), so `cd $(yarn worktree:create ../path branch)` works.
- After creation, run `yarn setup` or `yarn setup:expo` and `git submodule update --init --recursive` in the new worktree as needed.

### Using `yarn worktree:remove`

- **With path**: `yarn worktree:remove <path>` – removes the worktree at that path (uses `-f` because of submodules).
- **Interactive**: `yarn worktree:remove` – lists worktrees (excluding the main repo), then prompts you to choose one by number or path to remove.

### Using git worktrees (command line)

1. **Create a worktree** (e.g. for a feature branch):

   ```bash
   # From the repo root (your main clone)
   git worktree add ../metamask-mobile-feat-a feat-a
   ```

   This creates a new directory `../metamask-mobile-feat-a` with branch `feat-a` checked out.

2. **Set up the worktree for this project:**
   - Install dependencies: `yarn setup` or `yarn setup:expo` depending on whether you need native tooling.
   - Init submodules (this repo has `ios/branch-ios-sdk`):  
     `git submodule update --init --recursive`
   - Copy env files from your main clone if you need them:  
     `.js.env`, `.ios.env`, `.android.env`, `.e2e.env` (see `.cursor/worktrees.json` for the list).

3. **Work in the worktree** – `cd` into the new directory and use it like a normal checkout (build, test, commit, push).

4. **List worktrees:**  
   `git worktree list`

5. **Remove a worktree when done:**

   Because this repo uses **submodules** (`ios/branch-ios-sdk`), Git may refuse a plain `git worktree remove <path>`. Use the force flag:

   ```bash
   git worktree remove ../metamask-mobile-feat-a -f
   ```

   The `-f` flag is required when the worktree has submodules or is in a state that would otherwise block removal.

### Cursor worktrees (agent UI) vs git worktrees

| Aspect        | `git worktree` (CLI)                            | Cursor parallel agents (worktree context)                                              |
| ------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| Config        | Ignores `.cursor/worktrees.json`                | Uses `.cursor/worktrees.json` for setup (env files, etc.)                              |
| Location      | You choose (e.g. `../metamask-mobile-feat-a`)   | Cursor creates worktrees under `~/.cursor/worktrees/metamask-mobile/`                  |
| Setup         | You run `yarn setup`, submodule init, copy envs | Cursor runs the `setup-worktree` steps from the JSON (currently only copies env/plans) |
| Apply changes | You merge or copy changes yourself              | "Apply" in the UI merges the agent’s worktree changes into your current branch         |

To see Cursor-created worktrees: `git worktree list` (they appear as paths under `~/.cursor/worktrees/metamask-mobile/`). You can enable `git.showCursorWorktrees` in Cursor settings to show them in the SCM pane. The `yarn worktree:create` script uses the same `.cursor/worktrees.json` for post-setup, so behavior stays in sync with Cursor.
