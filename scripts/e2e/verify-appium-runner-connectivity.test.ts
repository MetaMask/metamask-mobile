import { assertBootedUdids } from './verify-appium-runner-connectivity.mjs';

const BOOTED_LINES = [
  '    iPhone 16 Pro Appium Pool 0 (bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb) (Booted)',
  '    iPhone 16 Pro Appium Pool 1 (cccccccc-cccc-cccc-cccc-cccccccccccc) (Booted)',
];

describe('assertBootedUdids', () => {
  it('passes when every required UDID is booted', () => {
    expect(() =>
      assertBootedUdids(BOOTED_LINES, [
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
      ]),
    ).not.toThrow();
  });

  it('throws naming the missing UDID when one pool member is absent', () => {
    expect(() =>
      assertBootedUdids(BOOTED_LINES, [
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
      ]),
    ).toThrow(
      'Booted simulator dddddddd-dddd-dddd-dddd-dddddddddddd not found',
    );
  });

  it('allows empty required list for any-booted behavior', () => {
    expect(() => assertBootedUdids(BOOTED_LINES, [])).not.toThrow();
  });
});
