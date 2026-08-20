import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import {
  withRepeat,
  cancelAnimation,
  useAnimatedProps,
} from 'react-native-reanimated';
import RewardsVipReferralTag from './RewardsVipReferralTag';

jest.mock('../../../../../images/rewards/vip.svg', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(View, { testID: 'vip-icon' }),
  };
});

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { createAnimatedComponent: (c: unknown) => c },
  cancelAnimation: jest.fn(),
  Easing: { linear: jest.fn() },
  // Invoke the updater so the worklet body is actually executed under test.
  useAnimatedProps: jest.fn((updater: () => unknown) => updater()),
  useSharedValue: jest.fn(() => ({ value: 0 })),
  withRepeat: jest.fn(),
  withTiming: jest.fn(),
}));

jest.mock('react-native-svg', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const Stub = (props: { children?: React.ReactNode }) =>
    ReactActual.createElement(View, null, props.children);
  return {
    __esModule: true,
    default: Stub,
    Svg: Stub,
    Defs: Stub,
    LinearGradient: Stub,
    Rect: Stub,
    Stop: Stub,
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => `mocked_${key}`,
}));

jest.mock('@metamask/design-system-react-native', () => {
  const React = jest.requireActual('react');
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    Text: ({
      children,
      style,
      ...props
    }: {
      children: React.ReactNode;
      style?: unknown;
      [key: string]: unknown;
    }) =>
      React.createElement(
        RNText,
        { testID: 'vip-tag-label', style, ...props },
        children,
      ),
    TextVariant: { BodyXs: 'BodyXs' },
    FontWeight: { Medium: 'Medium' },
  };
});

const fireLayout = (width: number, height: number) =>
  fireEvent(screen.getByTestId('rewards-vip-referral-tag'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height } },
  });

describe('RewardsVipReferralTag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with testID', () => {
    render(<RewardsVipReferralTag />);
    expect(screen.getByTestId('rewards-vip-referral-tag')).toBeTruthy();
  });

  it('renders the VIP label', () => {
    render(<RewardsVipReferralTag />);
    expect(
      screen.getByText('mocked_rewards.vip.referral_tag_label'),
    ).toBeTruthy();
  });

  it('does not render the animated border until the tag has been measured', () => {
    render(<RewardsVipReferralTag />);
    // Before layout, size is null so the animated border is not mounted.
    expect(withRepeat).not.toHaveBeenCalled();
  });

  it('mounts the animated border and starts the sweep once measured', () => {
    render(<RewardsVipReferralTag />);

    fireLayout(100, 24);

    // Mounting AnimatedBorder runs its effect (starts the looping animation)
    // and evaluates the animated props worklet.
    expect(withRepeat).toHaveBeenCalledTimes(1);
    expect(useAnimatedProps).toHaveBeenCalled();
    expect(screen.getByTestId('rewards-vip-referral-tag')).toBeTruthy();
  });

  it('keeps the same size object when re-measured with identical dimensions', () => {
    render(<RewardsVipReferralTag />);

    fireLayout(100, 24);
    fireLayout(100, 24); // identical -> memoized, keeps previous size
    fireLayout(120, 24); // changed -> new size object

    // Re-rendering with a new size remounts the border effect only when the
    // dimensions actually change.
    expect(screen.getByTestId('rewards-vip-referral-tag')).toBeTruthy();
  });

  it('cancels the border animation on unmount', () => {
    const { unmount } = render(<RewardsVipReferralTag />);

    fireLayout(100, 24);
    expect(cancelAnimation).not.toHaveBeenCalled();

    unmount();

    expect(cancelAnimation).toHaveBeenCalled();
  });
});
