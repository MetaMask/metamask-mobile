import React, { ComponentType } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

import { ThemeContext, mockTheme } from '../../../../util/theme';
import { AppThemeKey } from '../../../../util/theme/models';
import OnboardingSheet, { OnboardingSheetProps } from '.';
import { OnboardingSheetSelectorIDs } from './OnboardingSheet.testIds';
import { AuthConnection } from '../../../../core/OAuthService/OAuthInterface';

const asComponentType = (name: string) => name as unknown as ComponentType;

jest.mock('@metamask/design-system-react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { View } = ReactNative;

  const BottomSheet = ({
    children,
  }: {
    children: React.ReactNode;
    goBack?: () => void;
  }) => <View testID="mock-bottom-sheet">{children}</View>;

  return {
    ...actual,
    BottomSheet,
  };
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

describe('OnboardingSheet', () => {
  const renderSheet = (props: Partial<OnboardingSheetProps> = {}) =>
    render(
      <ThemeContext.Provider value={mockTheme}>
        <NavigationContainer>
          <OnboardingSheet onDismiss={jest.fn()} {...props} />
        </NavigationContainer>
      </ThemeContext.Provider>,
    );

  it('invokes Telegram login callback with createWallet true', () => {
    const onPressContinueWithTelegram = jest.fn();

    const { getByTestId } = renderSheet({
      onPressContinueWithTelegram,
      createWallet: true,
    });

    fireEvent.press(
      getByTestId(OnboardingSheetSelectorIDs.TELEGRAM_LOGIN_BUTTON),
    );

    expect(onPressContinueWithTelegram).toHaveBeenCalledWith(true);
  });

  it('invokes Telegram login callback with createWallet false for import flows', () => {
    const onPressContinueWithTelegram = jest.fn();

    const { getByTestId } = renderSheet({
      onPressContinueWithTelegram,
      createWallet: false,
    });

    fireEvent.press(
      getByTestId(OnboardingSheetSelectorIDs.TELEGRAM_LOGIN_BUTTON),
    );

    expect(onPressContinueWithTelegram).toHaveBeenCalledWith(false);
  });

  it('does not render the Telegram login button when the callback is omitted', () => {
    const { queryByTestId } = renderSheet({ createWallet: true });

    expect(
      queryByTestId(OnboardingSheetSelectorIDs.TELEGRAM_LOGIN_BUTTON),
    ).toBeNull();
  });

  it('renders the dark Apple icon when the theme is dark', () => {
    const { getByTestId, UNSAFE_getAllByType } = render(
      <ThemeContext.Provider
        value={{ ...mockTheme, themeAppearance: AppThemeKey.dark }}
      >
        <NavigationContainer>
          <OnboardingSheet onDismiss={jest.fn()} />
        </NavigationContainer>
      </ThemeContext.Provider>,
    );

    expect(
      getByTestId(OnboardingSheetSelectorIDs.APPLE_LOGIN_BUTTON),
    ).toBeOnTheScreen();
    expect(
      UNSAFE_getAllByType(asComponentType('SvgMock')).some(
        (icon) => icon.props.name === 'apple',
      ),
    ).toBe(true);
  });

  it('disables Telegram and Apple while Google login is loading', () => {
    const { getByTestId } = renderSheet({
      onPressContinueWithTelegram: jest.fn(),
      loadingProvider: AuthConnection.Google,
    });

    expect(
      getByTestId(OnboardingSheetSelectorIDs.TELEGRAM_LOGIN_BUTTON),
    ).toBeDisabled();
    expect(
      getByTestId(OnboardingSheetSelectorIDs.APPLE_LOGIN_BUTTON),
    ).toBeDisabled();
    expect(
      getByTestId(OnboardingSheetSelectorIDs.GOOGLE_LOGIN_BUTTON),
    ).toBeDisabled();
  });
});
