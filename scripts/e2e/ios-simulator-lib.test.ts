import {
  iosPoolSimulatorName,
  parseIosDevicePoolSize,
  prepareIosSimulatorPool,
} from './ios-simulator-lib.mjs';

interface ExecFileResult {
  stdout: string;
  stderr: string;
}
type ExecFileImpl = (
  command: string,
  args: readonly string[],
) => Promise<ExecFileResult>;

const BASE_NAME = 'iPhone 16 Pro';
const BASE_UDID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CLONE_UDID_0 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CLONE_UDID_1 = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

interface RecordedCall {
  command: string;
  args: readonly string[];
}

function makeListDevicesJson(
  devices: { name: string; udid: string; state: string }[],
): string {
  return JSON.stringify({
    devices: {
      'com.apple.CoreSimulator.SimRuntime.iOS-18-0': devices,
    },
  });
}

function createFakeExecFile(
  listDevicesJson: string,
  cloneUdids: string[],
): { execFileImpl: ExecFileImpl; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  let cloneIndex = 0;

  const execFileImpl: ExecFileImpl = async (command, args) => {
    calls.push({ command, args });

    if (command !== 'xcrun') {
      throw new Error(`Unexpected command: ${command}`);
    }

    const [tool, ...rest] = args;
    if (tool !== 'simctl') {
      throw new Error(`Unexpected xcrun tool: ${tool}`);
    }

    const [subcommand, ...subArgs] = rest;

    switch (subcommand) {
      case 'list':
        return { stdout: listDevicesJson, stderr: '' };
      case 'shutdown':
        return { stdout: '', stderr: '' };
      case 'delete':
        return { stdout: '', stderr: '' };
      case 'clone': {
        const newUdid = cloneUdids[cloneIndex];
        cloneIndex += 1;
        if (!newUdid) {
          throw new Error('No more clone UDIDs configured for fake execFile');
        }
        return { stdout: `${newUdid}\n`, stderr: '' };
      }
      case 'boot':
        return { stdout: '', stderr: '' };
      case 'bootstatus':
        return { stdout: 'Device already booted\n', stderr: '' };
      default:
        throw new Error(`Unexpected simctl subcommand: ${subcommand}`);
    }
  };

  return { execFileImpl, calls };
}

function simctlArgs(calls: RecordedCall[], subcommand: string): string[] {
  const match = calls.find(
    (call) => call.command === 'xcrun' && call.args[1] === subcommand,
  );
  return match?.args.slice(2) ?? [];
}

describe('iosPoolSimulatorName', () => {
  it('matches the Task 1 TypeScript naming contract', () => {
    expect(iosPoolSimulatorName('iPhone 16 Pro', 0)).toBe(
      'iPhone 16 Pro Appium Pool 0',
    );
    expect(iosPoolSimulatorName('iPhone 16 Pro', 1)).toBe(
      'iPhone 16 Pro Appium Pool 1',
    );
  });
});

describe('parseIosDevicePoolSize', () => {
  it.each([
    ['unset', undefined],
    ['empty', ''],
    ['whitespace', '   '],
  ])('defaults %s input to one', (_label, rawValue) => {
    const poolSize = parseIosDevicePoolSize(rawValue);

    expect(poolSize).toBe(1);
  });

  it('parses a complete positive-integer string', () => {
    const poolSize = parseIosDevicePoolSize(' 2 ');

    expect(poolSize).toBe(2);
  });

  it.each(['not-a-number', '1.5', '2workers', '0', '-1'])(
    'rejects explicit non-positive-integer input: %s',
    (rawValue) => {
      expect(() => parseIosDevicePoolSize(rawValue)).toThrow(
        'IOS_DEVICE_POOL_SIZE must be a positive integer',
      );
    },
  );
});

