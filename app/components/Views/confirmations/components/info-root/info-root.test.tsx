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
import { approveERC20TransactionStateMock } from '../../__mocks__/approve-transaction-mock';
// eslint-disable-next-line import/no-namespace
import * as QRHardwareHook from '../../context/qr-hardware-context/qr-hardware-context';
import { ConfirmationInfoComponentIDs } from '../../constants/info-ids';
import Info from './info-root';

jest.mock('../../../../hooks/AssetPolling/AssetPollingProvider', () => ({
  AssetPollingProvider: () => null,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

const MockText = Text;
jest.mock('../qr-info', () => () => {
  const View = jest.requireActual('react-native').View;
  const componentIDs = jest.requireActual(
    '../../constants/info-ids',
  ).ConfirmationInfoComponentIDs;
  return (
    <View testID={componentIDs.QR_INFO}>
      <MockText>QR Scanning Component</MockText>
    </View>
  );
});

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
      findNetworkClientIdByChainId: jest.fn(),
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
      getTransactions: jest.fn().mockReturnValue([]),
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
    const { getByTestId } = renderWithProvider(<Info />, {
      state: personalSignatureConfirmationState,
    });
    expect(
      getByTestId(ConfirmationInfoComponentIDs.PERSONAL_SIGN),
    ).toBeDefined();
  });

  it('renders QRInfo if user is signing using QR hardware', () => {
    jest.spyOn(QRHardwareHook, 'useQRHardwareContext').mockReturnValue({
      isSigningQRObject: true,
    } as unknown as QRHardwareHook.QRHardwareContextType);
    const { getByTestId } = renderWithProvider(<Info />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByTestId(ConfirmationInfoComponentIDs.QR_INFO)).toBeDefined();
  });

  it('renders SwitchAccountType for smart account type - downgrade confirmations', () => {
    const { getByTestId, getByText } = renderWithProvider(<Info />, {
      state: getAppStateForConfirmation(downgradeAccountConfirmation),
    });
    expect(
      getByTestId(ConfirmationInfoComponentIDs.SWITCH_ACCOUNT_TYPE),
    ).toBeDefined();
    expect(getByText('Standard Account')).toBeTruthy();
  });

  it('renders SwitchAccountType for smart account type - upgrade confirmations', () => {
    const { getByTestId, getByText } = renderWithProvider(<Info />, {
      state: getAppStateForConfirmation(upgradeOnlyAccountConfirmation),
    });
    expect(
      getByTestId(ConfirmationInfoComponentIDs.SWITCH_ACCOUNT_TYPE),
    ).toBeDefined();
    expect(getByText('Smart Account')).toBeTruthy();
  });

  it('renders correctly for smart account type - upgrade + batched confirmations', () => {
    const { getByTestId } = renderWithProvider(<Info />, {
      state: getAppStateForConfirmation(upgradeAccountConfirmation),
    });
    expect(
      getByTestId(ConfirmationInfoComponentIDs.CONTRACT_INTERACTION),
    ).toBeDefined();
  });

  it('renders expected elements for approve', () => {
    const { getByTestId } = renderWithProvider(<Info />, {
      state: approveERC20TransactionStateMock,
    });
    expect(getByTestId(ConfirmationInfoComponentIDs.APPROVE)).toBeDefined();
  });
});
