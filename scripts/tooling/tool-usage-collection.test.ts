jest.mock('./events', () => ({
  trackEvent: jest.fn(),
}));

import { trackEvent } from './events';
import { parseArgs, main } from './tool-usage-collection';

afterEach(() => {
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
    ).toThrow('--event must be "start" or "end"');
  });

  it('throws when --event is missing entirely', () => {
    expect(() => parseArgs(['--tool', 't', '--type', 'skill'])).toThrow(
      '--event must be "start" or "end"',
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
      tool_name: 'yarn:setup:expo',
      tool_type: 'yarn_script',
      event_type: 'start',
      agent_vendor: 'claude',
      success: undefined,
      duration_ms: undefined,
    });
  });

  it('writes the parse error to stderr and exits 1 when args are invalid', async () => {
    process.argv = ['node', 'tool-usage-collection.ts'];

    const mockExit = jest
      .spyOn(process, 'exit')
      .mockImplementation((_code?: string | number | null) => undefined as never);

    await main();

    expect(stderrWrite).toHaveBeenCalledWith(
      expect.stringContaining('--tool is required'),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(trackEvent).not.toHaveBeenCalled();

    mockExit.mockRestore();
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
