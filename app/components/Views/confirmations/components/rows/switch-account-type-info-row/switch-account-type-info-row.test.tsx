import React from 'react';

import {
  downgradeAccountConfirmation,
  getAppStateForConfirmation,
  upgradeAccountConfirmation,
  upgradeOnlyAccountConfirmation,
} from '../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import SwitchAccountTypeInfoRow from './switch-account-type-info-row';

jest.mock('../../../../../hooks/AssetPolling/AssetPollingProvider', () => ({
  AssetPollingProvider: () => null,
}));

jest.mock('../../../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
    },
    GasFeeController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
    NetworkController: {
      getNetworkConfigurationByNetworkClientId: jest.fn(),
    },
    AccountsController: {
      state: {
        internalAccounts: {
          accounts: {
            '1': {
              address: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
            },
          },
        },
      },
    },
    TransactionController: {
      getNonceLock: jest.fn().mockReturnValue({ releaseLock: jest.fn() }),
      updateTransaction: jest.fn(),
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
  },
}));

describe('SwitchAccountTypeInfoRow', () => {
  it('renders correctly for upgrade confirmation', () => {
    const { getByText } = renderWithProvider(<SwitchAccountTypeInfoRow />, {
      state: getAppStateForConfirmation(upgradeOnlyAccountConfirmation),
    });
    expect(getByText('Now')).toBeDefined();
    expect(getByText('Standard account')).toBeDefined();
    expect(getByText('Switching to')).toBeDefined();
    expect(getByText('Smart account')).toBeDefined();
  });

  it('renders correctly for upgrade+batched confirmation', () => {
    const { getByText } = renderWithProvider(<SwitchAccountTypeInfoRow />, {
      state: getAppStateForConfirmation(upgradeAccountConfirmation),
    });
    expect(getByText('Now')).toBeDefined();
    expect(getByText('Standard account')).toBeDefined();
    expect(getByText('Switching to')).toBeDefined();
    expect(getByText('Smart account')).toBeDefined();
  });

  it('renders correctly for downgrade confirmation', () => {
    const { getByText } = renderWithProvider(<SwitchAccountTypeInfoRow />, {
      state: getAppStateForConfirmation(downgradeAccountConfirmation),
    });
    expect(getByText('Now')).toBeDefined();
    expect(getByText('Smart account')).toBeDefined();
    expect(getByText('Switching to')).toBeDefined();
    expect(getByText('Standard account')).toBeDefined();
  });
});