describe('prepareIosSimulatorPool', () => {
  const originalSettleMs = process.env.IOS_SIMULATOR_POST_BOOT_SETTLE_MS;

  beforeEach(() => {
    process.env.IOS_SIMULATOR_POST_BOOT_SETTLE_MS = '0';
  });

  afterEach(() => {
    if (originalSettleMs === undefined) {
      delete process.env.IOS_SIMULATOR_POST_BOOT_SETTLE_MS;
    } else {
      process.env.IOS_SIMULATOR_POST_BOOT_SETTLE_MS = originalSettleMs;
    }
  });

  it.each([
    ['zero', 0],
    ['fractional', 1.5],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('rejects non-positive-integer pool size: %s', async (_label, poolSize) => {
    const { execFileImpl } = createFakeExecFile(
      makeListDevicesJson([]),
      [],
    );

    await expect(
      prepareIosSimulatorPool(
        { baseName: BASE_NAME, poolSize },
        execFileImpl,
      ),
    ).rejects.toThrow('Expected a positive integer');
  });

  it('boots the base simulator without clone or delete when pool size is one', async () => {
    const listJson = makeListDevicesJson([
      { name: BASE_NAME, udid: BASE_UDID, state: 'Shutdown' },
    ]);
    const { execFileImpl, calls } = createFakeExecFile(listJson, []);

    const udids = await prepareIosSimulatorPool(
      { baseName: BASE_NAME, poolSize: 1 },
      execFileImpl,
    );

    expect(udids).toEqual([BASE_UDID]);
    expect(calls.some((call) => call.args[1] === 'clone')).toBe(false);
    expect(calls.some((call) => call.args[1] === 'delete')).toBe(false);
    expect(calls.some((call) => call.args[1] === 'shutdown')).toBe(false);
    expect(simctlArgs(calls, 'boot')).toEqual([BASE_UDID]);
    expect(simctlArgs(calls, 'bootstatus')).toEqual([BASE_UDID, '-b']);
  });

  it('shuts down a booted base, recreates clones, and boots clone UDIDs for pool size two', async () => {
    const listJson = makeListDevicesJson([
      { name: BASE_NAME, udid: BASE_UDID, state: 'Booted' },
    ]);
    const { execFileImpl, calls } = createFakeExecFile(listJson, [
      CLONE_UDID_0,
      CLONE_UDID_1,
    ]);

    const udids = await prepareIosSimulatorPool(
      { baseName: BASE_NAME, poolSize: 2 },
      execFileImpl,
    );

    expect(udids).toEqual([CLONE_UDID_0, CLONE_UDID_1]);

    const shutdownIndex = calls.findIndex(
      (call) => call.args[1] === 'shutdown',
    );
    const firstDeleteIndex = calls.findIndex((call) => call.args[1] === 'delete');
    const firstCloneIndex = calls.findIndex((call) => call.args[1] === 'clone');
    const firstBootIndex = calls.findIndex((call) => call.args[1] === 'boot');

    expect(shutdownIndex).toBeGreaterThanOrEqual(0);
    expect(firstDeleteIndex).toBeGreaterThan(shutdownIndex);
    expect(firstCloneIndex).toBeGreaterThan(firstDeleteIndex);
    expect(firstBootIndex).toBeGreaterThan(firstCloneIndex);

    expect(simctlArgs(calls, 'shutdown')).toEqual([BASE_UDID]);

    const deleteCalls = calls.filter((call) => call.args[1] === 'delete');
    expect(deleteCalls).toHaveLength(2);

    const cloneCalls = calls.filter((call) => call.args[1] === 'clone');
    expect(cloneCalls).toHaveLength(2);
    expect(cloneCalls[0]?.args.slice(2)).toEqual([
      BASE_UDID,
      iosPoolSimulatorName(BASE_NAME, 0),
    ]);
    expect(cloneCalls[1]?.args.slice(2)).toEqual([
      BASE_UDID,
      iosPoolSimulatorName(BASE_NAME, 1),
    ]);

    const bootedUdids = calls
      .filter((call) => call.args[1] === 'boot')
      .map((call) => call.args[2]);
    expect(bootedUdids).toEqual([CLONE_UDID_0, CLONE_UDID_1]);
    expect(bootedUdids).not.toContain(BASE_UDID);
  });
});
