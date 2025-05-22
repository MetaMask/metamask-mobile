import React from 'react';
import { Text } from 'react-native';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  downgradeAccountConfirmation,
  getAppStateForConfirmation,
  personalSignatureConfirmationState,
  upgradeAccountConfirmation,
  upgradeOnlyAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
// eslint-disable-next-line import/no-namespace
import * as QRHardwareHook from '../../context/qr-hardware-context/qr-hardware-context';
import Info from './info-root';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

const MockText = Text;
jest.mock('../qr-info', () => () => <MockText>QR Scanning Component</MockText>);

jest.mock('../../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
      getOrAddQRKeyring: jest.fn(),
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
    TokenListController: {
      fetchTokenList: jest.fn(),
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

describe('Info', () => {
  it('renders correctly for personal sign', () => {
    const { getByText } = renderWithProvider(<Info />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Message')).toBeDefined();
    expect(getByText('Example `personal_sign` message')).toBeDefined();
  });

  it('renders QRInfo if user is signing using QR hardware', () => {
    jest.spyOn(QRHardwareHook, 'useQRHardwareContext').mockReturnValue({
      isSigningQRObject: true,
    } as unknown as QRHardwareHook.QRHardwareContextType);
    const { getByText } = renderWithProvider(<Info />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('QR Scanning Component')).toBeTruthy();
  });

  it('renders SwitchAccountType for smart account type - downgrade confirmations', () => {
    const { getByText } = renderWithProvider(<Info />, {
      state: getAppStateForConfirmation(downgradeAccountConfirmation),
    });
    expect(getByText('Switching To')).toBeTruthy();
    expect(getByText('Standard Account')).toBeTruthy();
  });

  it('renders SwitchAccountType for smart account type - upgrade confirmations', () => {
    const { getByText } = renderWithProvider(<Info />, {
      state: getAppStateForConfirmation(upgradeOnlyAccountConfirmation),
    });
    expect(getByText('Switching To')).toBeTruthy();
    expect(getByText('Smart Account')).toBeTruthy();
  });

  it('renders correctly for smart account type - upgrade + batched confirmations', () => {
    const { getByText } = renderWithProvider(<Info />, {
      state: getAppStateForConfirmation(upgradeAccountConfirmation),
    });
    expect(getByText('Estimated changes')).toBeTruthy();
    expect(getByText('Switching To')).toBeTruthy();
    expect(getByText('Smart Account')).toBeTruthy();
  });
});
