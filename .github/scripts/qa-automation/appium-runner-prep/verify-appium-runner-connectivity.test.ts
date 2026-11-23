import {
  assertBootedUdids,
  verifyIosAppiumRunnerConnectivity,
} from './verify-appium-runner-connectivity.mjs';

const BOOTED_UDID_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const BOOTED_UDID_C = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const BOOTED_LINES = [
  `    iPhone 16 Pro Appium Pool 0 (${BOOTED_UDID_B}) (Booted)`,
  `    iPhone 16 Pro Appium Pool 1 (${BOOTED_UDID_C}) (Booted)`,
];

describe('assertBootedUdids', () => {
  it('passes when every required UDID is booted', () => {
    expect(() =>
      assertBootedUdids(BOOTED_LINES, [BOOTED_UDID_B, BOOTED_UDID_C]),
    ).not.toThrow();
  });

  it('throws naming the missing UDID when one pool member is absent', () => {
    expect(() =>
      assertBootedUdids(BOOTED_LINES, [
        BOOTED_UDID_B,
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
      ]),
    ).toThrow(
      'Booted simulator dddddddd-dddd-dddd-dddd-dddddddddddd not found',
    );
  });

  it('allows empty required list for any-booted behavior', () => {
    expect(() => assertBootedUdids(BOOTED_LINES, [])).not.toThrow();
  });

  it('rejects a required UDID that is only a prefix of a booted UDID', () => {
    const prefixOnlyUdid = BOOTED_UDID_B.slice(0, -1);

    expect(() => assertBootedUdids(BOOTED_LINES, [prefixOnlyUdid])).toThrow(
      `Booted simulator ${prefixOnlyUdid} not found`,
    );
  });

  it('rejects a required UDID that appears only in the device name text', () => {
    const decoyUdid = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    const misleadingLines = [
      `    ${decoyUdid} (${BOOTED_UDID_B}) (Booted)`,
    ];

    expect(() => assertBootedUdids(misleadingLines, [decoyUdid])).toThrow(
      `Booted simulator ${decoyUdid} not found`,
    );
  });

  it('rejects booted lines that omit the (Booted) state suffix', () => {
    const shutdownLines = [
      `    iPhone 16 Pro Appium Pool 0 (${BOOTED_UDID_B}) (Shutdown)`,
    ];

    expect(() => assertBootedUdids(shutdownLines, [BOOTED_UDID_B])).toThrow(
      `Booted simulator ${BOOTED_UDID_B} not found`,
    );
  });
});

describe('verifyIosAppiumRunnerConnectivity', () => {
  const execImpl = jest.fn(async () => ({
    stdout: BOOTED_LINES.join('\n'),
    stderr: '',
  }));

  beforeEach(() => {
    execImpl.mockClear();
  });

  it.each([
    ['an empty pool', undefined],
    ['a short pool', BOOTED_UDID_B],
    [
      'a long pool',
      `${BOOTED_UDID_B},${BOOTED_UDID_C},dddddddd-dddd-dddd-dddd-dddddddddddd`,
    ],
  ])('rejects %s when pool size is two', async (_label, iosDevicePool) => {
    await expect(
      verifyIosAppiumRunnerConnectivity({
        execImpl,
        iosDevicePoolSize: '2',
        iosDevicePool,
      }),
    ).rejects.toThrow(
      'IOS_DEVICE_POOL_SIZE (2) requires IOS_DEVICE_POOL with exactly 2 valid unique UDIDs.',
    );
  });

  it.each([
    ['an empty token', `${BOOTED_UDID_B},,${BOOTED_UDID_C}`],
    ['a leading empty token', `,${BOOTED_UDID_B}`],
    ['a trailing empty token', `${BOOTED_UDID_B},`],
    ['a malformed UDID', `${BOOTED_UDID_B},not-a-udid`],
    ['a duplicate UDID', `${BOOTED_UDID_B},${BOOTED_UDID_B}`],
  ])('rejects %s in a size-two pool', async (_label, iosDevicePool) => {
    await expect(
      verifyIosAppiumRunnerConnectivity({
        execImpl,
        iosDevicePoolSize: '2',
        iosDevicePool,
      }),
    ).rejects.toThrow();
  });

  it('validates the exact pool before inspecting booted simulators', async () => {
    const execBeforeValidation = jest.fn(async () => {
      throw new Error('Booted simulator inspection should not run');
    });

    await expect(
      verifyIosAppiumRunnerConnectivity({
        execImpl: execBeforeValidation,
        iosDevicePoolSize: '2',
        iosDevicePool: BOOTED_UDID_B,
      }),
    ).rejects.toThrow(
      'IOS_DEVICE_POOL_SIZE (2) requires IOS_DEVICE_POOL with exactly 2 valid unique UDIDs.',
    );
    expect(execBeforeValidation).not.toHaveBeenCalled();
  });

  it.each(['0', '2x'])(
    'rejects invalid IOS_DEVICE_POOL_SIZE %s',
    async (iosDevicePoolSize) => {
      await expect(
        verifyIosAppiumRunnerConnectivity({
          execImpl,
          iosDevicePoolSize,
        }),
      ).rejects.toThrow('Expected a positive integer.');
    },
  );

  it('passes when both exact size-two pool UDIDs are booted', async () => {
    await expect(
      verifyIosAppiumRunnerConnectivity({
        execImpl,
        iosDevicePoolSize: '2',
        iosDevicePool: `${BOOTED_UDID_B},${BOOTED_UDID_C}`,
      }),
    ).resolves.toEqual(BOOTED_LINES.map((line) => line.trim()));
  });

  it('preserves any-booted behavior when pool size defaults to one', async () => {
    await expect(
      verifyIosAppiumRunnerConnectivity({ execImpl }),
    ).resolves.toHaveLength(2);
  });
});
