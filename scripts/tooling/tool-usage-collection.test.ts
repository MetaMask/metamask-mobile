jest.mock('./events', () => ({
  trackEvent: jest.fn(),
}));

import { trackEvent } from './events';
import { parseArgs, main } from './tool-usage-collection';

let mockExit: jest.SpyInstance;

beforeEach(() => {
  // Mirror real process.exit behaviour: throw so no code ever falls through past
  // a process.exit() call, even when future branches are added to the CLI
  mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit(${code})`);
  });
});

afterEach(() => {
  mockExit.mockRestore();
  jest.mocked(trackEvent).mockReset();
});

describe('parseArgs', () => {
  it('parses all required flags', () => {
    expect(
      parseArgs(['--tool', 'yarn:setup', '--type', 'yarn_script', '--event', 'start']),
    ).toEqual({ tool: 'yarn:setup', type: 'yarn_script', event: 'start', verbose: false });
  });

  it('parses optional --agent flag', () => {
    const args = parseArgs([
      '--tool', 'skill:worktree-create',
      '--type', 'skill',
      '--event', 'start',
      '--agent', 'claude',
    ]);
    expect(args.agent).toBe('claude');
  });

  it('parses optional --session flag', () => {
    const args = parseArgs([
      '--tool', 'yarn:setup',
      '--type', 'yarn_script',
      '--event', 'start',
      '--session', 'session-uuid-123',
    ]);
    expect(args.session).toBe('session-uuid-123');
  });

  it('parses --success true as boolean true', () => {
    const args = parseArgs([
      '--tool', 't', '--type', 'skill', '--event', 'end', '--success', 'true',
    ]);
    expect(args.success).toBe(true);
  });

  it('parses --success false as boolean false', () => {
    const args = parseArgs([
      '--tool', 't', '--type', 'skill', '--event', 'end', '--success', 'false',
    ]);
    expect(args.success).toBe(false);
  });

  it('parses --duration as an integer', () => {
    const args = parseArgs([
      '--tool', 't', '--type', 'skill', '--event', 'end', '--duration', '4200',
    ]);
    expect(args.duration).toBe(4200);
  });

  it('parses --verbose flag', () => {
    const args = parseArgs([
      '--tool', 't', '--type', 'skill', '--event', 'start', '--verbose',
    ]);
    expect(args.verbose).toBe(true);
  });

  it('prints usage and exits 0 on --help', () => {
    const mockStdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    expect(() => parseArgs(['--help'])).toThrow('process.exit(0)');
    expect(mockStdout).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
    expect(mockExit).toHaveBeenCalledWith(0);

    mockStdout.mockRestore();
  });

  it('throws when --tool is missing', () => {
    expect(() => parseArgs(['--type', 'skill', '--event', 'start'])).toThrow(
      '--tool is required',
    );
  });

  it('throws when --type is missing', () => {
    expect(() => parseArgs(['--tool', 't', '--event', 'start'])).toThrow(
      '--type is required',
    );
  });

  it('throws when --event has an invalid value', () => {
    expect(() =>
      parseArgs(['--tool', 't', '--type', 'skill', '--event', 'middle']),
    ).toThrow('--event must be "start", "end", or "interrupted"');
  });

  it('throws when --event is missing entirely', () => {
    expect(() => parseArgs(['--tool', 't', '--type', 'skill'])).toThrow(
      '--event must be "start", "end", or "interrupted"',
    );
  });

  it('throws when --success has an invalid value', () => {
    expect(() =>
      parseArgs(['--tool', 't', '--type', 'skill', '--event', 'end', '--success', 'maybe']),
    ).toThrow('--success must be "true" or "false"');
  });

  it('throws when --duration is not a valid integer', () => {
    expect(() =>
      parseArgs(['--tool', 't', '--type', 'skill', '--event', 'end', '--duration', 'abc']),
    ).toThrow('--duration must be a non-negative integer');
  });

  it('throws when --duration is negative', () => {
    expect(() =>
      parseArgs(['--tool', 't', '--type', 'skill', '--event', 'end', '--duration', '-1']),
    ).toThrow('--duration must be a non-negative integer');
  });

  it('throws when --duration is a float', () => {
    expect(() =>
      parseArgs(['--tool', 't', '--type', 'skill', '--event', 'end', '--duration', '1.5']),
    ).toThrow('--duration must be a non-negative integer');
  });

  it('throws when a flag is missing its value', () => {
    expect(() =>
      parseArgs(['--tool', 't', '--type', 'skill', '--event', 'start', '--agent']),
    ).toThrow('--agent requires a value');
  });

  it('throws when a flag value is itself a flag', () => {
    expect(() =>
      parseArgs(['--tool', 't', '--type', 'skill', '--event', 'start', '--agent', '--verbose']),
    ).toThrow('--agent requires a value');
  });
});

describe('main', () => {
  let savedArgv: string[];
  let stderrWrite: jest.SpyInstance;
  let stdoutWrite: jest.SpyInstance;

  beforeEach(() => {
    savedArgv = process.argv;
    stderrWrite = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    stdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    process.argv = savedArgv;
    stderrWrite.mockRestore();
    stdoutWrite.mockRestore();
  });

  it('calls trackEvent with the parsed arguments', async () => {
    process.argv = [
      'node', 'tool-usage-collection.ts',
      '--tool', 'yarn:setup:expo',
      '--type', 'yarn_script',
      '--event', 'start',
      '--agent', 'claude',
    ];

    await main();

    expect(trackEvent).toHaveBeenCalledWith({
      session_id: undefined,
      tool_name: 'yarn:setup:expo',
      tool_type: 'yarn_script',
      event_type: 'start',
      agent_vendor: 'claude',
      success: undefined,
      duration_ms: undefined,
    });
  });

  it('passes --session through to trackEvent', async () => {
    process.argv = [
      'node', 'tool-usage-collection.ts',
      '--tool', 'yarn:setup:expo',
      '--type', 'yarn_script',
      '--event', 'start',
      '--session', 'session-uuid-123',
    ];

    await main();

    expect(trackEvent).toHaveBeenCalledWith({
      session_id: 'session-uuid-123',
      tool_name: 'yarn:setup:expo',
      tool_type: 'yarn_script',
      event_type: 'start',
      agent_vendor: undefined,
      success: undefined,
      duration_ms: undefined,
    });
  });

  it('writes the parse error to stderr and exits 1 when args are invalid', async () => {
    process.argv = ['node', 'tool-usage-collection.ts'];

    // process.exit throws globally, so main() rejects — check stderr before asserting the exit
    await expect(main()).rejects.toThrow('process.exit(1)');

    expect(stderrWrite).toHaveBeenCalledWith(
      expect.stringContaining('--tool is required'),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('produces no stdout output by default (silent for hooks)', async () => {
    process.argv = [
      'node', 'tool-usage-collection.ts',
      '--tool', 'yarn:setup', '--type', 'yarn_script', '--event', 'start',
    ];

    await main();

    expect(stdoutWrite).not.toHaveBeenCalled();
  });

  it('writes a TOON confirmation and hint to stdout when --verbose is set', async () => {
    process.argv = [
      'node', 'tool-usage-collection.ts',
      '--tool', 'yarn:setup', '--type', 'yarn_script', '--event', 'start',
      '--verbose',
    ];

    await main();

    const output = stdoutWrite.mock.calls.map((c) => c[0] as string).join('');
    expect(output).toContain('tracked: tool=yarn:setup event=start');
    expect(output).toContain('hint[]');
  });
});
