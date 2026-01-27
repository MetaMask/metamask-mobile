# Jira/Atlassian MCP Setup

**Goal**: Set up the Atlassian MCP server to enable Claude to interact with Jira for issue tracking, project management, and workflow automation.

## First: Ask the User

**Before proceeding, ask the user:**

> Which platform(s) would you like to set up the Jira/Atlassian MCP for?
>
> 1. **Cursor** only
> 2. **Claude Code** only
> 3. **Both** Cursor and Claude Code

Wait for the user's response before proceeding with the relevant setup steps.

---

## Prerequisites

Before running this command, ensure you have:

- An Atlassian/Jira account with appropriate permissions
- Access to your team's Jira workspace
- **For Claude Code**: Claude CLI installed (`claude` command available)
- **For Cursor**: Cursor IDE with MCP support

---

## If user selected Cursor (option 1 or 3): Cursor Setup

### Steps

1. **Add the Atlassian MCP server**

   Edit `~/.cursor/mcp.json` (create directory if needed: `mkdir -p ~/.cursor`):

   ```json
   {
     "mcpServers": {
       "atlassian": {
         "url": "https://mcp.atlassian.com/v1/sse",
         "transport": "sse"
       }
     }
   }
   ```

   If file already exists with other servers, merge the atlassian config into existing mcpServers.

   Alternatively, use Cursor Settings UI:
   - Open Cursor
   - Go to **Settings** → **Cursor Settings** → **MCP**
   - Click "Add new MCP server"
   - Configure: Name: `atlassian`, Type: `sse`, URL: `https://mcp.atlassian.com/v1/sse`

2. **Restart Cursor**

   Close and reopen Cursor to load the new MCP configuration.

3. **Authenticate with Atlassian**
   - When you first use Jira-related features, Cursor will prompt you to authenticate
   - Complete the OAuth flow in your browser
   - Grant the necessary permissions

4. **Verify the connection**

   Test by asking Claude in Cursor:
   - "List my Jira projects"
   - "Show my assigned issues"

---

## If user selected Claude Code (option 2 or 3): Claude Code Setup

### Steps

1. **Add the Atlassian MCP server**

   Run the following command in your terminal:

   ```bash
   claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse
   ```

   This registers the Atlassian MCP server with Claude Code using Server-Sent Events (SSE) transport.

2. **Start Claude Code for authentication**

   Launch Claude Code:

   ```bash
   claude
   ```

3. **Authenticate with Atlassian**
   - Run the MCP authentication command:

   ```
   /mcp
   ```

   - Look for `Jira` in the list of available MCP servers
   - Select it and complete the OAuth authentication flow in your browser
   - Grant Claude the necessary permissions to access your Jira workspace

4. **Verify the connection**

   After authentication, test the connection by asking Claude:
   - "List my Jira projects"
   - "Show my assigned issues"
   - "What are the open issues in [project-key]?"

---

## Checklist

- [ ] User selected platform(s)

### If Cursor selected:

- [ ] MCP configuration added to `~/.cursor/mcp.json`
- [ ] Cursor restarted
- [ ] Jira authentication completed
- [ ] Connection verified with test query

### If Claude Code selected:

- [ ] Atlassian MCP server added via CLI
- [ ] Claude Code launched
- [ ] Jira authentication completed via `/mcp`
- [ ] Connection verified with test query

## Available Capabilities After Setup

Once configured, Claude can:

| Category        | Operations                                          |
| --------------- | --------------------------------------------------- |
| **Issues**      | Create, read, update, search, and transition issues |
| **Projects**    | List projects, get project details                  |
| **Comments**    | Add and read issue comments                         |
| **Workflows**   | Transition issues through workflow states           |
| **Search**      | Query issues using JQL (Jira Query Language)        |
| **Attachments** | View issue attachments                              |
| **Users**       | Look up users and assignees                         |

## Example Queries

After setup, you can ask Claude things like:

```
# Issue management
"Create a bug in MM-Mobile project titled 'Login screen crash on iOS 18'"
"Show me all open bugs assigned to me"
"Move issue MM-1234 to 'In Review'"
"Add a comment to MM-5678 saying the fix is ready for QA"

# Search and reporting
"Find all high-priority issues in the Confirmations epic"
"What issues were closed this sprint?"
"Show me issues blocking the release"

# Project overview
"List all projects I have access to"
"What's the status of the Mobile App project?"
```

## Troubleshooting

| Issue                         | Platform    | Solution                                           |
| ----------------------------- | ----------- | -------------------------------------------------- |
| MCP add command fails         | Claude Code | Verify Claude CLI is installed: `claude --version` |
| Authentication fails          | Both        | Check your Atlassian account permissions           |
| Can't see Jira in /mcp list   | Claude Code | Re-run the `claude mcp add` command                |
| MCP not loading               | Cursor      | Check JSON syntax in `~/.cursor/mcp.json`          |
| Connection timeout            | Both        | Check your network/VPN connection                  |
| Permission denied on projects | Both        | Verify your Jira workspace permissions             |
| Cursor not connecting         | Cursor      | Restart Cursor after config changes                |

## Quick Commands

### Claude Code

```bash
# Add the Atlassian MCP server
claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse

# List configured MCP servers
claude mcp list

# Remove the Atlassian MCP server (if needed)
claude mcp remove atlassian

# Start Claude Code
claude

# Inside Claude Code, authenticate MCPs
/mcp
```

### Cursor

```bash
# View Cursor MCP config
cat ~/.cursor/mcp.json

# Edit Cursor MCP config (add atlassian server)
# Then restart Cursor to apply changes
```

## Re-authentication

### Claude Code

1. Run `claude`
2. Execute `/mcp`
3. Select Jira and complete the authentication flow again

### Cursor

1. Open Cursor Settings → MCP
2. Find the Atlassian server and re-authenticate
3. Or delete and re-add the server configuration

## Success Criteria

- Atlassian MCP server is registered (Claude Code or Cursor)
- OAuth authentication completed successfully
- Claude can list projects and issues from your Jira workspace
- Test queries return expected results
