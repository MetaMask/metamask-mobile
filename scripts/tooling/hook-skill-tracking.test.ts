jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
}));

jest.mock('readline', () => ({
  createInterface: jest.fn(),
}));

import { execFileSync } from 'child_process';
import { createInterface } from 'readline';
import {
  extractSkillName,
  getFilePath,
  main,
  parseAgent,
} from './hook-skill-tracking';

function makeRl(lines: string[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const line of lines) {
        yield line;
      }
    },
  };
}

function stdinPayload(payload: unknown): string[] {
  return [JSON.stringify(payload)];
}

let stdoutWrite: jest.SpyInstance;

beforeEach(() => {
  stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
});

afterEach(() => {
  stdoutWrite.mockRestore();
  jest.mocked(execFileSync).mockReset();
  jest.mocked(createInterface).mockReset();
});

describe('extractSkillName', () => {
  it('extracts the skill name from an .agents/skills path (Cursor repo skills)', () => {
    expect(
      extractSkillName('/repo/.agents/skills/worktree-create/SKILL.md'),
    ).toBe('worktree-create');
  });

  it('extracts the skill name from a .claude/skills path (Claude skills)', () => {
    expect(
      extractSkillName('/repo/.claude/skills/pr-changelog/SKILL.md'),
    ).toBe('pr-changelog');
  });

  it('extracts the skill name from a .cursor/skills path (Cursor-only skills)', () => {
    expect(
      extractSkillName('/repo/.cursor/skills/worktree-create/SKILL.md'),
    ).toBe('worktree-create');
  });

  it('extracts the skill name when the path has no leading slash', () => {
    expect(extractSkillName('.agents/skills/pr-create/SKILL.md')).toBe(
      'pr-create',
    );
  });

  it('returns null for a path that does not match the skill pattern', () => {
    expect(extractSkillName('/repo/src/components/Button.tsx')).toBeNull();
  });

  it('returns null for a SKILL.md that is not inside a known skill dir', () => {
    expect(
      extractSkillName('/repo/docs/skills/pr-changelog/SKILL.md'),
    ).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractSkillName('')).toBeNull();
  });

  it('returns null when SKILL.md is at the wrong nesting level', () => {
    expect(extractSkillName('.agents/skills/SKILL.md')).toBeNull();
  });
});

describe('parseAgent', () => {
  it('returns "cursor" when --agent cursor is passed', () => {
    expect(parseAgent(['--agent', 'cursor'])).toBe('cursor');
  });

  it('returns "claude" when --agent claude is passed', () => {
    expect(parseAgent(['--agent', 'claude'])).toBe('claude');
  });

  it('passes through any agent value without validation', () => {
    expect(parseAgent(['--agent', 'windsurf'])).toBe('windsurf');
    expect(parseAgent(['--agent', 'codex'])).toBe('codex');
  });

  it('returns undefined when --agent flag is missing', () => {
    expect(parseAgent([])).toBeUndefined();
  });

  it('returns undefined when --agent value is missing', () => {
    expect(parseAgent(['--agent'])).toBeUndefined();
  });
});

describe('getFilePath', () => {
  it('reads file_path at the top level (Cursor shape)', () => {
    expect(
      getFilePath({ file_path: '/repo/.agents/skills/foo/SKILL.md' }),
    ).toBe('/repo/.agents/skills/foo/SKILL.md');
  });

  it('reads tool_input.file_path (Claude shape)', () => {
    expect(
      getFilePath({
        tool_input: { file_path: '/repo/.claude/skills/foo/SKILL.md' },
      }),
    ).toBe('/repo/.claude/skills/foo/SKILL.md');
  });

  it('prefers tool_input.file_path when both are present', () => {
    expect(
      getFilePath({
        file_path: '/repo/a.md',
        tool_input: { file_path: '/repo/b.md' },
      }),
    ).toBe('/repo/b.md');
  });

  it('returns null when the payload has no file path in either location', () => {
    expect(getFilePath({})).toBeNull();
    expect(getFilePath({ tool_input: {} })).toBeNull();
  });

  it('returns null for non-string file_path values', () => {
    expect(getFilePath({ file_path: 42 })).toBeNull();
    expect(getFilePath({ tool_input: { file_path: 42 } })).toBeNull();
  });
});

