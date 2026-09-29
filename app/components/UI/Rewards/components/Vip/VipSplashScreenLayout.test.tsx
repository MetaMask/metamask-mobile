import React from 'react';
import { useWindowDimensions, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import VipSplashScreenLayout, {
  VIP_SPLASH_SCREEN_TEST_IDS,
} from './VipSplashScreenLayout';
import {
  VIP_SPLASH_FOX_HEIGHT,
  VIP_SPLASH_FOX_WIDTH,
  VIP_SPLASH_MIN_SCREEN_HEIGHT_FOR_SMALL_STYLES,
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
  const { View, Text: RNText } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, { testID }, children),
    FontWeight: { Bold: 'bold', Medium: 'medium' },
    Text: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(RNText, { testID }, children),
    TextVariant: { BodyMd: 'bodyMd' },
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
    testID,
  }: {
    children?: React.ReactNode;
    testID?: string;
  }) {
    return ReactActual.createElement(View, { testID }, children);
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

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, { testID }, children),
  };
});

jest.mock('../../../../../images/rewards/vip_splash.png', () => 1);

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.vip.splash_title': 'WELCOME\nTO GOLD FOX\nCOLLECTIVE',
      'rewards.vip.splash_description': 'Exclusive perks by invitation only.',
      'rewards.vip.splash_not_now': 'Not now',
    };
    return translations[key] ?? key;
  }),
}));

const defaultProps = {
  testIDs: {
    container: VIP_SPLASH_SCREEN_TEST_IDS.CONTAINER,
    title: VIP_SPLASH_SCREEN_TEST_IDS.TITLE,
    description: VIP_SPLASH_SCREEN_TEST_IDS.DESCRIPTION,
    fox: VIP_SPLASH_SCREEN_TEST_IDS.FOX,
    primaryButton: VIP_SPLASH_SCREEN_TEST_IDS.ACCEPT_BUTTON,
    notNowButton: VIP_SPLASH_SCREEN_TEST_IDS.NOT_NOW_BUTTON,
  },
  onPrimaryPress: jest.fn(),
  onNotNow: jest.fn(),
  primaryButtonLabel: 'Accept invite',
};

describe('VipSplashScreenLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 375,
      height: 812,
      scale: 2,
      fontScale: 1,
    });
  });

  it('renders the shared splash content and primary button label', () => {
    const { getByTestId, getByText } = render(
      <VipSplashScreenLayout {...defaultProps} />,
    );

    expect(getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.TITLE)).toBeOnTheScreen();
    expect(
      getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.DESCRIPTION),
    ).toHaveTextContent('Exclusive perks by invitation only.');
    expect(getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.FOX)).toBeOnTheScreen();
    expect(getByText('Accept invite')).toBeOnTheScreen();
    expect(getByText('Not now')).toBeOnTheScreen();
  });

  it('invokes the primary and not-now callbacks when their buttons are pressed', () => {
    const onPrimaryPress = jest.fn();
    const onNotNow = jest.fn();

    const { getByTestId } = render(
      <VipSplashScreenLayout
        {...defaultProps}
        onPrimaryPress={onPrimaryPress}
        onNotNow={onNotNow}
      />,
    );

    fireEvent.press(getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.ACCEPT_BUTTON));
    fireEvent.press(getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.NOT_NOW_BUTTON));

    expect(onPrimaryPress).toHaveBeenCalledTimes(1);
    expect(onNotNow).toHaveBeenCalledTimes(1);
  });

  it('renders optional footer content above the primary button', () => {
    const { getByTestId, getByText } = render(
      <VipSplashScreenLayout
        {...defaultProps}
        footerContent={
          <Text testID="vip-splash-footer">Referred by TESTCODE</Text>
        }
      />,
    );

    expect(getByTestId('vip-splash-footer')).toBeOnTheScreen();
    expect(getByText('Referred by TESTCODE')).toBeOnTheScreen();
  });

  it('uses the default fox image dimensions on larger screens', () => {
    const { getByTestId } = render(<VipSplashScreenLayout {...defaultProps} />);

    expect(getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.FOX).props).toMatchObject({
      width: VIP_SPLASH_FOX_WIDTH,
      height: VIP_SPLASH_FOX_HEIGHT,
    });
  });

  it('scales the fox image down on small screens', () => {
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 320,
      height: VIP_SPLASH_MIN_SCREEN_HEIGHT_FOR_SMALL_STYLES - 1,
      scale: 2,
      fontScale: 1,
    });

    const { getByTestId } = render(<VipSplashScreenLayout {...defaultProps} />);
    const expectedWidth = 260;

    expect(getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.FOX).props).toMatchObject({
      width: expectedWidth,
      height: Math.round(
        expectedWidth * (VIP_SPLASH_FOX_HEIGHT / VIP_SPLASH_FOX_WIDTH),
      ),
    });
  });

  it('uses compact button heights on small screens', () => {
    jest.mocked(useWindowDimensions).mockReturnValue({
      width: 320,
      height: VIP_SPLASH_MIN_SCREEN_HEIGHT_FOR_SMALL_STYLES - 1,
      scale: 2,
      fontScale: 1,
    });

    const { getByTestId } = render(<VipSplashScreenLayout {...defaultProps} />);

    expect(
      getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.ACCEPT_BUTTON).props.style,
    ).toEqual(expect.arrayContaining(['h-10']));
    expect(
      getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.NOT_NOW_BUTTON).props.style,
    ).toEqual(expect.arrayContaining(['h-8']));
  });
});
