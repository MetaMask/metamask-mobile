import React from 'react';
import { render } from '@testing-library/react-native';
import {
  useReducedMotion,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {
  REFERRAL_FUNNEL_FILL_TIMING,
  referralFunnelFillDelay,
} from '../../constants/referralFunnelAnimation';
import ReferralFunnelBar from './ReferralFunnelBar';

const mockUseAnimatedStyle = jest.fn((updater: () => object) => updater());

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useReducedMotion: jest.fn(() => false),
    useSharedValue: jest.fn((initial: number) => ({ value: initial })),
    useAnimatedStyle: (updater: () => object) => mockUseAnimatedStyle(updater),
    withDelay: jest.fn((_delay: number, animation: unknown) => animation),
    withTiming: jest.fn((target: number) => target),
  };
});

jest.mock('../../../../../util/test/utils', () => ({
  hasTestOverrides: false,
}));

const mockUseReducedMotion = useReducedMotion as jest.Mock;
const mockWithDelay = withDelay as jest.Mock;
const mockWithTiming = withTiming as jest.Mock;

describe('ReferralFunnelBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(false);
  });

  it('renders the track with the given test id', () => {
    const { getByTestId } = render(
      <ReferralFunnelBar ratio={0.5} index={0} testID="funnel-bar" />,
    );

    expect(getByTestId('funnel-bar')).toBeOnTheScreen();
  });

  it('starts empty and fills to the ratio after the staggered delay', () => {
    render(<ReferralFunnelBar ratio={0.4} index={1} />);

    expect(mockWithTiming).toHaveBeenCalledWith(
      0.4,
      REFERRAL_FUNNEL_FILL_TIMING,
    );
    expect(mockWithDelay).toHaveBeenCalledWith(referralFunnelFillDelay(1), 0.4);
    expect(mockUseAnimatedStyle.mock.results[0].value).toEqual({
      width: '0%',
    });
  });

  it('staggers later rows after earlier ones', () => {
    render(<ReferralFunnelBar ratio={1} index={0} />);
    render(<ReferralFunnelBar ratio={1} index={2} />);

    const [firstDelay] = mockWithDelay.mock.calls[0];
    const [thirdDelay] = mockWithDelay.mock.calls[1];

    expect(firstDelay).toBe(referralFunnelFillDelay(0));
    expect(thirdDelay).toBe(referralFunnelFillDelay(2));
    expect(thirdDelay).toBeGreaterThan(firstDelay);
  });

  it('jumps straight to the ratio when the user prefers reduced motion', () => {
    mockUseReducedMotion.mockReturnValue(true);

    render(<ReferralFunnelBar ratio={0.75} index={1} />);

    expect(mockWithDelay).not.toHaveBeenCalled();
    expect(mockWithTiming).not.toHaveBeenCalled();
    expect(mockUseAnimatedStyle.mock.results[0].value).toEqual({
      width: '75%',
    });
  });

  it.each([
    [1.5, 1],
    [-0.2, 0],
  ])('clamps a ratio of %p to %p', (ratio, expected) => {
    render(<ReferralFunnelBar ratio={ratio} index={0} />);

    expect(mockWithTiming).toHaveBeenCalledWith(
      expected,
      REFERRAL_FUNNEL_FILL_TIMING,
    );
  });
});
