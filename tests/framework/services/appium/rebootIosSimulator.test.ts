jest.mock('child_process', () => {
  const actual =
    jest.requireActual<typeof import('child_process')>('child_process');
  return {
    ...actual,
    exec: jest.fn(),
  };
});

import { rebootIosSimulator } from './EmulatorHelpers.ts';

const execMock = jest.requireMock('child_process').exec as jest.Mock;
const UDID = 'SIM-UDID';

const devicesJson = (state: string) =>
  JSON.stringify({
    devices: {
      'com.apple.CoreSimulator.SimRuntime.iOS-18-0': [
        { udid: UDID, state, name: 'iPhone' },
      ],
    },
  });

describe('rebootIosSimulator', () => {
  const originalShutdownTimeout = process.env.IOS_SIMULATOR_SHUTDOWN_TIMEOUT_MS;

  beforeEach(() => {
    // Dynamic env access stays runtime-readable under Jest. The post-boot
    // settle delay is a static process.env read, so fake timers skip it.
    process.env.IOS_SIMULATOR_SHUTDOWN_TIMEOUT_MS = '0';
    jest.useFakeTimers();
    execMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
    if (originalShutdownTimeout === undefined) {
      delete process.env.IOS_SIMULATOR_SHUTDOWN_TIMEOUT_MS;
    } else {
      process.env.IOS_SIMULATOR_SHUTDOWN_TIMEOUT_MS = originalShutdownTimeout;
    }
  });

  function reply(state: string, shutdownError?: Error) {
    execMock.mockImplementation(
      (
        cmd: string,
        _options: unknown,
        callback: (error: Error | null, stdout: string, stderr: string) => void,
      ) => {
        if (cmd.includes('simctl shutdown')) {
          callback(shutdownError ?? null, '', '');
          return undefined;
        }
        if (cmd.includes('simctl list devices')) {
          callback(null, devicesJson(state), '');
          return undefined;
        }
        if (cmd.includes('simctl bootstatus') || cmd.includes('simctl boot ')) {
          callback(null, '', '');
          return undefined;
        }
        callback(new Error(`unexpected command: ${cmd}`), '', '');
        return undefined;
      },
    );
  }

  it('shuts the simulator down and boots it again', async () => {
    reply('Shutdown');

    const pending = rebootIosSimulator(UDID);
    await jest.runAllTimersAsync();
    await pending;

    const commands = execMock.mock.calls.map((call) => String(call[0]));
    expect(commands.some((cmd) => cmd.includes('simctl shutdown'))).toBe(true);
    expect(commands.some((cmd) => cmd.includes(`simctl boot "${UDID}"`))).toBe(
      true,
    );
    expect(
      commands.some((cmd) => cmd.includes(`simctl bootstatus "${UDID}"`)),
    ).toBe(true);
  });

  it('throws when shutdown leaves the simulator booted', async () => {
    reply('Booted', new Error('Unable to shutdown device'));

    await expect(rebootIosSimulator(UDID)).rejects.toThrow(
      /still Booted after shutdown/,
    );

    const commands = execMock.mock.calls.map((call) => String(call[0]));
    expect(commands.some((cmd) => cmd.includes('simctl boot '))).toBe(false);
  });

  it('boots when shutdown fails because the simulator is already down', async () => {
    reply(
      'Shutdown',
      new Error('Unable to shutdown device in current state: Shutdown'),
    );

    const pending = rebootIosSimulator(UDID);
    await jest.runAllTimersAsync();
    await pending;

    const commands = execMock.mock.calls.map((call) => String(call[0]));
    expect(commands.some((cmd) => cmd.includes(`simctl boot "${UDID}"`))).toBe(
      true,
    );
  });
});
