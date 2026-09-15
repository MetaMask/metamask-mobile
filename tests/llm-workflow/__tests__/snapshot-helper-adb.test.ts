/* eslint-disable import-x/no-nodejs-modules */
import {
  execFile,
  type ChildProcess,
  type ExecFileException,
} from 'node:child_process';

import { createAndroidSnapshotAdbExecutor } from '../android/snapshot-helper-adb';

jest.mock('node:child_process', () => ({ execFile: jest.fn() }));

const execFileMock = jest.mocked(execFile);
const SERIAL = 'emulator-5554';

type ExecFileCallback = (
  error: ExecFileException | null,
  stdout: string | Buffer,
  stderr: string | Buffer,
) => void;

function mockExecFileResult(
  error: ExecFileException | null,
  stdout: string | Buffer = '',
  stderr: string | Buffer = '',
): void {
  execFileMock.mockImplementationOnce((...args: unknown[]) => {
    const callback = args.at(-1) as ExecFileCallback;
    callback(error, stdout, stderr);
    return { stdin: { end: jest.fn() } } as unknown as ChildProcess;
  });
}

function createExecError(
  message: string,
  code: string | number,
  properties: Partial<ExecFileException> = {},
): ExecFileException {
  return Object.assign(new Error(message), { code }, properties);
}

describe('createAndroidSnapshotAdbExecutor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns text output for a successful command', async () => {
    mockExecFileResult(null, 'package:io.metamask\n', '');
    const execute = createAndroidSnapshotAdbExecutor(SERIAL);

    const result = await execute(['shell', 'pm', 'path', 'io.metamask']);

    expect(result).toEqual({
      exitCode: 0,
      stdout: 'package:io.metamask\n',
      stderr: '',
      stdoutBuffer: undefined,
    });
  });

  it('preserves binary stdout when requested', async () => {
    const output = Buffer.from([0, 1, 255]);
    mockExecFileResult(null, output, Buffer.from('warning'));
    const execute = createAndroidSnapshotAdbExecutor(SERIAL);

    const result = await execute(['exec-out', 'screencap'], {
      binaryStdout: true,
    });

    expect(result.stdoutBuffer).toEqual(output);
    expect(result.stderr).toBe('warning');
  });

  it('returns an ordinary numeric non-zero exit when failure is allowed', async () => {
    mockExecFileResult(createExecError('command failed', 7), '', 'not found');
    const execute = createAndroidSnapshotAdbExecutor(SERIAL);

    const result = await execute(['shell', 'false'], { allowFailure: true });

    expect(result).toMatchObject({ exitCode: 7, stderr: 'not found' });
  });

  it('rejects an ordinary numeric non-zero exit when failure is not allowed', async () => {
    mockExecFileResult(createExecError('command failed', 7), '', 'not found');
    const execute = createAndroidSnapshotAdbExecutor(SERIAL);

    const result = execute(['shell', 'false']);

    await expect(result).rejects.toThrow('failed (exit 7): not found');
  });

  it.each([
    [
      'timeout',
      createExecError('Command timed out', 'ETIMEDOUT', { killed: true }),
    ],
    [
      'abort',
      Object.assign(createExecError('The operation was aborted', 'ABORT_ERR'), {
        name: 'AbortError',
      }),
    ],
    ['spawn ENOENT', createExecError('spawn adb ENOENT', 'ENOENT')],
    [
      'maxBuffer overflow',
      createExecError(
        'stdout maxBuffer length exceeded',
        'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',
      ),
    ],
    [
      'killed numeric exit',
      createExecError('Command was killed', 1, { killed: true }),
    ],
    [
      'signaled numeric exit',
      createExecError('Command received a signal', 1, { signal: 'SIGTERM' }),
    ],
  ])(
    'rejects %s failures even when failure is allowed',
    async (_name, error) => {
      mockExecFileResult(error);
      const execute = createAndroidSnapshotAdbExecutor(SERIAL);

      const result = execute(['shell', 'command'], { allowFailure: true });

      await expect(result).rejects.toThrow(error.message);
    },
  );
});
