import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { AccountGroupId, AccountWalletId } from '@metamask/account-api';
import { SolAccountType, EthScope, SolScope } from '@metamask/keyring-api';

import { createMockInternalAccount } from '../../../../util/test/accountsControllerTestUtils';
import renderWithProvider from '../../../../util/test/renderWithProvider';

import { AddressList } from './AddressList';
import { MULTICHAIN_ADDRESS_ROW_QR_BUTTON_TEST_ID } from '../../../../component-library/components-temp/MultichainAccounts/MultichainAddressRow';
import { toFormattedAddress } from '../../../../util/address';
import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';

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

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn().mockReturnValue({});
const mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: mockAddProperties,
});

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../../core/ClipboardManager', () => ({
  setString: jest.fn(),
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

  describe('Analytics tracking', () => {
    beforeEach(() => {
      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();
      mockBuild.mockClear();
    });

    it('tracks "Copied Address" event when copy button is pressed', async () => {
      const { getAllByTestId } = renderWithAddressList();

      // Find the copy button for the first Ethereum address
      const copyButton = getAllByTestId(
        'multichain-address-row-copy-button',
      )[0];

      // Press the copy button
      fireEvent.press(copyButton);

      // Wait for async operations
      await new Promise(process.nextTick);

      // Verify createEventBuilder was called with correct event name
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        EVENT_NAME.ADDRESS_COPIED,
      );

      // Verify addProperties was called with correct properties
      expect(mockAddProperties).toHaveBeenCalledWith({
        location: 'address-list',
        chain_id_caip: 'eip155:1', // CAIP format chain ID
      });

      // Verify build was called
      expect(mockBuild).toHaveBeenCalled();

      // Verify trackEvent was called with the built event
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('tracks event with correct chain_id for different networks', async () => {
      const { getAllByTestId } = renderWithAddressList();

      // Get all copy buttons (should be multiple for different networks)
      const copyButtons = getAllByTestId('multichain-address-row-copy-button');

      // Ensure we have multiple copy buttons for different networks
      expect(copyButtons.length).toBeGreaterThan(1);

      // Press the second copy button (Solana Mainnet - rendered after ETH addresses)
      fireEvent.press(copyButtons[1]);

      await new Promise(process.nextTick);

      // Verify the chain_id_caip is correctly passed in CAIP format
      expect(mockAddProperties).toHaveBeenCalledWith({
        location: 'address-list',
        chain_id_caip: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', // Solana Mainnet
      });
    });

    it('includes location property as "address-list"', async () => {
      const { getAllByTestId } = renderWithAddressList();

      const copyButton = getAllByTestId(
        'multichain-address-row-copy-button',
      )[0];
      fireEvent.press(copyButton);

      await new Promise(process.nextTick);

      // Access the first call from this test (now properly cleared between tests)
      const addPropertiesCall = mockAddProperties.mock.calls[0][0];

      expect(addPropertiesCall).toHaveProperty('location', 'address-list');
    });
  });
});
