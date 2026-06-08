# agent-device

> **Node version note:** `agent-device` declares `engines.node >= 22.19`. The project now pins Node 22.22.3, satisfying this requirement.

All device control (open, screenshot, tap, scroll, type, …) runs through:

`agent-device` is installed as a local dependency and used exclusively as a CLI.

```bash
yarn agent-device <command> --json
```

Run `yarn agent-device --help` for the full command reference.

## Skill (recommended)

Installing the `simulator-control` skill from [Consensys/skills](https://github.com/Consensys/skills) provides MetaMask Mobile–specific guidance (app identifiers, deep links, prerequisites).

```bash
yarn skills --domain testing
```
