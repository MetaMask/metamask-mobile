import React from 'react';
import { render } from '@testing-library/react-native';
import {
  useReducedMotion,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import ReferralFunnelBar from './ReferralFunnelBar';
import {
  REFERRAL_FUNNEL_FILL_TIMING,
  referralFunnelFillDelay,
} from '../../constants/referralFunnelAnimation';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useReducedMotion: jest.fn(() => false),
  withTiming: jest.fn((toValue) => toValue),
  withDelay: jest.fn((_delay, animation) => animation),
  useAnimatedStyle: (factory: () => unknown) => factory(),
  useSharedValue: (initial: unknown) => ({ value: initial }),
}));

const mockUseReducedMotion = jest.mocked(useReducedMotion);
const mockWithTiming = jest.mocked(withTiming);
const mockWithDelay = jest.mocked(withDelay);

describe('ReferralFunnelBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(false);
  });

  it('fills to the row ratio using the shared progress-fill timing', () => {
    render(<ReferralFunnelBar ratio={0.5} index={0} testID="funnel-bar" />);

    expect(mockWithTiming).toHaveBeenCalledWith(
      0.5,
      REFERRAL_FUNNEL_FILL_TIMING,
    );
  });

  it('staggers each row so the bars read as one top-to-bottom wave', () => {
    render(<ReferralFunnelBar ratio={0.4} index={2} testID="funnel-bar" />);

    expect(mockWithDelay).toHaveBeenCalledWith(
      referralFunnelFillDelay(2),
      expect.anything(),
    );
  });

  it('skips the fill entirely under Reduce Motion', () => {
    mockUseReducedMotion.mockReturnValue(true);

    render(<ReferralFunnelBar ratio={0.5} index={0} testID="funnel-bar" />);

    expect(mockWithTiming).not.toHaveBeenCalled();
    expect(mockWithDelay).not.toHaveBeenCalled();
  });

  it('clamps a ratio above the funnel max so the bar cannot overflow', () => {
    render(<ReferralFunnelBar ratio={1.4} index={0} testID="funnel-bar" />);

    expect(mockWithTiming).toHaveBeenCalledWith(1, REFERRAL_FUNNEL_FILL_TIMING);
  });

  it('renders the track so the funnel row keeps its layout', () => {
    const { getByTestId } = render(
      <ReferralFunnelBar ratio={0.5} index={0} testID="funnel-bar" />,
    );

    expect(getByTestId('funnel-bar')).toBeOnTheScreen();
  });
});
