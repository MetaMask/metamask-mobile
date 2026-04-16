jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
}));

jest.mock('readline', () => ({
  createInterface: jest.fn(),
}));

import { execFileSync } from 'child_process';
import { createInterface } from 'readline';
import { extractSkillName, main } from './cursor-hook-skill-tracking';

// Returns an object that satisfies the `for await...of` loop in main()
function makeRl(lines: string[]) {
  return {
    async *[Symbol.asyncIterator] () {
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
  it('extracts the skill name from a canonical skill path', () => {
    expect(
      extractSkillName('/repo/.agents/skills/worktree-create/SKILL.md'),
    ).toBe('worktree-create');
  });

  it('extracts the skill name when the path has no leading slash', () => {
    expect(
      extractSkillName('.agents/skills/pr-create/SKILL.md'),
    ).toBe('pr-create');
  });

  it('returns null for a path that does not match the skill pattern', () => {
    expect(extractSkillName('/repo/src/components/Button.tsx')).toBeNull();
  });

  it('returns null for a SKILL.md that is not inside .agents/skills/', () => {
    expect(extractSkillName('/repo/.claude/skills/pr-changelog/SKILL.md')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractSkillName('')).toBeNull();
  });

  it('returns null when SKILL.md is at the wrong nesting level', () => {
    // Missing the skill name directory
    expect(extractSkillName('.agents/skills/SKILL.md')).toBeNull();
  });
});

describe('main', () => {
  it('outputs {"permission":"allow"} and calls execFileSync for a matching skill path', async () => {
    jest.mocked(createInterface).mockReturnValue(
      makeRl(stdinPayload({ file_path: '/repo/.agents/skills/pr-create/SKILL.md' })) as ReturnType<typeof createInterface>,
    );

    await main();

    expect(stdoutWrite).toHaveBeenCalledWith('{"permission":"allow"}\n');
    expect(execFileSync).toHaveBeenCalledWith(
      'yarn',
      expect.arrayContaining(['--tool', 'skill:pr-create', '--agent', 'cursor']),
      { stdio: 'ignore' },
    );
  });

  it('outputs allow and does NOT call execFileSync for a non-skill path', async () => {
    jest.mocked(createInterface).mockReturnValue(
      makeRl(stdinPayload({ file_path: '/repo/src/components/Button.tsx' })) as ReturnType<typeof createInterface>,
    );

    await main();

    expect(stdoutWrite).toHaveBeenCalledWith('{"permission":"allow"}\n');
    expect(execFileSync).not.toHaveBeenCalled();
  });

  it('outputs allow and does NOT call execFileSync when file_path is absent', async () => {
    jest.mocked(createInterface).mockReturnValue(
      makeRl(stdinPayload({ other: 'field' })) as ReturnType<typeof createInterface>,
    );

    await main();

    expect(stdoutWrite).toHaveBeenCalledWith('{"permission":"allow"}\n');
    expect(execFileSync).not.toHaveBeenCalled();
  });

  it('outputs allow and does NOT call execFileSync when file_path is not a string', async () => {
    jest.mocked(createInterface).mockReturnValue(
      makeRl(stdinPayload({ file_path: 42 })) as ReturnType<typeof createInterface>,
    );

    await main();

    expect(stdoutWrite).toHaveBeenCalledWith('{"permission":"allow"}\n');
    expect(execFileSync).not.toHaveBeenCalled();
  });

  it('outputs allow even when stdin contains malformed JSON', async () => {
    jest.mocked(createInterface).mockReturnValue(
      makeRl(['not valid json }{']) as ReturnType<typeof createInterface>,
    );

    await main();

    expect(stdoutWrite).toHaveBeenCalledWith('{"permission":"allow"}\n');
    expect(execFileSync).not.toHaveBeenCalled();
  });

  it('outputs allow even when execFileSync throws (best-effort tracking)', async () => {
    jest.mocked(createInterface).mockReturnValue(
      makeRl(stdinPayload({ file_path: '/repo/.agents/skills/pr-create/SKILL.md' })) as ReturnType<typeof createInterface>,
    );
    jest.mocked(execFileSync).mockImplementation(() => {
      throw new Error('spawn failed');
    });

    await main();

    expect(stdoutWrite).toHaveBeenCalledWith('{"permission":"allow"}\n');
  });

  it('passes the correct full argument list to execFileSync', async () => {
    jest.mocked(createInterface).mockReturnValue(
      makeRl(stdinPayload({ file_path: '/repo/.agents/skills/tsc-branch-check/SKILL.md' })) as ReturnType<typeof createInterface>,
    );

    await main();

    const [cmd, args] = jest.mocked(execFileSync).mock.calls[0] as [string, string[], unknown];
    expect(cmd).toBe('yarn');
    expect(args).toEqual(
      expect.arrayContaining([
        'tsx',
        '--tool', 'skill:tsc-branch-check',
        '--type', 'skill',
        '--event', 'start',
        '--agent', 'cursor',
      ]),
    );
  });
});
