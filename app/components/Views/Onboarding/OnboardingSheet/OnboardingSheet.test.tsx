import React, { ComponentType } from 'react';
import { fireEvent } from '@testing-library/react-native';

import { mockTheme } from '../../../../util/theme';
import { AppThemeKey, Theme } from '../../../../util/theme/models';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import OnboardingSheet, { OnboardingSheetProps } from '.';
import { OnboardingSheetSelectorIDs } from './OnboardingSheet.testIds';
import { AuthConnection } from '../../../../core/OAuthService/OAuthInterface';

const asComponentType = (name: string) => name as unknown as ComponentType;

jest.mock('@metamask/design-system-react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { Pressable, View } = ReactNative;

  const BottomSheet = ({
    children,
    goBack,
  }: {
    children: React.ReactNode;
    goBack?: () => void;
  }) => (
    <View testID="mock-bottom-sheet">
      {children}
      <Pressable testID="mock-bottom-sheet-close" onPress={goBack} />
    </View>
  );

  return {
    ...actual,
    BottomSheet,
  };
});

jest.mock('../../../../selectors/featureFlagController/addDeviceSync', () => ({
  selectAddDeviceSyncEnabled: () => true,
}));

describe('OnboardingSheet', () => {
  const renderSheet = (
    props: Partial<OnboardingSheetProps> = {},
    theme: Theme = mockTheme,
  ) =>
    renderWithProvider(<OnboardingSheet onDismiss={jest.fn()} {...props} />, {
      theme,
    });

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
    const { getByTestId, UNSAFE_getAllByType } = renderSheet(
      {},
      { ...mockTheme, themeAppearance: AppThemeKey.dark },
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

  it('disables sibling actions while Google login is loading', () => {
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

  it('reveals import methods after pressing the single import action', () => {
    const onPressImport = jest.fn();
    const onPressImportFromExtension = jest.fn();
    const { getByTestId, queryByTestId } = renderSheet({
      createWallet: false,
      onPressImport,
      onPressImportFromExtension,
    });

    expect(
      getByTestId(OnboardingSheetSelectorIDs.IMPORT_OPTIONS_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(OnboardingSheetSelectorIDs.IMPORT_FROM_EXTENSION_BUTTON),
    ).toBeNull();
    expect(
      queryByTestId(OnboardingSheetSelectorIDs.IMPORT_SEED_BUTTON),
    ).toBeNull();

    fireEvent.press(
      getByTestId(OnboardingSheetSelectorIDs.IMPORT_OPTIONS_BUTTON),
    );

    fireEvent.press(
      getByTestId(OnboardingSheetSelectorIDs.IMPORT_FROM_EXTENSION_BUTTON),
    );
    fireEvent.press(getByTestId(OnboardingSheetSelectorIDs.IMPORT_SEED_BUTTON));

    expect(onPressImportFromExtension).toHaveBeenCalledTimes(1);
    expect(onPressImport).toHaveBeenCalledTimes(1);
  });

  it('does not show a back button on the import methods sheet', () => {
    const { getByTestId, queryByTestId } = renderSheet({
      createWallet: false,
      onPressImport: jest.fn(),
      onPressImportFromExtension: jest.fn(),
    });

    fireEvent.press(
      getByTestId(OnboardingSheetSelectorIDs.IMPORT_OPTIONS_BUTTON),
    );

    expect(
      queryByTestId('bottomsheetheader-back-button'),
    ).not.toBeOnTheScreen();
  });

  it('dismisses the sheet when closing from the import methods view', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = renderSheet({
      createWallet: false,
      onDismiss,
      onPressImport: jest.fn(),
      onPressImportFromExtension: jest.fn(),
    });

    fireEvent.press(
      getByTestId(OnboardingSheetSelectorIDs.IMPORT_OPTIONS_BUTTON),
    );
    fireEvent.press(getByTestId('mock-bottom-sheet-close'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
