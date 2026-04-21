import { execFileSync } from 'child_process';
import { join } from 'path';
import { createInterface } from 'readline';

/**
 * Adapter for agent harness hooks (Cursor `beforeReadFile`, Claude Code
 * `PreToolUse` on `Read`) that detects skill activations by matching the
 * harness-specific skill directory and forwards a tracking event to the
 * shared CLI.
 *
 * Both harnesses issue a `Read` against the skill's SKILL.md on activation:
 * - Claude Code reads `.claude/skills/<name>/SKILL.md`
 * - Cursor reads `.agents/skills/<name>/SKILL.md` or `.cursor/skills/<name>/SKILL.md`
 */

interface HookInput {
  // Cursor `beforeReadFile` passes the path at the top level.
  file_path?: unknown;
  // Claude Code `PreToolUse` nests tool arguments under `tool_input`.
  tool_input?: { file_path?: unknown };
  [key: string]: unknown;
}

const SKILL_PATH_RE =
  /\.(?:agents|cursor|claude)\/skills\/([^/]+)\/SKILL\.md$/;

/**
 * Extracts the skill name from a path matching
 * `.{agents,cursor,claude}/skills/<name>/SKILL.md`. Returns null otherwise.
 */
export function extractSkillName(filePath: string): string | null {
  const match = filePath.match(SKILL_PATH_RE);
  return match ? match[1] : null;
}

/**
 * Reads the optional `--agent <vendor>` flag. Returned as-is so new harnesses
 * can be added without touching this script.
 */
export function parseAgent(argv: string[]): string | undefined {
  const idx = argv.indexOf('--agent');
  if (idx === -1 || !argv[idx + 1]) return undefined;
  return argv[idx + 1];
}

/**
 * Reads the file path from either supported payload shape without caring which
 * harness produced it. `tool_input.file_path` (Claude) is preferred because
 * top-level keys are more likely to collide with unrelated payload fields.
 */
export function getFilePath(input: HookInput): string | null {
  const candidate = input.tool_input?.file_path ?? input.file_path;
  return typeof candidate === 'string' ? candidate : null;
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  // Always emit the allow response on exit — Cursor requires it, Claude's
  // async PreToolUse hook ignores stdout, and any future harness either
  // ignores it or sees a benign "allow". This keeps every code path uniform.
  const allow = () => process.stdout.write('{"permission":"allow"}\n');

  const agent = parseAgent(argv);

  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  const lines: string[] = [];
  for await (const line of rl) {
    lines.push(line);
  }

  let input: HookInput | null = null;
  try {
    input = JSON.parse(lines.join('\n')) as HookInput;
  } catch {
    // Fall through; input stays null and we emit allow below.
  }

  const filePath = input ? getFilePath(input) : null;
  const skillName = filePath ? extractSkillName(filePath) : null;

  if (skillName) {
    const args = [
      'tsx',
      join(__dirname, 'tool-usage-collection.ts'),
      '--tool', `skill:${skillName}`,
      '--type', 'skill',
      '--event', 'start',
    ];
    if (agent) args.push('--agent', agent);
    try {
      execFileSync('yarn', args, { stdio: 'ignore' });
    } catch {
      // Tracking is best-effort — never block the read on failure.
    }
  }

  allow();
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(() => process.exit(0));
}
