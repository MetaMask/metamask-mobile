import { AnimationDuration } from '@metamask/design-tokens';
import {
  scrollOffsetForExpandSwipe,
  sheetHeightDuration,
  SHEET_HEIGHT_DURATION_MS,
} from './sheetGestureMotion';

jest.mock('../../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => 'HIGH'),
}));

const { getHardwareTier } = jest.requireMock(
  '../../../../../util/deviceCapability',
) as {
  getHardwareTier: jest.Mock;
};

describe('sheetGestureMotion', () => {
  beforeEach(() => {
    getHardwareTier.mockReturnValue('HIGH');
  });

  it('uses the design-system regular duration', () => {
    expect(SHEET_HEIGHT_DURATION_MS).toBe(AnimationDuration.Regularly);
    expect(sheetHeightDuration(false)).toBe(AnimationDuration.Regularly);
  });

  it('skips the height animation for reduced motion and low hardware', () => {
    expect(sheetHeightDuration(true)).toBe(0);

    getHardwareTier.mockReturnValue('LOW');
    expect(sheetHeightDuration(false)).toBe(0);

    getHardwareTier.mockReturnValue(null);
    expect(sheetHeightDuration(false)).toBe(AnimationDuration.Regularly);
  });

  it('scrolls farther for a longer, faster upward swipe', () => {
    expect(scrollOffsetForExpandSwipe(-40, 0)).toBe(40);
    expect(scrollOffsetForExpandSwipe(-80, -1200)).toBe(380);
    expect(scrollOffsetForExpandSwipe(-400, -4000)).toBe(480);
  });

  it('does not scroll for a downward gesture', () => {
    expect(scrollOffsetForExpandSwipe(40, 800)).toBe(0);
  });
});
