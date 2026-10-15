import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import VipSplashScreenLayout, {
  VIP_SPLASH_SCREEN_TEST_IDS,
} from './VipSplashScreenLayout';

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text: RNText, Pressable } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, { testID }, children),
    FontWeight: { Bold: 'bold' },
    Text: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(RNText, { testID }, children),
    TextVariant: { BodyMd: 'bodyMd', DisplayLg: 'displayLg' },
    TextColor: { TextAlternative: 'text-alternative' },
    BoxFlexDirection: { Column: 'column' },
    BoxAlignItems: { Center: 'center' },
    BoxJustifyContent: { Center: 'center' },
    ButtonSize: { Lg: 'lg' },
    ButtonVariant: { Primary: 'primary', Tertiary: 'tertiary' },
    Button: ({
      children,
      onPress,
      testID,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      testID?: string;
    }) =>
      ReactActual.createElement(
        Pressable,
        { testID, onPress, accessibilityRole: 'button' },
        ReactActual.createElement(RNText, null, children),
      ),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  Theme: { Light: 'light', Dark: 'dark' },
  ThemeProvider: ({ children }: { children?: React.ReactNode }) => children,
  useTailwind: () => ({ style: jest.fn(() => ({})) }),
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

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({ children }: { children?: React.ReactNode }) =>
      ReactActual.createElement(View, null, children),
  };
});

jest.mock('../../../../../images/rewards/vip_splash.png', () => 1);

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.vip.splash_title': 'Welcome to Gold Fox Collective',
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
  });

  it('renders the title, description, fox, and both actions', () => {
    const { getByTestId, getByText } = render(
      <VipSplashScreenLayout {...defaultProps} />,
    );

    expect(getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.TITLE)).toHaveTextContent(
      'Welcome to Gold Fox Collective',
    );
    expect(
      getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.DESCRIPTION),
    ).toHaveTextContent('Exclusive perks by invitation only.');
    expect(getByTestId(VIP_SPLASH_SCREEN_TEST_IDS.FOX)).toBeOnTheScreen();
    expect(getByText('Accept invite')).toBeOnTheScreen();
    expect(getByText('Not now')).toBeOnTheScreen();
  });

  it('invokes the primary and not-now callbacks when pressed', () => {
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

  it('renders optional supporting content under the description', () => {
    const { getByTestId } = render(
      <VipSplashScreenLayout
        {...defaultProps}
        supportingContent={
          <Text testID="vip-splash-referred-by">Referred by TESTCODE</Text>
        }
      />,
    );

    expect(getByTestId('vip-splash-referred-by')).toHaveTextContent(
      'Referred by TESTCODE',
    );
  });
});
