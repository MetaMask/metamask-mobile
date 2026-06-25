import '../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { renderComponentViewScreen } from '../../../../tests/component-view/render';
import { initialStateIdentity } from '../../../../tests/component-view/presets/identity';
import type { DeepPartial } from '../../../util/test/renderWithProvider';
import type { RootState } from '../../../reducers';
import DeleteWalletModal from './index';
import { ForgotPasswordModalSelectorsIDs } from '../../../util/ForgotPasswordModal.testIds';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';

/**
 * Component View tests for DeleteWalletModal.
 *
 * Mirrors: tests/smoke/wallet/settings/delete-wallet.spec.ts
 *
 * CV covers modal UI states only. Full E2E flow (change password, lock, delete)
 * requires native Keychain and multi-screen navigation — see it.skip placeholders.
 *
 * Run: yarn jest -c jest.config.view.js DeleteWalletModal.view.test.tsx --runInBand
 */

function renderDeleteWalletModal(routeParams: Record<string, unknown> = {}) {
  const state = initialStateIdentity()
    .withOverrides({
      security: { dataCollectionForMarketing: false },
    } as DeepPartial<RootState>)
    .build();

  return renderComponentViewScreen(
    DeleteWalletModal as unknown as React.ComponentType,
    { name: Routes.MODAL.DELETE_WALLET },
    { state },
    routeParams,
  );
}

describeForPlatforms('DeleteWalletModal component views', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.skip('changes password before deleting wallet — skipped: requires ChangePasswordView and SecurityAndPrivacyView multi-screen navigation plus KeyringController.verifyPassword with real keychain state', () => {
    // Blocked: KeyringController.verifyPassword + multi-screen settings navigation.
  });

  it.skip('locks the wallet — skipped: requires AccountMenu + native Keychain and is outside this component', () => {
    // Blocked: Authentication.lockApp() writes to native Keychain.
  });

  // --- CV-testable: modal renders and state transitions ---

  it('renders the "Forgot your password?" initial state with a Reset Wallet button', async () => {
    const { findByTestId, findByText } = renderDeleteWalletModal();

    expect(
      await findByTestId(ForgotPasswordModalSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();

    expect(
      await findByText(strings('login.forgot_password_desc')),
    ).toBeOnTheScreen();

    expect(
      await findByTestId(ForgotPasswordModalSelectorsIDs.RESET_WALLET_BUTTON),
    ).toBeOnTheScreen();
  });

  it('advances to the "Are you sure?" confirmation screen when Reset Wallet is pressed', async () => {
    const { findByTestId, findByText } = renderDeleteWalletModal();

    const resetButton = await findByTestId(
      ForgotPasswordModalSelectorsIDs.RESET_WALLET_BUTTON,
    );
    fireEvent.press(resetButton);

    // After pressing, isResetWallet state flips to true showing the confirmation screen.
    expect(await findByText(strings('login.are_you_sure'))).toBeOnTheScreen();

    expect(
      await findByTestId(
        ForgotPasswordModalSelectorsIDs.YES_RESET_WALLET_BUTTON,
      ),
    ).toBeOnTheScreen();

    expect(
      await findByTestId(ForgotPasswordModalSelectorsIDs.CANCEL_BUTTON),
    ).toBeOnTheScreen();
  });

  it('goes back to the initial screen when the back button is pressed on the confirmation screen', async () => {
    const { findByTestId, findByText } = renderDeleteWalletModal();

    // Advance to confirmation screen
    fireEvent.press(
      await findByTestId(ForgotPasswordModalSelectorsIDs.RESET_WALLET_BUTTON),
    );
    await findByText(strings('login.are_you_sure'));

    // Press the back arrow
    fireEvent.press(
      await findByTestId(ForgotPasswordModalSelectorsIDs.BACK_BUTTON),
    );

    // Should return to the initial "Forgot your password?" screen
    await waitFor(async () => {
      expect(
        await findByText(strings('login.forgot_password_desc')),
      ).toBeOnTheScreen();
    });
  });

  it('renders the confirmation screen directly when isResetWallet route param is set', async () => {
    const { findByTestId, findByText } = renderDeleteWalletModal({
      isResetWallet: true,
    });

    // When launched with isResetWallet=true the modal opens on the confirm screen.
    expect(await findByText(strings('login.are_you_sure'))).toBeOnTheScreen();

    expect(
      await findByTestId(
        ForgotPasswordModalSelectorsIDs.YES_RESET_WALLET_BUTTON,
      ),
    ).toBeOnTheScreen();
  });

  it.skip('deletes the wallet and navigates to onboarding — skipped: Authentication.deleteWallet() requires real Keychain / native storage and full-app navigation reset', () => {
    // Blocked: Authentication.deleteWallet() + full navigation reset to onboarding.
  });
});
