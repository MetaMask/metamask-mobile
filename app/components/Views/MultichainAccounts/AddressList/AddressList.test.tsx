import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { AccountGroupId, AccountWalletId } from '@metamask/account-api';
import { SolAccountType, EthScope, SolScope } from '@metamask/keyring-api';

import { createMockInternalAccount } from '../../../../util/test/accountsControllerTestUtils';
import renderWithProvider from '../../../../util/test/renderWithProvider';

import { AddressList } from './AddressList';
import { MULTICHAIN_ADDRESS_ROW_QR_BUTTON_TEST_ID } from '../../../../component-library/components-temp/MultichainAccounts/MultichainAddressRow';
import { toFormattedAddress } from '../../../../util/address';

const ACCOUNT_WALLET_ID = 'entropy:wallet-id-1' as AccountWalletId;
const ACCOUNT_GROUP_ID = 'entropy:wallet-id-1/1' as AccountGroupId;

const TITLE = 'Test Address List';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    setOptions: mockSetOptions,
  }),
}));

jest.mock('../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn().mockReturnValue({
    title: TITLE,
    groupId: ACCOUNT_GROUP_ID,
  }),
  useRoute: jest.fn(),
  createNavigationDetails: jest.fn(),
}));

const mockEthEoaAccount = {
  ...createMockInternalAccount(
    '0x4fec2622fb662e892dd0e5060b91fa49ddcfdcb5',
    'Eth Account 1',
  ),
  id: 'mock-eth-account-1',
  scopes: [EthScope.Eoa],
  groupId: 'entropy:wallet-id-1/1"',
};
const shortenedEthAddress = '0x4FeC2...fdcB5';

const mockSolAccount = {
  ...createMockInternalAccount(
    'FcdCd3moFy29rZDxjt9jhT5HpFB8VssD6c79g4UGPZgj',
    'Sol Account 1',
  ),
  id: 'mock-eth-account-2',
  scopes: [SolScope.Mainnet, SolScope.Testnet, SolScope.Devnet],
  type: SolAccountType.DataAccount,
};
const shortenedSolAddress = 'FcdCd3m...GPZgj';

const renderWithAddressList = () => {
  const mockAccountsControllerState = {
    internalAccounts: {
      accounts: {
        [mockEthEoaAccount.id]: mockEthEoaAccount,
        [mockSolAccount.id]: mockSolAccount,
      },
    },
  };

  const mockAccountTreeControllerState = {
    accountTree: {
      wallets: {
        [ACCOUNT_WALLET_ID]: {
          id: ACCOUNT_WALLET_ID,
          metadata: { name: 'Mock Wallet' },
          groups: {
            [ACCOUNT_GROUP_ID]: {
              accounts: [mockEthEoaAccount.id, mockSolAccount.id],
              id: ACCOUNT_GROUP_ID,
            },
          },
        },
      },
    },
  };

  const mockNetworkControllerState = {
    networkConfigurationsByChainId: {
      0x1: {
        chainId: '0x1',
        name: 'Ethereum',
      },
      0xaa36a7: {
        chainId: '0xaa36a7',
        name: 'Sepolia Test Network',
      },
      0x2105: {
        chainId: '0x2105',
        name: 'Base',
      },
      0xa4b1: {
        chainId: '0xa4b1',
        name: 'Arbitrum One',
      },
    },
  };

  const mockMultichainNetworkController = {
    multichainNetworkConfigurationsByChainId: {
      [SolScope.Mainnet]: {
        name: 'Solana Mainnet',
        chainId: SolScope.Mainnet,
        isTestnet: false,
      },
      [SolScope.Testnet]: {
        name: 'Solana Testnet',
        chainId: SolScope.Testnet,
        isTestnet: true,
      },
      [SolScope.Devnet]: {
        name: 'Solana Devnet',
        chainId: SolScope.Devnet,
        isTestnet: true,
      },
    },
  };

  const mockState = {
    engine: {
      backgroundState: {
        AccountsController: mockAccountsControllerState,
        AccountTreeController: mockAccountTreeControllerState,
        NetworkController: mockNetworkControllerState,
        MultichainNetworkController: mockMultichainNetworkController,
      },
    },
  };

  return renderWithProvider(<AddressList />, {
    state: mockState,
  });
};

describe('AddressList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with list of addresses from a specific account group', () => {
    const { getAllByText, getByText } = renderWithAddressList();

    // The title is set in navigation options, not rendered in the component
    expect(mockSetOptions).toHaveBeenCalledWith({
      header: expect.any(Function),
      headerShown: true,
    });

    expect(getAllByText(shortenedEthAddress).length).toBe(3);
    expect(getByText('Ethereum')).toBeDefined();
    expect(getByText('Base')).toBeDefined();
    expect(getByText('Arbitrum One')).toBeDefined();

    expect(getAllByText(shortenedSolAddress).length).toBe(1);
    expect(getByText('Solana Mainnet')).toBeDefined();
  });

  it('sets navigation options when title is provided', () => {
    renderWithAddressList();

    expect(mockSetOptions).toHaveBeenCalledWith({
      header: expect.any(Function),
      headerShown: true,
    });
  });

  it('does not set navigation options when title is not provided', () => {
    const { useParams } = jest.requireMock(
      '../../../../util/navigation/navUtils',
    );
    useParams.mockReturnValue({
      title: null,
      groupId: ACCOUNT_GROUP_ID,
    });

    renderWithAddressList();

    expect(mockSetOptions).not.toHaveBeenCalled();
  });

  it('navigates to QR code screen when QR button is pressed', () => {
    const { getByTestId } = renderWithAddressList();

    const qrButton = getByTestId(
      `${MULTICHAIN_ADDRESS_ROW_QR_BUTTON_TEST_ID}-eip155:1`,
    );

    // Simulate button press by calling the onPress function directly
    fireEvent.press(qrButton);

    expect(mockNavigate).toHaveBeenCalledWith(
      'MultichainAccountDetailActions',
      {
        screen: 'ShareAddressQR',
        params: {
          address: toFormattedAddress(mockEthEoaAccount.address),
          networkName: 'Ethereum',
          chainId: 'eip155:1',
          groupId: ACCOUNT_GROUP_ID,
        },
      },
    );
  });
});
