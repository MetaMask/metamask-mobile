# agent-device MCP

The `agent-device` MCP server has two distinct responsibilities:

**MCP server — guidance only**
Exposes prompts (`agent-device-workflow`, `agent-device-debugging`, `agent-device-macos`, …), tools (`status`, `help`, `install`), and resources (`agent-device://help/…`).
It injects version-matched operating guides into the agent's context. It does **not** control devices.

**CLI — execution**
All device control (open, screenshot, tap, scroll, type, …) runs through `yarn agent-device <command> --json` in the shell.

**Intended flow**

1. Call the `agent-device-workflow` prompt → operating guide is injected into context.
2. Run `yarn agent-device <command> --json` → drives the device.

## Skill (recommended)

Installing the `simulator-control` skill from [Consensys/skills](https://github.com/Consensys/skills) is not required, but strongly recommended. It teaches agents how the MCP server and CLI work together, and provides MetaMask Mobile–specific guidance (app identifiers, deep links, prerequisites). Without it, agents have to infer the correct workflow on their own.

```bash
yarn skills --domain testing
```
