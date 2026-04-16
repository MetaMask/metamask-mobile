import { execFileSync } from 'child_process';
import { join } from 'path';
import { createInterface } from 'readline';

interface BeforeReadFileInput {
  file_path: string;
  [key: string]: unknown;
}

interface HookOutput {
  permission: 'allow' | 'deny';
}

const SKILL_PATH_RE = /\.agents\/skills\/([^/]+)\/SKILL\.md$/;

const allow: HookOutput = { permission: 'allow' };

/**
 * Extracts the skill name from a path matching `.agents/skills/<name>/SKILL.md`.
 * Returns null if the path does not match.
 */
export function extractSkillName(filePath: string): string | null {
  const match = filePath.match(SKILL_PATH_RE);
  return match ? match[1] : null;
}

/**
 * Entry point for the Cursor `beforeReadFile` hook.
 * Reads JSON from stdin, checks if the file is a skill, and records a start event.
 * Always outputs `{"permission":"allow"}` so the read is never blocked.
 */
export async function main(): Promise<void> {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  const lines: string[] = [];
  for await (const line of rl) {
    lines.push(line);
  }

  let input: BeforeReadFileInput;
  try {
    input = JSON.parse(lines.join('\n')) as BeforeReadFileInput;
  } catch {
    // Malformed input — allow the read and exit silently
    process.stdout.write(JSON.stringify(allow) + '\n');
    return;
  }

  const skillName = extractSkillName(input.file_path);
  if (skillName) {
    try {
      execFileSync(
        'yarn',
        ['tsx', join(__dirname, 'tool-usage-collection.ts'), '--tool', `skill:${skillName}`, '--type', 'skill', '--event', 'start', '--agent', 'cursor'],
        { stdio: 'ignore' },
      );
    } catch {
      // Tracking is best-effort — never block the read on failure
    }
  }

  process.stdout.write(JSON.stringify(allow) + '\n');
}

if (require.main === module) {
  main().then(() => process.exit(0));
}
