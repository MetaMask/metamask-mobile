import { execFileSync } from 'child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const CURSOR_DISPATCHER = resolve(__dirname, 'hook-cursor-dispatch.sh');
const CLAUDE_DISPATCHER = resolve(__dirname, 'hook-claude-dispatch.sh');

/** Read the log file and return only the data rows (skip the CSV header). */
function dataLines(file: string): string[] {
  return readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .filter((l) => !l.startsWith('tool_name,'));
}

interface RunOptions {
  stdin?: string;
  env?: Record<string, string>;
}

function runDispatcher(
  script: string,
  options: RunOptions = {},
): {
  stdout: string;
  stderr: string;
  status: number;
} {
  try {
    const stdout = execFileSync('/bin/sh', [script], {
      input: options.stdin ?? '',
      encoding: 'utf8',
      env: { ...process.env, ...options.env },
    });
    return { stdout, stderr: '', status: 0 };
  } catch (err) {
    const e = err as NodeJS.ErrnoError & {
      stdout?: string;
      stderr?: string;
      status?: number;
    };
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      status: e.status ?? 1,
    };
  }
}

const cursorSkillPayload = JSON.stringify({
  cursor_version: '3.3.16',
  hook_event_name: 'preToolUse',
  tool_name: 'ReadFile',
  tool_input: { path: '/repo/.agents/skills/test-skill-cursor/SKILL.md' },
});

const claudeSkillPayload = JSON.stringify({
  tool_name: 'Skill',
  tool_input: { skill: 'test-skill-claude' },
});

const cursorNonSkillPayload = JSON.stringify({
  cursor_version: '3.3.16',
  hook_event_name: 'preToolUse',
  tool_name: 'ReadFile',
  tool_input: { path: '/repo/package.json' },
});

let tmpDir: string;
let logFile: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'dispatcher-test-'));
  logFile = join(tmpDir, 'events.log');
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('CI / opt-out early exit', () => {
  it('cursor script emits {"permission":"allow"} even when CI is set', () => {
    const result = runDispatcher(CURSOR_DISPATCHER, {
      stdin: cursorSkillPayload,
      env: { CI: 'true', TOOL_USAGE_COLLECTION_LOG_PATH: logFile },
    });

    expect(result.status).toBe(0);
    expect(existsSync(logFile)).toBe(false);
    // The allow response is emitted before the CI guard, so it always appears.
    expect(result.stdout.trim()).toBe('{"permission":"allow"}');
  });

  it('cursor script emits {"permission":"allow"} even when TOOL_USAGE_COLLECTION_OPT_IN=false', () => {
    const result = runDispatcher(CURSOR_DISPATCHER, {
      stdin: cursorSkillPayload,
      env: {
        TOOL_USAGE_COLLECTION_OPT_IN: 'false',
        CI: '',
        TOOL_USAGE_COLLECTION_LOG_PATH: logFile,
      },
    });

    expect(result.status).toBe(0);
    expect(existsSync(logFile)).toBe(false);
    expect(result.stdout.trim()).toBe('{"permission":"allow"}');
  });

  it('claude script produces no stdout and no log when CI is set', () => {
    const result = runDispatcher(CLAUDE_DISPATCHER, {
      stdin: claudeSkillPayload,
      env: { CI: 'true', TOOL_USAGE_COLLECTION_LOG_PATH: logFile },
    });

    expect(result.status).toBe(0);
    expect(existsSync(logFile)).toBe(false);
    expect(result.stdout).toBe('');
  });

  it('runs normally when TOOL_USAGE_COLLECTION_OPT_IN is not false', () => {
    const result = runDispatcher(CURSOR_DISPATCHER, {
      stdin: cursorSkillPayload,
      env: {
        TOOL_USAGE_COLLECTION_OPT_IN: 'true',
        CI: '',
        TOOL_USAGE_COLLECTION_LOG_PATH: logFile,
      },
    });

    expect(result.status).toBe(0);
    expect(existsSync(logFile)).toBe(true);
  });
});

