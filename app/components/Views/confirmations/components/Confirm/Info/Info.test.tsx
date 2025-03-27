import React from 'react';
import { Text } from 'react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
// eslint-disable-next-line import/no-namespace
import * as QRHardwareHook from '../../../context/QRHardwareContext/QRHardwareContext';
import Info from './Info';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

const MockText = Text;
jest.mock('./QRInfo', () => () => <MockText>QR Scanning Component</MockText>);

jest.mock('../../../../../../core/Engine', () => ({
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
});
