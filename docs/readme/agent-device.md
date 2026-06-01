# agent-device

> **Node version note:** `agent-device` declares `engines.node >= 22.19`. The project currently pins Node 20.18.0 but an upgrade to Node 22 is planned, at which point this requirement will be fully satisfied. In the meantime it works correctly on Node 20 since Yarn does not enforce `engines` by default.

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
