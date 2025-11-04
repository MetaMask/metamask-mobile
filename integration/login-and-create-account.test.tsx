import React from 'react';
import { act, fireEvent, waitFor, render } from '@testing-library/react-native';

import { renderAppWithProviders } from './utils/renderApp';

import { LoginViewSelectors } from '../e2e/selectors/wallet/LoginView.selectors';
import { WalletViewSelectorsIDs } from '../e2e/selectors/wallet/WalletView.selectors';
import { WalletDetailsIds } from '../e2e/selectors/MultichainAccounts/WalletDetails';
import NavigationService from '../app/core/NavigationService';
import Routes from '../app/constants/navigation/Routes';

describe('Integration: login and create account', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });
  test('renders login screen for existing user', async () => {
    const { getByTestId } = renderAppWithProviders({
      state: {
        user: {
          // Keep app services ready to avoid gating in higher-order components
          appServicesReady: true,
          // Start as a returning user to land on Login flow
          existingUser: true,
        },
      },
    });

    // Flush any pending timers from initial mount
    act(() => {
      jest.runOnlyPendingTimers();
    });

    // Navigate to Login from initial FoxLoader
    act(() => {
      NavigationService.navigation.navigate(Routes.ONBOARDING.LOGIN as never);
    });

    // Expect login UI visible
    await waitFor(() => {
      expect(getByTestId(LoginViewSelectors.PASSWORD_INPUT)).toBeTruthy();
    });
  });

  test('opens wallet home when user is already logged in', async () => {
    const { findByTestId } = renderAppWithProviders({
      state: {
        user: {
          appServicesReady: true,
          existingUser: true,
          userLoggedIn: true,
        },
        // Minimal engine background state to satisfy multichain selectors used by Main
        engine: {
          backgroundState: {
            MultichainNetworkController: {
              isEvmSelected: true,
              selectedMultichainNetworkChainId: 'eip155:1' as unknown as any,
              multichainNetworkConfigurationsByChainId: {},
              networksWithTransactionActivity: {},
            },
            NetworkController: {
              selectedNetworkClientId: 'mainnet',
              networksMetadata: {
                mainnet: { EIPS: { 1559: true } },
              },
              networkConfigurationsByChainId: {},
            },
            KeyringController: {
              vault: 'encrypted-vault',
              keyrings: [],
              isUnlocked: true,
            },
            AccountsController: {
              internalAccounts: {
                accounts: {},
                selectedAccount: '',
              },
            },
          },
        },
      },
    });

    // Flush mount timers
    act(() => {
      jest.runOnlyPendingTimers();
    });

    // Navigate to Wallet Home
    act(() => {
      NavigationService.navigation.navigate(
        Routes.ONBOARDING.HOME_NAV as never,
      );
    });

    // Expect wallet container
    await findByTestId(WalletViewSelectorsIDs.WALLET_CONTAINER);
  });

  test('creates a new account from wallet details', async () => {
    // Render Wallet Main mock directly for deterministic account creation flow
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const WalletMain = require('./mocks/wallet-main.js');
    const { getAllByTestId, findByTestId } = render(
      React.createElement(WalletMain),
    );

    // Ensure wallet and details container exist
    await findByTestId(WalletViewSelectorsIDs.WALLET_CONTAINER);
    await findByTestId(WalletDetailsIds.WALLET_DETAILS_CONTAINER);

    let beforeCount = 0;
    try {
      beforeCount = getAllByTestId(WalletDetailsIds.ACCOUNT_ITEM).length;
    } catch {}

    const addAccountButton = await findByTestId(
      WalletDetailsIds.ADD_ACCOUNT_BUTTON,
    );
    act(() => {
      fireEvent.press(addAccountButton);
    });

    await waitFor(() => {
      const after = getAllByTestId(WalletDetailsIds.ACCOUNT_ITEM).length;
      expect(after).toBeGreaterThanOrEqual(beforeCount + 1);
    });
  });
});
