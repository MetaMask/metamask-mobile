import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import MusdEducationChecklistMarquee, {
  shouldScrollMusdEducationTags,
} from './MusdEducationChecklistMarquee';
import type {
  HardwareTier,
  NetworkTier,
} from '../../../../../util/deviceCapability/types';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import { EARN_TEST_IDS } from '../../constants/testIds';

const mockGetHardwareTier = jest.fn<HardwareTier | null, []>(() => 'HIGH');
const mockUseReducedMotion = jest.fn(() => false);
const mockSetActive = jest.fn();
const mockFrame: {
  callback: (frame: { timeSincePreviousFrame: number | null }) => void;
} = {
  callback: () => undefined,
};

jest.mock('../../../../../util/deviceCapability', () => ({
  getHardwareTier: () => mockGetHardwareTier(),
}));

jest.mock('../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => 'WIFI' as const,
}));

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return new Proxy(actual, {
    get(target, prop, receiver) {
      if (prop === 'useReducedMotion') {
        return () => mockUseReducedMotion();
      }
      if (prop === 'useFrameCallback') {
        return (
          callback: (frame: { timeSincePreviousFrame: number | null }) => void,
        ) => {
          mockFrame.callback = callback;
          return {
            setActive: mockSetActive,
            isActive: false,
            callbackId: 1,
          };
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
});

describe('shouldScrollMusdEducationTags', () => {
  const tiers: (NetworkTier | null)[] = [
    'NONE',
    'SLOW_CELLULAR',
    'FAST_CELLULAR',
    'WIFI',
    null,
  ];

  it.each(tiers)(
    'scrolls on %s when hardware is not low and motion is allowed',
    (networkTier) => {
      const hardwareTier: HardwareTier = 'HIGH';

      expect(
        shouldScrollMusdEducationTags(hardwareTier, networkTier, false),
      ).toBe(true);
    },
  );

  it.each(tiers)(
    'keeps tags still on %s when hardware is low',
    (networkTier) => {
      expect(shouldScrollMusdEducationTags('LOW', networkTier, false)).toBe(
        false,
      );
    },
  );

  it('keeps tags still when reduced motion is on', () => {
    expect(shouldScrollMusdEducationTags('HIGH', 'WIFI', true)).toBe(false);
  });

  it('scrolls when the hardware tier is unknown', () => {
    expect(shouldScrollMusdEducationTags(null, null, false)).toBe(true);
  });
});

describe('MusdEducationChecklistMarquee', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHardwareTier.mockReturnValue('HIGH');
    mockUseReducedMotion.mockReturnValue(false);
  });

  it('wraps the tags when reduced motion is on', () => {
    mockUseReducedMotion.mockReturnValue(true);

    const { getAllByText, queryByTestId } = renderWithProvider(
      <MusdEducationChecklistMarquee />,
    );

    expect(
      getAllByText(
        strings('earn.musd_conversion.education.checklist.dollar_backed'),
      ),
    ).toHaveLength(1);
    expect(
      queryByTestId(EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.CHECKLIST),
    ).toBeNull();
    expect(mockSetActive).toHaveBeenCalledWith(false);
  });

  it('crawls the tags and wraps the offset after one loop', () => {
    const { getAllByText, getByTestId, unmount } = renderWithProvider(
      <MusdEducationChecklistMarquee />,
    );

    expect(
      getAllByText(
        strings('earn.musd_conversion.education.checklist.dollar_backed'),
        { includeHiddenElements: true },
      ),
    ).toHaveLength(2);
    expect(mockSetActive).toHaveBeenCalledWith(true);

    mockFrame.callback({ timeSincePreviousFrame: null });
    mockFrame.callback({ timeSincePreviousFrame: 0 });

    fireEvent(
      getByTestId(EARN_TEST_IDS.MUSD.CONVERSION_EDUCATION_VIEW.CHECKLIST),
      'layout',
      {
        nativeEvent: { layout: { width: 100, height: 24, x: 0, y: 0 } },
      },
    );

    mockFrame.callback({ timeSincePreviousFrame: 1000 });
    mockFrame.callback({ timeSincePreviousFrame: 5000 });

    unmount();
    expect(mockSetActive).toHaveBeenCalledWith(false);
  });
});