describe('Cursor skill payload', () => {
  it('appends one CSV line for a file_path skill match', () => {
    const result = runDispatcher(CURSOR_DISPATCHER, {
      stdin: cursorSkillPayload,
      env: { CI: '', TOOL_USAGE_COLLECTION_LOG_PATH: logFile },
    });

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('{"permission":"allow"}');

    const lines = dataLines(logFile);
    expect(lines).toHaveLength(1);

    const fields = lines[0].split(',');
    // tool_name,tool_type,event_type,agent_vendor,session_id,success,duration_ms,created_at
    expect(fields[0]).toBe('skill:test-skill-cursor');
    expect(fields[1]).toBe('skill');
    expect(fields[2]).toBe('start');
    expect(fields[3]).toBe('cursor');
    // success and duration_ms are empty for skill start events
    expect(fields[5]).toBe('');
    expect(fields[6]).toBe('');
    // created_at is a non-empty ISO timestamp
    expect(fields[7]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it('does not write to log and still outputs allow for a non-skill Cursor payload', () => {
    const result = runDispatcher(CURSOR_DISPATCHER, {
      stdin: cursorNonSkillPayload,
      env: { CI: '', TOOL_USAGE_COLLECTION_LOG_PATH: logFile },
    });

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('{"permission":"allow"}');
    expect(existsSync(logFile)).toBe(false);
  });

  it('extracts session_id from the payload when present', () => {
    const payload = JSON.stringify({
      cursor_version: '3.3.16',
      session_id: 'abc-123',
      tool_name: 'ReadFile',
      tool_input: { path: '/repo/.cursor/skills/test-skill-session/SKILL.md' },
    });

    runDispatcher(CURSOR_DISPATCHER, {
      stdin: payload,
      env: { CI: '', TOOL_USAGE_COLLECTION_LOG_PATH: logFile },
    });

    const fields = dataLines(logFile)[0].split(',');
    expect(fields[0]).toBe('skill:test-skill-session');
    expect(fields[3]).toBe('cursor');
    expect(fields[4]).toBe('abc-123');
  });
});

describe('Claude skill payload', () => {
  it('appends one CSV line for a Claude Skill tool payload', () => {
    const result = runDispatcher(CLAUDE_DISPATCHER, {
      stdin: claudeSkillPayload,
      env: { CI: '', TOOL_USAGE_COLLECTION_LOG_PATH: logFile },
    });

    expect(result.status).toBe(0);
    // Claude hooks with async:true do not require stdout output
    expect(result.stdout).toBe('');

    const lines = dataLines(logFile);
    expect(lines).toHaveLength(1);

    const fields = lines[0].split(',');
    expect(fields[0]).toBe('skill:test-skill-claude');
    expect(fields[1]).toBe('skill');
    expect(fields[2]).toBe('start');
    expect(fields[3]).toBe('claude');
  });

  it('appends one CSV line for a Claude Read payload with a skill path', () => {
    const payload = JSON.stringify({
      tool_name: 'Read',
      tool_input: { file_path: '/repo/.claude/skills/test-skill-path/SKILL.md' },
    });

    runDispatcher(CLAUDE_DISPATCHER, {
      stdin: payload,
      env: { CI: '', TOOL_USAGE_COLLECTION_LOG_PATH: logFile },
    });

    const fields = dataLines(logFile)[0].split(',');
    expect(fields[0]).toBe('skill:test-skill-path');
    expect(fields[3]).toBe('claude');
  });

  it('does not write to log and produces no stdout when Claude reads a non-skill file', () => {
    const payload = JSON.stringify({
      tool_name: 'Read',
      tool_input: { file_path: '/repo/package.json' },
    });

    const result = runDispatcher(CLAUDE_DISPATCHER, {
      stdin: payload,
      env: { CI: '', TOOL_USAGE_COLLECTION_LOG_PATH: logFile },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(existsSync(logFile)).toBe(false);
  });
});

describe('edge cases', () => {
  it('exits cleanly with no log write when stdin is malformed JSON', () => {
    const result = runDispatcher(CURSOR_DISPATCHER, {
      stdin: 'not valid json }{',
      env: { CI: '', TOOL_USAGE_COLLECTION_LOG_PATH: logFile },
    });

    expect(result.status).toBe(0);
    expect(existsSync(logFile)).toBe(false);
  });

  it('exits cleanly with no log write when stdin is empty', () => {
    const result = runDispatcher(CURSOR_DISPATCHER, {
      stdin: '',
      env: { CI: '', TOOL_USAGE_COLLECTION_LOG_PATH: logFile },
    });

    expect(result.status).toBe(0);
    expect(existsSync(logFile)).toBe(false);
  });

  it('appends multiple lines from repeated invocations across both dispatchers', () => {
    const env = { CI: '', TOOL_USAGE_COLLECTION_LOG_PATH: logFile };
    runDispatcher(CURSOR_DISPATCHER, { stdin: cursorSkillPayload, env });
    runDispatcher(CLAUDE_DISPATCHER, { stdin: claudeSkillPayload, env });

    const lines = dataLines(logFile);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^skill:test-skill-cursor,/);
    expect(lines[1]).toMatch(/^skill:test-skill-claude,/);
  });
});
