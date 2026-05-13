/* eslint-disable import-x/no-nodejs-modules */
jest.mock('child_process', () => {
  const actual =
    jest.requireActual<typeof import('child_process')>('child_process');
  return {
    ...actual,
    execFile: jest.fn(),
  };
});

import { execFile } from 'child_process';
import {
  parseOpensslSubjectHashOldOutput,
  setupAndroidProxy,
  teardownAndroidProxy,
} from './AndroidProxySetup';

const execFileMock = execFile as unknown as jest.Mock;

interface CapturedCall {
  cmd: string;
  args: string[];
}

function mockExecFileSuccess(stdout: string): void {
  execFileMock.mockImplementation(
    (
      _cmd: string,
      _args: string[],
      _opts: unknown,
      cb: (err: unknown, result: { stdout: string; stderr: string }) => void,
    ) => {
      cb(null, { stdout, stderr: '' });
    },
  );
}

/**
 * Routes specific commands to different stdouts. Required because the helper
 * now branches on `adb shell whoami` output before deciding whether to run
 * `adb root` + `adb wait-for-device`.
 */
function mockExecFileBySubcommand(stdoutMap: {
  openssl?: string;
  whoami?: string;
  default?: string;
}): void {
  execFileMock.mockImplementation(
    (
      cmd: string,
      args: string[],
      _opts: unknown,
      cb: (err: unknown, result: { stdout: string; stderr: string }) => void,
    ) => {
      let stdout = stdoutMap.default ?? '';
      if (cmd === 'openssl') {
        stdout = stdoutMap.openssl ?? '';
      } else if (cmd === 'adb' && args.includes('whoami')) {
        stdout = stdoutMap.whoami ?? '';
      }
      cb(null, { stdout, stderr: '' });
    },
  );
}

function capturedCalls(): CapturedCall[] {
  return execFileMock.mock.calls.map((call: unknown[]) => ({
    cmd: call[0] as string,
    args: call[1] as string[],
  }));
}

describe('parseOpensslSubjectHashOldOutput', () => {
  it('returns the hash from a clean openssl output', () => {
    expect(parseOpensslSubjectHashOldOutput('e5c3944b\n')).toBe('e5c3944b');
  });

  it('trims surrounding whitespace', () => {
    expect(parseOpensslSubjectHashOldOutput('  abcd1234  \n')).toBe('abcd1234');
  });

  it('throws when the output is not an 8-char hex string', () => {
    expect(() => parseOpensslSubjectHashOldOutput('not-a-hash')).toThrow(
      /Invalid subject hash output/,
    );
  });

  it('throws when the hash is the wrong length', () => {
    expect(() => parseOpensslSubjectHashOldOutput('abc\n')).toThrow(
      /Invalid subject hash output/,
    );
  });
});

describe('setupAndroidProxy', () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  it('runs adb root + wait-for-device when the emulator is not yet root', async () => {
    mockExecFileBySubcommand({
      openssl: 'e5c3944b\n',
      whoami: 'shell\n',
    });

    await setupAndroidProxy({
      udid: 'emulator-5554',
      caCertPath: '/tmp/ca.pem',
      proxyHost: '10.0.2.2',
      proxyPort: 8000,
    });

    const calls = capturedCalls();

    expect(calls[0]).toEqual({
      cmd: 'openssl',
      args: ['x509', '-in', '/tmp/ca.pem', '-subject_hash_old', '-noout'],
    });

    expect(calls[1]).toEqual({
      cmd: 'adb',
      args: ['-s', 'emulator-5554', 'shell', 'whoami'],
    });

    expect(calls[2]).toEqual({
      cmd: 'adb',
      args: ['-s', 'emulator-5554', 'root'],
    });

    expect(calls[3]).toEqual({
      cmd: 'adb',
      args: ['-s', 'emulator-5554', 'wait-for-device'],
    });

    expect(calls[4]).toEqual({
      cmd: 'adb',
      args: [
        '-s',
        'emulator-5554',
        'push',
        '/tmp/ca.pem',
        '/data/local/tmp/e5c3944b.0',
      ],
    });

    expect(calls[5]).toEqual({
      cmd: 'adb',
      args: [
        '-s',
        'emulator-5554',
        'shell',
        'mkdir',
        '-p',
        '/data/misc/user/0/cacerts-added',
      ],
    });

    expect(calls[6]).toEqual({
      cmd: 'adb',
      args: [
        '-s',
        'emulator-5554',
        'shell',
        'mv',
        '/data/local/tmp/e5c3944b.0',
        '/data/misc/user/0/cacerts-added/e5c3944b.0',
      ],
    });

    expect(calls[7]).toEqual({
      cmd: 'adb',
      args: [
        '-s',
        'emulator-5554',
        'shell',
        'chmod',
        '644',
        '/data/misc/user/0/cacerts-added/e5c3944b.0',
      ],
    });

    expect(calls[8]).toEqual({
      cmd: 'adb',
      args: [
        '-s',
        'emulator-5554',
        'shell',
        'settings',
        'put',
        'global',
        'http_proxy',
        '10.0.2.2:8000',
      ],
    });

    expect(calls).toHaveLength(9);
  });

  it('skips adb root + wait-for-device when the emulator is already root', async () => {
    mockExecFileBySubcommand({
      openssl: 'e5c3944b\n',
      whoami: 'root\n',
    });

    await setupAndroidProxy({
      udid: 'emulator-5554',
      caCertPath: '/tmp/ca.pem',
      proxyHost: '10.0.2.2',
      proxyPort: 8000,
    });

    const calls = capturedCalls();
    const cmdNames = calls.map((c) => `${c.cmd} ${c.args.join(' ')}`);

    expect(cmdNames).not.toContain('adb -s emulator-5554 root');
    expect(cmdNames).not.toContain('adb -s emulator-5554 wait-for-device');

    expect(calls[0]).toEqual({
      cmd: 'openssl',
      args: ['x509', '-in', '/tmp/ca.pem', '-subject_hash_old', '-noout'],
    });

    expect(calls[1]).toEqual({
      cmd: 'adb',
      args: ['-s', 'emulator-5554', 'shell', 'whoami'],
    });

    // Next call after whoami should be push, not root.
    expect(calls[2]).toEqual({
      cmd: 'adb',
      args: [
        '-s',
        'emulator-5554',
        'push',
        '/tmp/ca.pem',
        '/data/local/tmp/e5c3944b.0',
      ],
    });

    expect(calls).toHaveLength(7);
  });
});

describe('teardownAndroidProxy', () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  it('clears the http_proxy property on the named emulator', async () => {
    mockExecFileSuccess('');

    await teardownAndroidProxy({ udid: 'emulator-5554' });

    expect(capturedCalls()).toEqual([
      {
        cmd: 'adb',
        args: [
          '-s',
          'emulator-5554',
          'shell',
          'settings',
          'put',
          'global',
          'http_proxy',
          ':0',
        ],
      },
    ]);
  });
});
