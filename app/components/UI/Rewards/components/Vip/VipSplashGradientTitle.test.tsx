import React from 'react';
import { render } from '@testing-library/react-native';
import VipSplashGradientTitle from './VipSplashGradientTitle';

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return {
    Text: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(Text, { testID }, children),
    TextVariant: { DisplayMd: 'displayMd' },
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
      return 'WELCOME\nTO GOLD FOX\nCOLLECTIVE';
    }
    return key;
  }),
}));

describe('VipSplashGradientTitle', () => {
  it('renders the shared splash title with the provided testID', () => {
    const { getAllByText, getByTestId } = render(
      <VipSplashGradientTitle testID="vip-splash-title" />,
    );

    expect(getByTestId('vip-splash-title')).toBeOnTheScreen();
    expect(getAllByText('WELCOME\nTO GOLD FOX\nCOLLECTIVE')).toHaveLength(2);
  });
});
