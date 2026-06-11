import React from 'react';
import { render, screen } from '@testing-library/react-native';
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
  useAnimatedProps: jest.fn(() => ({})),
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

describe('RewardsVipReferralTag', () => {
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
});
