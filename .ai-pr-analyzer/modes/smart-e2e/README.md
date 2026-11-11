# smart-e2e mode

Custom [`MetaMask/ai-analyzer`](https://github.com/MetaMask/ai-analyzer) mode that picks which E2E smoke tags (from `tests/tags.js`) run on a pull request. This folder, together with the shared analyzer, is the **only** implementation of Smart E2E Selection.

> **Not `tests/tools/e2e-ai-analyzer`.** That older in-repo tool used to run Smart E2E. It no longer does: it now only backs RC test-plan generation (`yarn test:e2e:ai-test-plan`, `generate-rc-test-plan.yml`). Changing its model, prompts or providers has **no effect** on Smart E2E.

## How it runs in CI

1. The `smart-e2e-selection` job in `.github/workflows/ci.yml` reads the analyzer commit from [`.github/actions/smart-e2e-selection/analyzer-ref.txt`](../../../.github/actions/smart-e2e-selection/analyzer-ref.txt) and calls the composite action [`.github/actions/smart-e2e-selection`](../../../.github/actions/smart-e2e-selection/action.yml).
2. The action checks out `MetaMask/ai-analyzer` at that commit, runs `generate-catalog.ts` to build the tag catalog, then runs the analyzer with `INPUT_CONFIG_PATH=.ai-pr-analyzer` and `INPUT_MODE=smart-e2e`.
3. The analyzer calls the model through its **LiteLLM** provider (`LITELLM_API_KEY`). It reads the model, iteration budget, prompts, comment format and hard rules from the files in this folder.
4. `e2e-smart-selection.mjs` / `map-smart-e2e-outputs.mjs` map the result (`smart-e2e.json`) onto the job outputs (`ai_e2e_test_tags`, `ai_confidence`, …). The `skip-smart-e2e-selection` label bypasses the AI and returns `ALL`.

Gating (when Smart E2E runs at all, labels, platforms) is described in [`.github/guidelines/E2E_DECISION_TREE.md`](../../../.github/guidelines/E2E_DECISION_TREE.md).

## Files

| File                                                      | Purpose                                                                                                                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mode.yaml`                                               | Mode definition: finalize tool, output file, PR comment fields, skills opt-in, and `config` (`maxIterations`, `models.default` / `models.escalation`). |
| `system-prompt.md`, `task-prompt.md`, `prompt-context.md` | Prompts for the agent.                                                                                                                                 |
| `finalize-schema.json`                                    | Schema of the result the agent must return.                                                                                                            |
| `hard-rules.json`, `hard-rule-*.ts`                       | Deterministic rules applied before or around the AI (for example, E2E workflow changes force `ALL`).                                                   |
| `generate-catalog.ts`, `catalog-from-tags.ts`             | Build the available-tag catalog from `tests/tags.js`.                                                                                                  |
| `fallback.json`                                           | Result used when the analysis fails.                                                                                                                   |

Repo-wide analyzer settings (search directories, escalation patterns) live in [`.ai-pr-analyzer/config.yaml`](../../config.yaml).

## Evals

`evals/fixtures/*.yaml` are old PRs pinned to their base/head SHAs, each with the tags a correct selection must include and must not include. Use them to measure a prompt, model or analyzer-version change before shipping it. Run the manual **AI analyzer eval** workflow (`.github/workflows/ai-analyzer-eval.yml`), or run locally from the repo root with an ai-analyzer checkout that includes the eval framework:

```bash
NODE_PATH=../ai-analyzer/node_modules node -r esbuild-register .ai-pr-analyzer/modes/smart-e2e/generate-catalog.ts
node -r ../ai-analyzer/node_modules/esbuild-register/register.js ../ai-analyzer/src/index.ts eval --mode smart-e2e --mode-ref main
```

`--mode-ref main` compares your working tree's mode definition with `main`'s, side by side. Add a fixture with `eval capture --mode smart-e2e --pr <number>`, then fill in `expected`. See [MetaMask/ai-analyzer `docs/evaluating-modes.md`](https://github.com/MetaMask/ai-analyzer/blob/main/docs/evaluating-modes.md).

## Common changes

- **Model**: edit `config.models.default` and `config.models.escalation` in `mode.yaml`. Keep both tiers pinned to the same model so repo `escalationPatterns` cannot switch it. The name is a LiteLLM model name (for example `claude-sonnet-5-5`), so it must be one the LiteLLM proxy serves. Request parameters (temperature, thinking, message conversion) are handled by the analyzer's LiteLLM provider in `MetaMask/ai-analyzer`, not in this repo.
- **Analyzer version**: update `.github/actions/smart-e2e-selection/analyzer-ref.txt`. Per-mode `config` needs an analyzer version that supports it.
- **Prompts / hard rules**: edit the files above. See [MetaMask/ai-analyzer `docs/adding-a-new-mode.md`](https://github.com/MetaMask/ai-analyzer/blob/main/docs/adding-a-new-mode.md) for template variables.
- **Tests**: `yarn test:smart-e2e` runs the tests in this folder and in `.github/actions/smart-e2e-selection/`.
