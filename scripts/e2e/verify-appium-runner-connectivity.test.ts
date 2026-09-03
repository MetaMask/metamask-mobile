import { assertBootedUdids } from './verify-appium-runner-connectivity.mjs';

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