describe('main (cursor)', () => {
  it('allows the read and tracks the skill when path matches', async () => {
    jest
      .mocked(createInterface)
      .mockReturnValue(
        makeRl(
          stdinPayload({ file_path: '/repo/.agents/skills/pr-create/SKILL.md' }),
        ) as ReturnType<typeof createInterface>,
      );

    await main(['--agent', 'cursor']);

    expect(stdoutWrite).toHaveBeenCalledWith('{"permission":"allow"}\n');
    expect(execFileSync).toHaveBeenCalledWith(
      'yarn',
      expect.arrayContaining([
        '--tool',
        'skill:pr-create',
        '--agent',
        'cursor',
      ]),
      { stdio: 'ignore' },
    );
  });

  it('allows the read without tracking when path is not a skill file', async () => {
    jest
      .mocked(createInterface)
      .mockReturnValue(
        makeRl(
          stdinPayload({ file_path: '/repo/src/components/Button.tsx' }),
        ) as ReturnType<typeof createInterface>,
      );

    await main(['--agent', 'cursor']);

    expect(stdoutWrite).toHaveBeenCalledWith('{"permission":"allow"}\n');
    expect(execFileSync).not.toHaveBeenCalled();
  });

  it('allows the read without tracking when stdin is malformed JSON', async () => {
    jest
      .mocked(createInterface)
      .mockReturnValue(
        makeRl(['not valid json }{']) as ReturnType<typeof createInterface>,
      );

    await main(['--agent', 'cursor']);

    expect(stdoutWrite).toHaveBeenCalledWith('{"permission":"allow"}\n');
    expect(execFileSync).not.toHaveBeenCalled();
  });

  it('allows the read even when tracking subprocess fails', async () => {
    jest
      .mocked(createInterface)
      .mockReturnValue(
        makeRl(
          stdinPayload({ file_path: '/repo/.agents/skills/pr-create/SKILL.md' }),
        ) as ReturnType<typeof createInterface>,
      );
    jest.mocked(execFileSync).mockImplementation(() => {
      throw new Error('spawn failed');
    });

    await main(['--agent', 'cursor']);

    expect(stdoutWrite).toHaveBeenCalledWith('{"permission":"allow"}\n');
  });

  it('passes the correct full argument list to execFileSync', async () => {
    jest
      .mocked(createInterface)
      .mockReturnValue(
        makeRl(
          stdinPayload({
            file_path: '/repo/.agents/skills/tsc-branch-check/SKILL.md',
          }),
        ) as ReturnType<typeof createInterface>,
      );

    await main(['--agent', 'cursor']);

    const [cmd, args] = jest.mocked(execFileSync).mock.calls[0] as [
      string,
      string[],
      unknown,
    ];
    expect(cmd).toBe('yarn');
    expect(args).toEqual(
      expect.arrayContaining([
        'tsx',
        '--tool',
        'skill:tsc-branch-check',
        '--type',
        'skill',
        '--event',
        'start',
        '--agent',
        'cursor',
      ]),
    );
  });
});

describe('main (claude)', () => {
  it('tracks the skill from a PreToolUse Read payload targeting .claude/skills', async () => {
    jest
      .mocked(createInterface)
      .mockReturnValue(
        makeRl(
          stdinPayload({
            tool_name: 'Read',
            tool_input: {
              file_path:
                '/repo/.claude/skills/pr-changelog/SKILL.md',
            },
          }),
        ) as ReturnType<typeof createInterface>,
      );

    await main(['--agent', 'claude']);

    expect(execFileSync).toHaveBeenCalledWith(
      'yarn',
      expect.arrayContaining([
        '--tool',
        'skill:pr-changelog',
        '--agent',
        'claude',
      ]),
      { stdio: 'ignore' },
    );
    expect(stdoutWrite).toHaveBeenCalledWith('{"permission":"allow"}\n');
  });

  it('does not track when the Read target is not a skill file', async () => {
    jest
      .mocked(createInterface)
      .mockReturnValue(
        makeRl(
          stdinPayload({
            tool_name: 'Read',
            tool_input: { file_path: '/repo/package.json' },
          }),
        ) as ReturnType<typeof createInterface>,
      );

    await main(['--agent', 'claude']);

    expect(execFileSync).not.toHaveBeenCalled();
    expect(stdoutWrite).toHaveBeenCalledWith('{"permission":"allow"}\n');
  });

  it('does not track when tool_input is missing entirely', async () => {
    jest
      .mocked(createInterface)
      .mockReturnValue(
        makeRl(stdinPayload({ tool_name: 'Read' })) as ReturnType<
          typeof createInterface
        >,
      );

    await main(['--agent', 'claude']);

    expect(execFileSync).not.toHaveBeenCalled();
    expect(stdoutWrite).toHaveBeenCalledWith('{"permission":"allow"}\n');
  });
});

describe('main (no --agent flag)', () => {
  it('still tracks the skill and emits allow, omitting the --agent CLI arg', async () => {
    jest
      .mocked(createInterface)
      .mockReturnValue(
        makeRl(
          stdinPayload({ file_path: '/repo/.agents/skills/pr-create/SKILL.md' }),
        ) as ReturnType<typeof createInterface>,
      );

    await main([]);

    expect(stdoutWrite).toHaveBeenCalledWith('{"permission":"allow"}\n');
    const args = jest.mocked(execFileSync).mock.calls[0][1] as string[];
    expect(args).toEqual(expect.arrayContaining(['--tool', 'skill:pr-create']));
    expect(args).not.toContain('--agent');
  });

  it('emits allow and does not track when input is not a skill file', async () => {
    jest
      .mocked(createInterface)
      .mockReturnValue(
        makeRl(stdinPayload({ file_path: '/repo/anything' })) as ReturnType<
          typeof createInterface
        >,
      );

    await main([]);

    expect(stdoutWrite).toHaveBeenCalledWith('{"permission":"allow"}\n');
    expect(execFileSync).not.toHaveBeenCalled();
  });
});
