import '../../../../../tests/component-view/mocks';
import { fireEvent } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { renderOnboardingSheet } from '../../../../../tests/component-view/renderers/onboardingSheet';
import { strings } from '../../../../../locales/i18n';
import { AuthConnection } from '../../../../core/OAuthService/OAuthInterface';
import { OnboardingSheetSelectorIDs } from './OnboardingSheet.testIds';

describeForPlatforms('OnboardingSheet', () => {
  it('hides import from extension when add-device sync is off', async () => {
    const { findByTestId, queryByTestId } = renderOnboardingSheet({
      addDeviceSyncEnabled: false,
    });

    expect(
      await findByTestId(OnboardingSheetSelectorIDs.IMPORT_SEED_BUTTON),
    ).toBeOnTheScreen();

    expect(
      queryByTestId(OnboardingSheetSelectorIDs.IMPORT_FROM_EXTENSION_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('hides import from extension on the create-wallet sheet', async () => {
    const { findByText, queryByTestId } = renderOnboardingSheet({
      addDeviceSyncEnabled: true,
      createWallet: true,
    });

    expect(
      await findByText(strings('onboarding.continue_with_srp')),
    ).toBeOnTheScreen();

    expect(
      queryByTestId(OnboardingSheetSelectorIDs.IMPORT_FROM_EXTENSION_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('calls import from extension when the add-device button is pressed', async () => {
    const onPressImportFromExtension = jest.fn();

    const { findByTestId } = renderOnboardingSheet({
      addDeviceSyncEnabled: true,
      onPressImportFromExtension,
    });

    fireEvent.press(
      await findByTestId(
        OnboardingSheetSelectorIDs.IMPORT_FROM_EXTENSION_BUTTON,
      ),
    );

    expect(onPressImportFromExtension).toHaveBeenCalledTimes(1);
  });

  it('disables import from extension while social login is loading', async () => {
    const onPressImportFromExtension = jest.fn();

    const { findByTestId } = renderOnboardingSheet({
      addDeviceSyncEnabled: true,
      loadingProvider: AuthConnection.Google,
      onPressImportFromExtension,
      onPressContinueWithTelegram: jest.fn(),
    });

    const importFromExtensionButton = await findByTestId(
      OnboardingSheetSelectorIDs.IMPORT_FROM_EXTENSION_BUTTON,
    );

    expect(importFromExtensionButton).toBeDisabled();

    fireEvent.press(importFromExtensionButton);

    expect(onPressImportFromExtension).not.toHaveBeenCalled();
  });
});
