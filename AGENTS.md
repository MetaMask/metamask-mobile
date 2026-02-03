# AGENTS.md

This file provides guidance to AI coding agents (Claude, Cursor, Copilot, Windsurf, etc.) when working with code in this repository. It points to canonical sources instead of duplicating content.

## Project Overview

MetaMask Mobile is a React Native mobile wallet for Ethereum blockchain networks, available for iOS and Android. For detailed setup, commands, and documentation, see the canonical sources below.

## Canonical Sources

### Commands, Setup & Getting Started

- **README.md** — Getting started, Infura, Firebase, Expo and native setup, run commands (`yarn setup`, `yarn watch`, `yarn start:ios` / `yarn start:android`).
- **package.json** — All scripts: unit test (`yarn test:unit`), lint, format, build (e.g. `yarn build:android:main:dev`). E2E commands and build types (main/flask/qa) are in [docs/readme/e2e-testing.md](./docs/readme/e2e-testing.md).
- [docs/readme/expo-environment.md](./docs/readme/expo-environment.md) — Expo development setup (Node, Yarn v4, Watchman).
- [docs/readme/environment.md](./docs/readme/environment.md) — Native development environment (Ruby, Xcode, Node, Yarn).

### Development Guidelines (Cursor Rules)

Detailed coding and testing guidelines live in **`.cursor/rules/`**. Cursor applies these automatically; follow them as the source of truth. Do not copy their content here.

| Rule File                         | Scope                                              |
| --------------------------------- | -------------------------------------------------- |
| `general-coding-guidelines.mdc`   | Coding standards, file organization, documentation |
| `ui-development-guidelines.mdc`   | UI components, design system, Tailwind, styling    |
| `unit-testing-guidelines.mdc`     | Unit tests — patterns, mocking, AAA                |
| **`e2e-testing-guidelines.mdc`**  | **E2E tests — Page Objects, framework, patterns**  |
| `component-view-testing.mdc`      | Component testing with presets/renderers           |
| `deeplink-handler-guidelines.mdc` | Deeplink handler implementation                    |
| `pr-creation-guidelines.mdc`      | Pull request standards                             |

For E2E tests, use [.cursor/rules/e2e-testing-guidelines.mdc](./.cursor/rules/e2e-testing-guidelines.mdc) and [docs/readme/e2e-testing.md](./docs/readme/e2e-testing.md) as the canonical references.

### Project Coding Guidelines (Markdown)

- [.github/guidelines/CODING_GUIDELINES.md](./.github/guidelines/CODING_GUIDELINES.md) — TypeScript, file organization, naming, testing; referenced by `.cursor/rules`.

### Architecture & Documentation

| Topic                     | Path                                                                             | Notes                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Architecture              | [docs/readme/architecture.md](./docs/readme/architecture.md)                     | Diagram in `architecture.svg`; overview of Engine, Redux, controllers, directory structure. |
| E2E Testing & build types | [docs/readme/e2e-testing.md](./docs/readme/e2e-testing.md)                       | E2E commands, METAMASK_BUILD_TYPE (main/flask/qa).                                          |
| Debugging                 | [docs/readme/debugging.md](./docs/readme/debugging.md)                           |                                                                                             |
| Performance               | [docs/readme/performance.md](./docs/readme/performance.md)                       |                                                                                             |
| Storybook                 | [docs/readme/storybook.md](./docs/readme/storybook.md)                           |                                                                                             |
| Troubleshooting           | [docs/readme/troubleshooting.md](./docs/readme/troubleshooting.md)               |                                                                                             |
| Miscellaneous             | [docs/readme/miscellaneous.md](./docs/readme/miscellaneous.md)                   | Dependencies, attribution.                                                                  |
| Release build profiling   | [docs/readme/release-build-profiler.md](./docs/readme/release-build-profiler.md) |                                                                                             |
| Reassure (perf testing)   | [docs/readme/reassure.md](./docs/readme/reassure.md)                             |                                                                                             |
| Security                  | [docs/readme/security.md](./docs/readme/security.md)                             | Base guidance; extend with more context over time.                                          |
| MetaMask Contributor Docs | https://github.com/MetaMask/contributor-docs                                     | TypeScript, unit testing, security practices.                                               |

**Full documentation index:** [README.md § Documentation](./README.md#documentation).

### Test Folders (Folder-Level Agent Indexes)

When working inside a test folder, use its local AGENTS.md as the index for that area:

| Folder                      | AGENTS.md                            | Context                                                                                                             |
| --------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| [e2e/](./e2e/AGENTS.md)     | [e2e/AGENTS.md](./e2e/AGENTS.md)     | E2E specs, Page Objects, selectors, Detox/Playwright config                                                         |
| [tests/](./tests/AGENTS.md) | [tests/AGENTS.md](./tests/AGENTS.md) | E2E framework, fixtures, API/controller mocking, regression & smoke specs                                           |
| [wdio/](./wdio/AGENTS.md)   | [wdio/AGENTS.md](./wdio/AGENTS.md)   | Legacy WebdriverIO/Appium (deprecated); see Appwright for performance tests                                         |
| [app/](./app/AGENTS.md)     | [app/AGENTS.md](./app/AGENTS.md)     | Unit tests + component-view tests (scattered under `app/`); component-view framework in `util/test/component-view/` |

## Before Implementing

1. Read **README.md** and the relevant docs above (and full list in README § Documentation).
2. For code style and testing, follow **`.cursor/rules/`** (and [.github/guidelines/CODING_GUIDELINES.md](./.github/guidelines/CODING_GUIDELINES.md)); for E2E, use the E2E guidelines and [docs/readme/e2e-testing.md](./docs/readme/e2e-testing.md).
3. Use **yarn** only (no npm/npx).
4. **Jira tickets:** Get details from the ticket link; ask which platform (iOS or Android); run setup (`yarn setup` → `yarn watch:clean` → `yarn start:ios` or `yarn start:android`); implement and use screenshots for feedback if needed.
