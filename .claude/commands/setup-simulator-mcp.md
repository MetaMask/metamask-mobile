# Mobile Simulator MCP Setup

**Goal**: Set up an MCP server to enable agents to control mobile simulators/emulators for building, testing, and debugging MetaMask Mobile.

## Step 1: Ask What the User Wants

**Before proceeding, ask:**

> What would you like to set up?
>
> **Platform support:**
>
> 1. **iOS only** - iOS Simulators (macOS required)
> 2. **Android only** - Android Emulators (any OS)
> 3. **Both iOS and Android** - Full mobile automation
>
> **Which AI tool(s) are you using?**
>
> - Claude Code CLI
> - Cursor
> - Claude Desktop
> - Other (Copilot, Windsurf, etc.)

Wait for the user's response before proceeding.

---

## Step 2: Choose the Right MCP Server

Based on the user's platform choice:

| Choice           | Recommended MCP                                              | Why                                    |
| ---------------- | ------------------------------------------------------------ | -------------------------------------- |
| iOS only         | [XcodeBuildMCP](https://github.com/nicholascm/xcodebuildmcp) | Deep Xcode integration, 63 tools       |
| Android only     | [Mobile MCP](https://github.com/mobile-next/mobile-mcp)      | Android emulator + real device support |
| Both iOS/Android | [Mobile MCP](https://github.com/mobile-next/mobile-mcp)      | Cross-platform, supports both          |

---

## Step 3: Verify Prerequisites

### For iOS (XcodeBuildMCP or Mobile MCP):

```bash
# Verify Xcode is installed
xcodebuild -version

# Verify simulators are available
xcrun simctl list devices available
```

### For Android (Mobile MCP):

```bash
# Verify Android SDK
echo $ANDROID_HOME

# Verify ADB is available
adb --version

# List available emulators
emulator -list-avds
```

### For both:

```bash
# Verify Node.js (required for both)
node --version  # Should be 16+ for XcodeBuildMCP, 22+ for Mobile MCP
```

---

## Step 4: Configure the MCP Server

### Option A: Mobile MCP (iOS + Android)

**Claude Code CLI:**

```bash
claude mcp add mobile-mcp -- npx -y @mobilenext/mobile-mcp@latest
```

**Cursor** (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "mobile-mcp": {
      "command": "npx",
      "args": ["-y", "@mobilenext/mobile-mcp@latest"]
    }
  }
}
```

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mobile-mcp": {
      "command": "npx",
      "args": ["-y", "@mobilenext/mobile-mcp@latest"]
    }
  }
}
```

**Other tools** (Copilot, Windsurf, Goose, etc.) - Use the standard config:

```json
{
  "mcpServers": {
    "mobile-mcp": {
      "command": "npx",
      "args": ["-y", "@mobilenext/mobile-mcp@latest"]
    }
  }
}
```

### Option B: XcodeBuildMCP (iOS only, deeper Xcode integration)

**Claude Code CLI:**

```bash
claude mcp add --transport stdio xcodebuild -- npx -y xcodebuildmcp
```

**Cursor** (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "xcodebuild": {
      "command": "npx",
      "args": ["-y", "xcodebuildmcp"]
    }
  }
}
```

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "xcodebuild": {
      "command": "npx",
      "args": ["-y", "xcodebuildmcp"]
    }
  }
}
```

---

## Step 5: Verify Installation

```bash
# For Mobile MCP
npx -y @mobilenext/mobile-mcp@latest --version

# For XcodeBuildMCP
npx -y xcodebuildmcp --version

# Claude Code CLI - verify server is connected
claude mcp list
```

---

## Step 6: Restart and Test

1. **Restart** the AI tool (Claude Code CLI session, Cursor, Claude Desktop)
2. **Test** by asking Claude to list available simulators/emulators

---

## Available Capabilities

### Mobile MCP (iOS + Android)

| Category        | Operations                          |
| --------------- | ----------------------------------- |
| **Simulators**  | List, boot, shutdown iOS simulators |
| **Emulators**   | List, start, stop Android emulators |
| **Apps**        | Install, launch, terminate apps     |
| **Screenshots** | Capture screens                     |
| **UI Testing**  | Tap, swipe, type text, describe UI  |
| **Devices**     | Connect to real iOS/Android devices |
| **Workflows**   | Complex multi-step automation       |

### XcodeBuildMCP (iOS only)

| Category         | Operations                                   |
| ---------------- | -------------------------------------------- |
| **Simulators**   | List, boot, shutdown, erase simulators       |
| **Apps**         | Install, launch, terminate, uninstall apps   |
| **Screenshots**  | Capture simulator screens                    |
| **UI Testing**   | Tap, swipe, type text, describe UI hierarchy |
| **Xcode Builds** | Build, test, archive projects                |
| **Logs**         | Capture simulator and app logs               |
| **macOS**        | Build and run macOS apps                     |

---

## Troubleshooting

| Issue                         | Solution                                       |
| ----------------------------- | ---------------------------------------------- |
| MCP server not found          | Verify Node.js is installed (`node --version`) |
| iOS simulator not booting     | Verify Xcode: `xcodebuild -version`            |
| Android emulator not starting | Verify `$ANDROID_HOME` and `adb --version`     |
| Server not connecting         | Restart your AI tool after configuration       |
| npm/npx errors                | Clear cache: `npm cache clean --force`         |
| Permission errors             | Check platform tools installation              |

---

## Quick Reference

| MCP Server    | Package                         | Platforms        | Docs                                        |
| ------------- | ------------------------------- | ---------------- | ------------------------------------------- |
| Mobile MCP    | `@mobilenext/mobile-mcp@latest` | iOS + Android    | https://github.com/mobile-next/mobile-mcp   |
| XcodeBuildMCP | `xcodebuildmcp`                 | iOS + macOS only | https://github.com/nicholascm/xcodebuildmcp |
