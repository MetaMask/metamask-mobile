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
    }: {
      children?: React.ReactNode;
      style?: unknown;
      testID?: string;
      variant?: string;
    }) => ReactActual.createElement(Text, { style, testID, variant }, children),
    TextVariant: { DisplayMd: 'display-md' },
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
  it('renders the shared splash title with DisplayMd', () => {
    const { getAllByText, getByTestId } = render(
      <VipSplashGradientTitle testID="vip-splash-title" />,
    );

    expect(getByTestId('vip-splash-title')).toBeOnTheScreen();
    expect(getByTestId('vip-splash-title').props.variant).toBe('display-md');
    expect(getAllByText('Welcome to Gold Fox Collective')).toHaveLength(2);
  });
});
