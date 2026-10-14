import React from 'react';
import { render } from '@testing-library/react-native';
import VipSplashGradientTitle from './VipSplashGradientTitle';

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return {
    Text: ({
      children,
      style,
      testID,
      variant,
      fontFamily,
      fontWeight,
      twClassName,
    }: {
      children?: React.ReactNode;
      style?: unknown;
      testID?: string;
      variant?: string;
      fontFamily?: string;
      fontWeight?: string;
      twClassName?: string;
    }) =>
      ReactActual.createElement(
        Text,
        { style, testID, variant, fontFamily, fontWeight, twClassName },
        children,
      ),
    FontFamily: { Hero: 'hero' },
    FontWeight: { Regular: 'regular' },
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock('react-native-linear-gradient', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockLinearGradient({
    children,
  }: {
    children?: React.ReactNode;
  }) {
    return ReactActual.createElement(View, null, children);
  };
});

jest.mock('@react-native-masked-view/masked-view', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockMaskedView({
    children,
    maskElement,
  }: {
    children?: React.ReactNode;
    maskElement?: React.ReactNode;
  }) {
    return ReactActual.createElement(View, null, maskElement, children);
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    if (key === 'rewards.vip.splash_title') {
      return 'Welcome to Gold Fox Collective';
    }
    return key;
  }),
}));

describe('VipSplashGradientTitle', () => {
  it('renders the shared splash title with Hero at the marketing size', () => {
    const { getAllByText, getByTestId } = render(
      <VipSplashGradientTitle testID="vip-splash-title" />,
    );

    const title = getByTestId('vip-splash-title');

    expect(title).toBeOnTheScreen();
    expect(title.props.variant).toBeUndefined();
    expect(title.props.fontFamily).toBe('hero');
    expect(title.props.fontWeight).toBe('regular');
    expect(title.props.twClassName).toContain('text-[60px]');
    expect(title.props.twClassName).toContain('leading-[60px]');
    expect(title.props.twClassName).toContain('tracking-[-1.2px]');
    expect(getAllByText('Welcome to Gold Fox Collective')).toHaveLength(2);
  });
});
