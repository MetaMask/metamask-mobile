import React from 'react';
import { useWindowDimensions } from 'react-native';
import { render } from '@testing-library/react-native';
import VipSplashGradientTitle from './VipSplashGradientTitle';
import {
  VIP_SPLASH_MIN_SCREEN_HEIGHT_FOR_SMALL_STYLES,
  VIP_SPLASH_TITLE_FONT_SIZE,
  VIP_SPLASH_TITLE_FONT_SIZE_SMALL,
} from './Vip.constants';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    width: 375,
    height: 812,
    scale: 2,
    fontScale: 1,
  })),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return {
    Text: ({
      children,
      style,
      testID,
    }: {
      children?: React.ReactNode;
      style?: unknown;
      testID?: string;
    }) => ReactActual.createElement(Text, { style, testID }, children),
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
  beforeEach(() => {
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 375,
      height: 812,
      scale: 2,
      fontScale: 1,
    });
  });

  it('renders the shared splash title with the provided testID', () => {
    const { getAllByText, getByTestId } = render(
      <VipSplashGradientTitle testID="vip-splash-title" />,
    );

    expect(getByTestId('vip-splash-title')).toBeOnTheScreen();
    expect(getAllByText('WELCOME\nTO GOLD FOX\nCOLLECTIVE')).toHaveLength(2);
  });

  it('uses the default title font size on larger screens', () => {
    const { getByTestId } = render(
      <VipSplashGradientTitle testID="vip-splash-title" />,
    );

    expect(getByTestId('vip-splash-title').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fontSize: VIP_SPLASH_TITLE_FONT_SIZE,
          lineHeight: VIP_SPLASH_TITLE_FONT_SIZE,
        }),
      ]),
    );
  });

  it('uses the smaller title font size on small screens', () => {
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 320,
      height: VIP_SPLASH_MIN_SCREEN_HEIGHT_FOR_SMALL_STYLES - 1,
      scale: 2,
      fontScale: 1,
    });

    const { getByTestId } = render(
      <VipSplashGradientTitle testID="vip-splash-title" />,
    );

    expect(getByTestId('vip-splash-title').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fontSize: VIP_SPLASH_TITLE_FONT_SIZE_SMALL,
          lineHeight: VIP_SPLASH_TITLE_FONT_SIZE_SMALL,
        }),
      ]),
    );
  });
});
