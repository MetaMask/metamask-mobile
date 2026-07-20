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
 * Mirrors (partial): tests/smoke/wallet/settings/delete-wallet.spec.ts
 * — modal UI states and confirmation navigation only.
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

  it('shows the forgot-password screen then advances to confirmation when Reset Wallet is pressed', async () => {
    const { findByTestId, findByText } = renderDeleteWalletModal();

    expect(
      await findByTestId(ForgotPasswordModalSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      await findByText(strings('login.forgot_password_desc')),
    ).toBeOnTheScreen();

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

  it('opens on the confirmation screen when isResetWallet route param is set without a back button', async () => {
    const { findByTestId, findByText, queryByTestId } = renderDeleteWalletModal(
      {
        isResetWallet: true,
      },
    );

    expect(await findByText(strings('login.are_you_sure'))).toBeOnTheScreen();
    expect(
      await findByTestId(
        ForgotPasswordModalSelectorsIDs.YES_RESET_WALLET_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(ForgotPasswordModalSelectorsIDs.CANCEL_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(ForgotPasswordModalSelectorsIDs.BACK_BUTTON),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      await findByTestId(ForgotPasswordModalSelectorsIDs.CANCEL_BUTTON),
    );
  });
});
