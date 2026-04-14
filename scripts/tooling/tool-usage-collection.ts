import { trackEvent, type EventType } from './events';

interface ParsedArgs {
  tool: string;
  type: string;
  event: EventType;
  session?: string;
  agent?: string;
  success?: boolean;
  duration?: number;
  verbose?: boolean;
}

const USAGE =
  'Usage: yarn tsx scripts/tooling/tool-usage-collection.ts ' +
  '--tool <name> --type <type> --event start|end ' +
  '[--session <uuid>] [--agent <vendor>] [--success true|false] [--duration <ms>] [--verbose]\n';

/**
 * Parses `--key value` pairs from an argv array.
 * Throws if required args (`--tool`, `--type`, `--event`) are missing or invalid.
 * Exported for unit testing.
 */
export function parseArgs(argv: string[]): ParsedArgs {
  if (argv.includes('--help')) {
    process.stdout.write(USAGE);
    process.exit(0);
  }

  const map: Record<string, string> = {};

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--verbose') {
      map.verbose = 'true';
    } else if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      // Reject flags that have no following value token or whose next token is itself a flag
      if (next === undefined || next.startsWith('--')) {
        throw new Error(`--${key} requires a value`);
      }
      map[key] = next;
      i++;
    }
  }

  if (!map.tool) throw new Error('--tool is required');
  if (!map.type) throw new Error('--type is required');
  if (map.event !== 'start' && map.event !== 'end') {
    throw new Error('--event must be "start" or "end"');
  }
  if (map.success != null && map.success !== 'true' && map.success !== 'false') {
    throw new Error('--success must be "true" or "false"');
  }

  let duration: number | undefined;
  if (map.duration != null) {
    const parsed = parseInt(map.duration, 10);
    if (isNaN(parsed) || parsed < 0 || String(parsed) !== map.duration) {
      throw new Error('--duration must be a non-negative integer');
    }
    duration = parsed;
  }

  return {
    tool: map.tool,
    type: map.type,
    event: map.event,
    session: map.session,
    agent: map.agent,
    success: map.success != null ? map.success === 'true' : undefined,
    duration,
    verbose: map.verbose === 'true',
  };
}

/**
 * Entry point when invoked as a CLI script via `yarn tsx scripts/tooling/tool-usage-collection.ts`.
 * Exported for unit testing — does not run automatically on import.
 */
export async function main(): Promise<void> {
  let args: ParsedArgs;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    // Arg errors are always surfaced — a misconfigured hook should be visible
    process.stderr.write(
      `tool-usage-collection error: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
    return; // unreachable in production; guards against mocked process.exit in tests
  }

  // DB write is best-effort — errors are written to stderr by trackEvent, never thrown
  trackEvent({
    session_id: args.session,
    tool_name: args.tool,
    tool_type: args.type,
    event_type: args.event,
    agent_vendor: args.agent,
    success: args.success,
    duration_ms: args.duration,
  });

  if (args.verbose) {
    process.stdout.write(`tracked: tool=${args.tool} event=${args.event}\n`);
    process.stdout.write(
      `hint[] run \`yarn tooling:report\` to inspect your activity\n`,
    );
  }
}

// Only auto-run when executed directly — not when imported by tests
if (require.main === module) {
  main().then(() => process.exit(0));
}
