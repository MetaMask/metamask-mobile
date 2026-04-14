import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { trackEvent, type EventType } from './events';

const server = new Server(
  { name: 'tooling', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, () => ({
  tools: [
    {
      name: 'track_event',
      description:
        'Record a tool-usage event in the local SQLite database (~/.tool-usage-collection/events.db).',
      inputSchema: {
        type: 'object' as const,
        properties: {
          tool: {
            type: 'string',
            description:
              'Tool identifier, e.g. "skill:worktree-create" or "yarn:setup:expo"',
          },
          type: {
            type: 'string',
            description:
              'Tool category, e.g. "skill", "yarn_script", "mcp_tool"',
          },
          event: {
            type: 'string',
            enum: ['start', 'end'],
            description: 'Event phase',
          },
          agent: {
            type: 'string',
            description: 'Agent vendor: "cursor", "claude", "codex", etc.',
          },
          success: {
            type: 'boolean',
            description:
              'Whether the tool completed successfully (end events only)',
          },
          duration: {
            type: 'integer',
            minimum: 0,
            description: 'Elapsed milliseconds (end events only)',
          },
        },
        required: ['tool', 'type', 'event'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, (request) => {
  if (request.params.name !== 'track_event') {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const args = request.params.arguments as {
    tool: string;
    type: string;
    event: EventType;
    agent?: string;
    success?: boolean;
    duration?: number;
  };

  if (!args.tool || !args.type || !args.event) {
    throw new Error('track_event requires tool, type, and event arguments');
  }

  const result = trackEvent({
    tool_name: args.tool,
    tool_type: args.type,
    event_type: args.event,
    agent_vendor: args.agent,
    success: args.success,
    duration_ms: args.duration,
  });

  if (result === false) {
    // isError signals a tool-level failure; agents can handle it without a
    // protocol-level exception. Error detail is in the content, not stderr,
    // because MCP agents cannot read stderr.
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: 'tracking failed: DB write error\nhint[] check ~/.tool-usage-collection/events.db permissions',
        },
      ],
    };
  }

  // TOON-format confirmation — event_id and created_at let the agent verify
  // the exact row that was written without a follow-up query.
  return {
    content: [
      {
        type: 'text' as const,
        text: `tracked: tool=${args.tool} event=${args.event}\nevent_id=${result.event_id}\ncreated_at=${result.created_at}`,
      },
    ],
  };
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(
    `tooling-mcp-server error: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
