# iOS Simulator MCP Setup

**Goal**: Set up the XcodeBuildMCP server to enable Claude to control iOS simulators for building, testing, and debugging MetaMask Mobile.

## First: Ask the User

**Before proceeding, ask the user:**

> Which platform(s) would you like to set up the iOS Simulator MCP for?
>
> 1. **Claude Code CLI** only
> 2. **Cursor** only
> 3. **Claude Desktop** only
> 4. **Multiple platforms** (specify which ones)

Wait for the user's response before proceeding with the relevant setup steps.

---

## Prerequisites

Before running this command, ensure you have:

- macOS (iOS simulators only work on macOS)
- Xcode installed with iOS simulators
- Node.js 16+ installed

## Steps

### Step 1: Verify prerequisites

- Run `xcodebuild -version` to verify Xcode is installed
- Run `node --version` to verify Node.js is installed (should be 16+)
- Run `xcrun simctl list devices available` to verify simulators are available
- If any are missing, stop and inform the user what needs to be installed

### Step 2: Configure based on user's choice

#### If user selected Claude Code CLI (option 1 or 4):

**Use the CLI command to add the MCP server:**

```bash
claude mcp add --transport stdio xcodebuild -- npx -y xcodebuildmcp
```

This command will:

- Automatically register the xcodebuild MCP server
- Add it to your local project configuration (`~/.claude.json` for this project)
- Configure it with the correct stdio transport

**Important**: You must **restart your Claude Code CLI session** (exit and start a new session) for changes to take effect.

**Verification**: After restarting, run `claude mcp list` to confirm the xcodebuild server shows as "✓ Connected"

#### If user selected Cursor (option 2 or 4):

- Create directory if needed: `mkdir -p ~/.cursor`
- Create or update `~/.cursor/mcp.json` with:

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

- If file already exists with other servers, merge the xcodebuild config into existing mcpServers

#### If user selected Claude Desktop (option 3 or 4):

- Create directory if needed: `mkdir -p ~/Library/Application\ Support/Claude`
- Create or update `~/Library/Application Support/Claude/claude_desktop_config.json` with:

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

- If file already exists with other servers, merge the xcodebuild config into existing mcpServers

### Step 3: Test the MCP server

- Run `npx -y xcodebuildmcp --version` to verify the package loads correctly
- If there are errors, troubleshoot npm/node installation

### Step 4: Provide next steps

- Inform user to restart the application(s) they configured
- List available capabilities (63 tools)

## Checklist

- [ ] User selected platform(s)
- [ ] Xcode verified
- [ ] Node.js verified
- [ ] Simulators available
- [ ] Selected platform(s) MCP configured
- [ ] MCP server tested
- [ ] User informed of next steps

## Available Capabilities After Setup

Once configured, Claude can:

| Category         | Operations                                   |
| ---------------- | -------------------------------------------- |
| **Simulators**   | List, boot, shutdown, erase simulators       |
| **Apps**         | Install, launch, terminate, uninstall apps   |
| **Screenshots**  | Capture simulator screens                    |
| **UI Testing**   | Tap, swipe, type text, describe UI hierarchy |
| **Devices**      | List connected physical devices              |
| **Xcode Builds** | Build, test, archive projects                |
| **Logs**         | Capture simulator and app logs               |

## Troubleshooting

| Issue                                       | Solution                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| MCP server not showing in `claude mcp list` | Use `claude mcp add` CLI command instead of manually editing JSON files                           |
| Server not connecting after manual edit     | Remove manual edits and use `claude mcp add --transport stdio xcodebuild -- npx -y xcodebuildmcp` |
| MCP server not found                        | Verify Node.js and npm are properly installed                                                     |
| Permission errors                           | Check Xcode command line tools installation                                                       |
| Simulator not booting                       | Verify simulator exists and Xcode is configured                                                   |
| npm/npx errors                              | Try clearing npm cache: `npm cache clean --force`                                                 |
| Server shows in list but not working        | Restart Claude Code session (exit and start new session)                                          |

## Quick Verification Commands

```bash
# Check Xcode
xcodebuild -version

# Check Node.js
node --version

# List available simulators
xcrun simctl list devices available

# Test MCP server package
npx -y xcodebuildmcp --version

# Claude Code CLI: List registered MCP servers
claude mcp list

# Claude Code CLI: View project config
cat ~/.claude.json

# Cursor: View config
cat ~/.cursor/mcp.json

# Claude Desktop: View config
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

## Success Criteria

- Xcode and Node.js are installed
- MCP configuration files are created for selected platform(s) (Claude Code CLI, Cursor, and/or Claude Desktop)
- MCP server loads without errors
- User is informed to restart their application(s)

## Configuration Methods

### Claude Code CLI

**Preferred Method**: Use the CLI command

```bash
claude mcp add --transport stdio xcodebuild -- npx -y xcodebuildmcp
```

This creates a project-specific configuration in `~/.claude.json` (not `~/.claude/mcp.json`)

**Important**: Manual JSON editing is NOT recommended for Claude Code CLI - always use the `claude mcp add` command

### Other Platforms

Manual JSON configuration is still required for:

- **Cursor**: `~/.cursor/mcp.json` (uses `"mcpServers"` wrapper)
- **Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json` (uses `"mcpServers"` wrapper)
