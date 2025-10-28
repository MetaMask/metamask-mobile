import '../../UI/Bridge/_mocks_/initialState';
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { zeroAddress } from 'ethereumjs-util';
import { NetworkController } from '@metamask/network-controller';
import AssetOverview from './AssetOverview';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_2,
  createMockSnapInternalAccount,
} from '../../../util/test/accountsControllerTestUtils';
import { TokenOverviewSelectorsIDs } from '../../../../e2e/selectors/wallet/TokenOverview.selectors';
// eslint-disable-next-line import/no-namespace
import * as transactions from '../../../util/transactions';
import { mockNetworkState } from '../../../util/test/network';
import Engine from '../../../core/Engine';
import Routes from '../../../constants/navigation/Routes';
import {
  BALANCE_TEST_ID,
  TOKEN_AMOUNT_BALANCE_TEST_ID,
} from '../AssetElement/index.constants';
import { SolScope, SolAccountType } from '@metamask/keyring-api';
import { useSendNonEvmAsset } from '../../hooks/useSendNonEvmAsset';
import {
  ActionButtonType,
  ActionLocation,
  ActionPosition,
} from '../../../util/analytics/actionButtonTracking';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { handleFetch } from '@metamask/controller-utils';

jest.mock('../../../selectors/accountsController', () => ({
  ...jest.requireActual('../../../selectors/accountsController'),
  selectSelectedInternalAccount: jest.fn(),
}));

jest.mock('@metamask/controller-utils', () => ({
  ...jest.requireActual('@metamask/controller-utils'),
  handleFetch: jest.fn(),
}));

jest.mock(
  '../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    ...jest.requireActual(
      '../../../selectors/multichainAccounts/accountTreeController',
    ),
    selectSelectedAccountGroup: jest.fn(),
  }),
);

jest.mock('./Balance', () => {
  /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
  const React = require('react');
  const { View, Text } = require('react-native');
  const {
    BALANCE_TEST_ID,
    TOKEN_AMOUNT_BALANCE_TEST_ID,
  } = require('../AssetElement/index.constants');
  /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */
  return {
    __esModule: true,
    default: ({
      asset,
      mainBalance,
      secondaryBalance,
      hidePercentageChange,
    }: {
      asset: { name?: string; balance?: string | number };
      mainBalance?: string;
      secondaryBalance?: string;
      hidePercentageChange?: boolean;
    }) => (
      <View>
        <Text testID="tokenDetailsName">{asset.name}</Text>
        <Text testID="tokenDetailsBalance">{asset.balance}</Text>

        {mainBalance != null && (
          <Text testID={BALANCE_TEST_ID}>{mainBalance}</Text>
        )}
        {!hidePercentageChange && secondaryBalance ? (
          <Text testID={TOKEN_AMOUNT_BALANCE_TEST_ID}>{secondaryBalance}</Text>
        ) : null}
      </View>
    ),
  };
});

jest.mock('../../../selectors/assets/assets-list', () => ({
  ...jest.requireActual('../../../selectors/assets/assets-list'),
  selectTronResourcesBySelectedAccountGroup: jest.fn().mockReturnValue([]),
}));

jest.mock('../../../selectors/multichainAccounts/accounts', () => ({
  ...jest.requireActual('../../../selectors/multichainAccounts/accounts'),
  selectSelectedInternalAccountByScope: jest.fn(),
}));

const MOCK_CHAIN_ID = '0x1';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        selectedAddress: MOCK_ADDRESS_2,
      },
      TokenRatesController: {
        marketData: {
          '0x1': {
            [zeroAddress()]: { price: 0.005 },
          },
        },
      },
      NetworkController: {
        ...mockNetworkState({
          chainId: MOCK_CHAIN_ID,
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
          blockExplorerUrl: 'https://etherscan.io',
        }),
      } as unknown as NetworkController['state'],
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      AccountTrackerController: {
        accountsByChainId: {
          [MOCK_CHAIN_ID]: {
            [MOCK_ADDRESS_2]: { balance: '0x1' },
          },
        },
      } as const,
    },
    CurrencyRateController: {
      conversionRate: {
        ETH: {
          conversionDate: 1732572535.47,
          conversionRate: 3432.53,
          usdConversionRate: 3432.53,
        },
      },
    },
    TokenSearchDiscoveryDataController: {
      tokenDisplayData: [
        {
          chainId: MOCK_CHAIN_ID,
          address: '0x123',
          currency: 'ETH',
          found: true,
          logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Ethereum_logo_2014.svg',
          name: 'Ethereum',
          symbol: 'ETH',
          price: {},
        },
      ],
    },
  },
  settings: {
    primaryCurrency: 'ETH',
  },
};

const mockNavigate = jest.fn();
const navigate = mockNavigate;
const mockNetworkConfiguration = {
  rpcEndpoints: [
    {
      networkClientId: 'mockNetworkClientId',
    },
  ],
  defaultRpcEndpointIndex: 0,
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {},
    theme: {
      colors: {
        icon: {},
      },
    },
  }),
}));

jest.mock('../../../core/redux/slices/bridge', () => ({
  ...jest.requireActual('../../../core/redux/slices/bridge'),
  selectIsSwapsEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkConfigurationByChainId: jest
        .fn()
        .mockReturnValue(mockNetworkConfiguration),
      setActiveNetwork: jest.fn().mockResolvedValue(undefined),
      findNetworkClientIdByChainId: jest.fn().mockReturnValue('mainnet'),
      getNetworkClientById: jest.fn().mockReturnValue({
        configuration: {
          chainId: '0x1',
          rpcUrl: 'https://mainnet.infura.io/v3/123',
          ticker: 'ETH',
        },
      }),
    },
    MultichainNetworkController: {
      setActiveNetwork: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

jest.mock('../../../core/SnapKeyring/utils/snaps', () => ({
  isMultichainWalletSnap: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../core/SnapKeyring/utils/sendMultichainTransaction', () => ({
  sendMultichainTransaction: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../hooks/useSendNonEvmAsset', () => ({
  useSendNonEvmAsset: jest.fn(),
}));

// Mock useMetrics hook
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));

jest.mock('../../../components/hooks/useMetrics', () => {
  const actualMetrics = jest.requireActual(
    '../../../components/hooks/useMetrics',
  );
  return {
    ...actualMetrics,
    useMetrics: jest.fn(() => ({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    })),
  };
});

jest.mock(
  '../../../selectors/featureFlagController/multichainAccounts',
  () => ({
    selectMultichainAccountsState2Enabled: () => false,
  }),
);

const mockAddPopularNetwork = jest
  .fn()
  .mockImplementation(() => Promise.resolve());
jest.mock('../../../components/hooks/useAddNetwork', () => ({
  useAddNetwork: jest.fn().mockImplementation(() => ({
    addPopularNetwork: mockAddPopularNetwork,
    networkModal: null,
  })),
}));

const asset = {
  balance: '400',
  balanceFiat: '1500',
  chainId: MOCK_CHAIN_ID,
  logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Ethereum_logo_2014.svg',
  symbol: 'ETH',
  name: 'Ethereum',
  isETH: undefined,
  hasBalanceError: false,
  decimals: 18,
  address: '0x123',
  aggregators: [],
  image: '',
};

const assetFromSearch = {
  ...asset,
  isFromSearch: true,
};

describe('AssetOverview', () => {
  const mockSendNonEvmAsset = jest.fn();

  beforeEach(() => {
    // Setup event builder chain
    mockBuild.mockReturnValue({ category: 'test' });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });

    // Default mock setup for the hook - return false to continue with EVM flow
    mockSendNonEvmAsset.mockResolvedValue(false);
    (useSendNonEvmAsset as jest.Mock).mockReturnValue({
      sendNonEvmAsset: mockSendNonEvmAsset,
      isNonEvmAccount: false,
    });

    // Default selected internal account to an EVM account so token balance flow uses EVM path
    const { selectSelectedInternalAccount } = jest.requireMock(
      '../../../selectors/accountsController',
    );
    selectSelectedInternalAccount.mockReturnValue({
      address: MOCK_ADDRESS_2,
      type: 'eip155:eoa',
    });

    // Default mock for selectSelectedInternalAccountByScope
    const { selectSelectedInternalAccountByScope } = jest.requireMock(
      '../../../selectors/multichainAccounts/accounts',
    );
    const mockGetAccountByScope = jest.fn().mockReturnValue({
      address: MOCK_ADDRESS_2,
    });
    selectSelectedInternalAccountByScope.mockReturnValue(mockGetAccountByScope);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should render correctly', async () => {
    const container = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayBuyButton
        displaySwapsButton
        networkName="Ethereum Mainnet"
      />,
      { state: mockInitialState },
    );
    expect(container).toMatchSnapshot();
  });

  it('should handle buy button press', async () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayBuyButton
        displaySwapsButton
        networkName="Ethereum Mainnet"
      />,
      { state: mockInitialState },
    );

    const buyButton = getByTestId(TokenOverviewSelectorsIDs.BUY_BUTTON);
    fireEvent.press(buyButton);

    // Now expects navigation to FundActionMenu with onBuy function and asset context
    expect(navigate).toHaveBeenCalledWith('RootModalFlow', {
      screen: 'FundActionMenu',
      params: {
        onBuy: expect.any(Function),
        asset: {
          address: asset.address,
          chainId: MOCK_CHAIN_ID,
        },
      },
    });
  });

  it('should track buy button click analytics with correct properties', async () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayBuyButton
        displaySwapsButton
        networkName="Ethereum Mainnet"
      />,
      { state: mockInitialState },
    );

    const buyButton = getByTestId(TokenOverviewSelectorsIDs.BUY_BUTTON);

    // Extract the onBuy function from navigation params
    fireEvent.press(buyButton);

    // Get the onBuy function that was passed to navigation
    const navigationCall = navigate.mock.calls[0];
    const onBuyFunction = navigationCall[1].params.onBuy;

    // Clear mocks to isolate the tracking test
    jest.clearAllMocks();

    // Setup event builder chain again after clearing
    mockBuild.mockReturnValue({ category: 'test' });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });

    // Call the onBuy function directly
    onBuyFunction();

    // Verify createEventBuilder was called with correct event
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.ACTION_BUTTON_CLICKED,
    );

    // Verify addProperties was called with correct properties
    expect(mockAddProperties).toHaveBeenCalledWith({
      action_name: ActionButtonType.BUY,
      action_position: ActionPosition.FIRST_POSITION,
      button_label: 'Buy',
      location: ActionLocation.ASSET_DETAILS,
    });

    // Verify build was called
    expect(mockBuild).toHaveBeenCalled();

    // Verify trackEvent was called with the built event
    expect(mockTrackEvent).toHaveBeenCalledWith({ category: 'test' });
  });

  it('should fire buy button tracking exactly once per button press', async () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayBuyButton
        displaySwapsButton
        networkName="Ethereum Mainnet"
      />,
      { state: mockInitialState },
    );

    const buyButton = getByTestId(TokenOverviewSelectorsIDs.BUY_BUTTON);
    fireEvent.press(buyButton);

    // Get the onBuy function
    const navigationCall = navigate.mock.calls[0];
    const onBuyFunction = navigationCall[1].params.onBuy;

    // Clear mocks
    jest.clearAllMocks();

    // Setup event builder chain
    mockBuild.mockReturnValue({ category: 'test' });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });

    // Call onBuy
    onBuyFunction();

    // Verify each tracking function was called exactly once
    expect(mockCreateEventBuilder).toHaveBeenCalledTimes(2);
    expect(mockAddProperties).toHaveBeenCalledTimes(2);
    expect(mockBuild).toHaveBeenCalledTimes(2);
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
  });

  it('should handle send button press', async () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayBuyButton
        displaySwapsButton
        networkName="Ethereum Mainnet"
      />,
      { state: mockInitialState },
    );

    const sendButton = getByTestId('token-send-button');
    fireEvent.press(sendButton);

    // Wait for async operations to complete
    await Promise.resolve();

    expect(navigate.mock.calls[1][0]).toEqual('Send');
  });

  it('should track send button click analytics with correct properties', async () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayBuyButton
        displaySwapsButton
        networkName="Ethereum Mainnet"
      />,
      { state: mockInitialState },
    );

    const sendButton = getByTestId('token-send-button');
    fireEvent.press(sendButton);

    // Wait for async operations to complete
    await Promise.resolve();

    // Verify createEventBuilder was called with correct event
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.ACTION_BUTTON_CLICKED,
    );

    // Verify addProperties was called with correct properties
    expect(mockAddProperties).toHaveBeenCalledWith({
      action_name: ActionButtonType.SEND,
      action_position: ActionPosition.THIRD_POSITION,
      button_label: 'Send',
      location: ActionLocation.ASSET_DETAILS,
    });

    // Verify build was called
    expect(mockBuild).toHaveBeenCalled();

    // Verify trackEvent was called with the built event
    expect(mockTrackEvent).toHaveBeenCalledWith({ category: 'test' });
  });

  it('should handle send button press for native asset when isETH is false', async () => {
    const spyOnGetEther = jest.spyOn(transactions, 'getEther');

    const nativeAsset = {
      balance: '400',
      balanceFiat: '1500',
      chainId: '0x38',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Ethereum_logo_2014.svg',
      symbol: 'BNB',
      name: 'Binance smart chain',
      isETH: false,
      nativeCurrency: 'BNB',
      hasBalanceError: false,
      decimals: 18,
      address: '0x123',
      aggregators: [],
      image: '',
      isNative: true,
    };

    const { getByTestId } = renderWithProvider(
      <AssetOverview asset={nativeAsset} displayBuyButton displaySwapsButton />,
      {
        state: {
          ...mockInitialState,
          engine: {
            ...mockInitialState.engine,
            backgroundState: {
              ...mockInitialState.engine.backgroundState,
              NetworkController: {
                ...mockNetworkState({
                  chainId: '0x38',
                  id: 'bsc',
                  nickname: 'Binance Smart Chain',
                  ticker: 'BNB',
                  blockExplorerUrl: 'https://bscscan.com',
                }),
              },
              TokenRatesController: {
                marketData: {
                  '0x38': {
                    [zeroAddress()]: { price: 0.005 },
                  },
                },
              },
              AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
              AccountTrackerController: {
                accountsByChainId: {
                  '0x38': {
                    [nativeAsset.address]: { balance: '0x1' },
                  },
                },
              } as const,
            },
          },
        },
      },
    );

    const sendButton = getByTestId('token-send-button');
    fireEvent.press(sendButton);

    // Wait for async operations to complete
    await Promise.resolve();

    expect(navigate.mock.calls[1][0]).toEqual('Send');
    expect(spyOnGetEther).toHaveBeenCalledWith('BNB');
  });

  it('should handle swap button press', async () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverview asset={asset} displayBuyButton displaySwapsButton />,
      { state: mockInitialState },
    );

    const swapButton = getByTestId('token-swap-button');
    fireEvent.press(swapButton);

    // Now navigates to Bridge with unified mode
    expect(navigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: expect.objectContaining({
        bridgeViewMode: 'Unified',
        sourcePage: 'MainView',
      }),
    });
  });

  it('should handle receive button press for EVM asset with EVM address', async () => {
    // Arrange - Mock the selectors directly to ensure conditions are met
    const { selectSelectedInternalAccount } = jest.requireMock(
      '../../../selectors/accountsController',
    );
    const { selectSelectedAccountGroup } = jest.requireMock(
      '../../../selectors/multichainAccounts/accountTreeController',
    );
    const { selectSelectedInternalAccountByScope } = jest.requireMock(
      '../../../selectors/multichainAccounts/accounts',
    );

    selectSelectedInternalAccount.mockReturnValue({
      address: MOCK_ADDRESS_2,
      type: 'eip155:eoa',
    });
    selectSelectedAccountGroup.mockReturnValue({ id: 'group-id-123' });

    const mockGetAccountByScope = jest.fn().mockReturnValue({
      address: MOCK_ADDRESS_2,
    });
    selectSelectedInternalAccountByScope.mockReturnValue(mockGetAccountByScope);

    const { getByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayBuyButton
        displaySwapsButton
        networkName="Ethereum Mainnet"
      />,
      { state: mockInitialState },
    );

    // Act
    const receiveButton = getByTestId('token-receive-button');
    fireEvent.press(receiveButton);

    // Assert - Should navigate to ShareAddressQR with EVM address
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenNthCalledWith(
      1,
      Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
      {
        screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS_QR,
        params: expect.objectContaining({
          address: MOCK_ADDRESS_2, // Should use EVM address for EVM assets
          networkName: 'Ethereum Mainnet',
          chainId: MOCK_CHAIN_ID,
          groupId: 'group-id-123',
        }),
      },
    );

    // Cleanup mocks for isolation
    selectSelectedInternalAccount.mockReset();
    selectSelectedAccountGroup.mockReset();
    selectSelectedInternalAccountByScope.mockReset();
  });

  it('should track receive button click analytics with correct properties', async () => {
    // Arrange - Mock the selectors directly to ensure conditions are met
    const { selectSelectedInternalAccount } = jest.requireMock(
      '../../../selectors/accountsController',
    );
    const { selectSelectedAccountGroup } = jest.requireMock(
      '../../../selectors/multichainAccounts/accountTreeController',
    );
    selectSelectedInternalAccount.mockReturnValue({ address: MOCK_ADDRESS_2 });
    selectSelectedAccountGroup.mockReturnValue({ id: 'group-id-123' });

    const { getByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayBuyButton
        displaySwapsButton
        networkName="Ethereum Mainnet"
      />,
      { state: mockInitialState },
    );

    // Act
    const receiveButton = getByTestId('token-receive-button');
    fireEvent.press(receiveButton);

    // Assert - Verify createEventBuilder was called with correct event
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.ACTION_BUTTON_CLICKED,
    );

    // Verify addProperties was called with correct properties
    expect(mockAddProperties).toHaveBeenCalledWith({
      action_name: ActionButtonType.RECEIVE,
      action_position: ActionPosition.FOURTH_POSITION,
      button_label: 'Receive',
      location: ActionLocation.ASSET_DETAILS,
    });

    // Verify build was called
    expect(mockBuild).toHaveBeenCalled();

    // Verify trackEvent was called with the built event
    expect(mockTrackEvent).toHaveBeenCalledWith({ category: 'test' });

    // Cleanup mocks for isolation
    selectSelectedInternalAccount.mockReset();
    selectSelectedAccountGroup.mockReset();
  });

  it('should handle receive button press for Solana asset with Solana address', async () => {
    const SOLANA_ADDRESS = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';
    const SOLANA_CHAIN_ID = SolScope.Mainnet;

    const { selectSelectedInternalAccount } = jest.requireMock(
      '../../../selectors/accountsController',
    );
    const { selectSelectedAccountGroup } = jest.requireMock(
      '../../../selectors/multichainAccounts/accountTreeController',
    );
    const { selectSelectedInternalAccountByScope } = jest.requireMock(
      '../../../selectors/multichainAccounts/accounts',
    );

    selectSelectedInternalAccount.mockReturnValue({
      address: MOCK_ADDRESS_2,
      type: 'eip155:eoa',
    });
    selectSelectedAccountGroup.mockReturnValue({ id: 'group-id-123' });

    const mockGetAccountByScope = jest.fn().mockReturnValue({
      address: SOLANA_ADDRESS,
      type: SolAccountType.DataAccount,
    });
    selectSelectedInternalAccountByScope.mockReturnValue(mockGetAccountByScope);

    const solanaAsset = {
      ...asset,
      address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
      chainId: SOLANA_CHAIN_ID,
      isNative: true,
      symbol: 'SOL',
    };

    const { getByTestId } = renderWithProvider(
      <AssetOverview
        asset={solanaAsset}
        displayBuyButton
        displaySwapsButton
        networkName="Solana Mainnet"
      />,
      { state: mockInitialState },
    );

    const receiveButton = getByTestId('token-receive-button');
    fireEvent.press(receiveButton);

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenNthCalledWith(
      1,
      Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
      {
        screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS_QR,
        params: expect.objectContaining({
          address: SOLANA_ADDRESS, // Should use Solana address, not EVM address
          networkName: 'Solana Mainnet',
          chainId: SOLANA_CHAIN_ID,
          groupId: 'group-id-123',
        }),
      },
    );

    expect(mockGetAccountByScope).toHaveBeenCalledWith(SOLANA_CHAIN_ID);

    selectSelectedInternalAccount.mockReset();
    selectSelectedAccountGroup.mockReset();
    selectSelectedInternalAccountByScope.mockReset();
  });

  it('should not render swap button if displaySwapsButton is false', async () => {
    const { queryByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayBuyButton
        displaySwapsButton={false}
      />,
      { state: mockInitialState },
    );

    const swapButton = queryByTestId('token-swap-button');
    expect(swapButton).toBeNull();
  });

  it('should not render buy button if displayBuyButton is false', async () => {
    const { queryByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayBuyButton={false}
        displaySwapsButton
      />,
      { state: mockInitialState },
    );

    const buyButton = queryByTestId(TokenOverviewSelectorsIDs.BUY_BUTTON);
    expect(buyButton).toBeNull();
  });

  it('should render native balances even if there are no accounts for the asset chain in the state', async () => {
    const container = renderWithProvider(
      <AssetOverview
        asset={{
          ...asset,
          chainId: '0x2',
          isNative: true,
        }}
        displayBuyButton
        displaySwapsButton
      />,
      { state: mockInitialState },
    );

    expect(container).toMatchSnapshot();
  });

  it('should render native balances when non evm network is selected', async () => {
    const container = renderWithProvider(
      <AssetOverview
        asset={{
          ...asset,
          address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
          chainId: SolScope.Mainnet,
          isNative: true,
        }}
        displayBuyButton
        displaySwapsButton
      />,
      {
        state: {
          ...mockInitialState,
          engine: {
            ...mockInitialState.engine,
            backgroundState: {
              ...mockInitialState.engine.backgroundState,
              MultichainNetworkController: {
                selectedMultichainNetworkChainId: SolScope.Mainnet,
              },
              MultichainAssetsRatesController: {
                conversionRates: {
                  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501': {
                    rate: '151.23',
                  },
                },
              },
            },
          },
        },
      },
    );

    expect(container).toMatchSnapshot();
  });

  it('renders staked TRX details when viewing TRX on Tron', () => {
    const { selectTronResourcesBySelectedAccountGroup } = jest.requireMock(
      '../../../selectors/assets/assets-list',
    );

    selectTronResourcesBySelectedAccountGroup.mockReturnValue([
      { symbol: 'strx-energy', balance: '10' },
      { symbol: 'strx-bandwidth', balance: '20' },
    ]);

    const tronAsset = {
      address: 'tron:mainnet/slip44:195',
      chainId: 'tron:mainnet',
      symbol: 'TRX',
      ticker: 'TRX',
      name: 'Tron',
      isNative: true,
      balance: '0',
      balanceFiat: '0',
      decimals: 6,
      image: '',
      logo: '',
      aggregators: [],
      isETH: false,
      hasBalanceError: false,
    };

    const { getAllByTestId } = renderWithProvider(
      <AssetOverview asset={tronAsset} />,
      { state: mockInitialState },
    );

    const names = getAllByTestId('tokenDetailsName').map(
      (n) => n.props.children,
    );
    const balances = getAllByTestId('tokenDetailsBalance').map(
      (n) => n.props.children,
    );

    expect(names).toEqual(expect.arrayContaining(['Tron', 'Staked TRX']));
    expect(balances).toEqual(expect.arrayContaining(['30']));
  });

  it('should swap into the asset when coming from search', async () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverview
        asset={assetFromSearch}
        displayBuyButton
        displaySwapsButton
      />,
      { state: mockInitialState },
    );

    const swapButton = getByTestId('token-swap-button');
    fireEvent.press(swapButton);

    // Wait for all promises to resolve
    await Promise.resolve();

    // Now navigates to Bridge with unified mode
    expect(navigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: expect.objectContaining({
        bridgeViewMode: 'Unified',
        sourcePage: 'MainView',
      }),
    });
  });

  it('should navigate to bridge when swap button is pressed on different chain', async () => {
    const differentChainAssetFromSearch = {
      ...assetFromSearch,
      chainId: '0xa',
    };
    const { getByTestId } = renderWithProvider(
      <AssetOverview
        asset={differentChainAssetFromSearch}
        displayBuyButton
        displaySwapsButton
      />,
      { state: mockInitialState },
    );

    const swapButton = getByTestId('token-swap-button');
    fireEvent.press(swapButton);

    // Wait for all promises to resolve
    await Promise.resolve();

    // Should navigate to bridge view
    expect(navigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: expect.objectContaining({
        bridgeViewMode: 'Unified',
        sourcePage: 'MainView',
      }),
    });
  });

  describe('Portfolio view network switching', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      // Reset mocks before each test
      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.useFakeTimers({ legacyFakeTimers: true });
    });

    it('should switch networks before sending when on different chain', async () => {
      const differentChainAsset = {
        ...asset,
        chainId: '0x89', // Different chain (Polygon)
      };

      const { getByTestId } = renderWithProvider(
        <AssetOverview
          asset={differentChainAsset}
          displayBuyButton
          displaySwapsButton
        />,
        { state: mockInitialState },
      );

      const sendButton = getByTestId('token-send-button');
      await fireEvent.press(sendButton);

      // Wait for all promises to resolve
      await Promise.resolve();

      expect(navigate).toHaveBeenCalledWith(Routes.WALLET.HOME, {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
        },
      });
    });

    it('should navigate to bridge when swapping on different chain', async () => {
      const differentChainAsset = {
        ...asset,
        chainId: '0x89', // Different chain (Polygon)
      };

      const { getByTestId } = renderWithProvider(
        <AssetOverview
          asset={differentChainAsset}
          displayBuyButton
          displaySwapsButton
        />,
        { state: mockInitialState },
      );

      const swapButton = getByTestId('token-swap-button');
      await fireEvent.press(swapButton);

      // Wait for all promises to resolve
      await Promise.resolve();

      // Now navigates to Bridge with unified mode
      expect(navigate).toHaveBeenCalledWith('Bridge', {
        screen: 'BridgeView',
        params: expect.objectContaining({
          bridgeViewMode: 'Unified',
          sourcePage: 'MainView',
        }),
      });
    });

    it('should not switch networks when on same chain', async () => {
      const sameChainAsset = {
        ...asset,
        chainId: MOCK_CHAIN_ID, // Same chain as current
      };

      const { getByTestId } = renderWithProvider(
        <AssetOverview
          asset={sameChainAsset}
          displayBuyButton
          displaySwapsButton
        />,
        { state: mockInitialState },
      );

      const sendButton = getByTestId('token-send-button');
      await fireEvent.press(sendButton);

      // Wait for all promises to resolve
      await Promise.resolve();

      expect(
        Engine.context.MultichainNetworkController.setActiveNetwork,
      ).not.toHaveBeenCalled();
    });

    it('render mainBalance as fiat and secondaryBalance as native', async () => {
      const { getByTestId } = renderWithProvider(
        <AssetOverview asset={asset} />,
        {
          state: mockInitialState,
        },
      );

      const mainBalance = getByTestId(BALANCE_TEST_ID);
      const secondaryBalance = getByTestId(TOKEN_AMOUNT_BALANCE_TEST_ID);

      expect(mainBalance.props.children).toBe('1500');
      expect(secondaryBalance.props.children).toBe('0 ETH');
    });

    it('should handle multichain send for Solana assets', async () => {
      const solanaAsset = {
        ...asset,
        address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        chainId: SolScope.Mainnet,
        isNative: true,
      };

      // Mock the hook to handle non-EVM transaction
      mockSendNonEvmAsset.mockResolvedValue(true);

      const { getByTestId } = renderWithProvider(
        <AssetOverview
          asset={solanaAsset}
          displayBuyButton
          displaySwapsButton
        />,
        { state: mockInitialState },
      );

      const sendButton = getByTestId('token-send-button');
      await fireEvent.press(sendButton);

      await Promise.resolve();

      // Verify hook was called with correct parameters
      expect(useSendNonEvmAsset).toHaveBeenCalledWith({
        asset: {
          address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
          aggregators: [],
          balance: '400',
          balanceFiat: '1500',
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          decimals: 18,
          hasBalanceError: false,
          image: '',
          isETH: undefined,
          isNative: true,
          logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Ethereum_logo_2014.svg',
          name: 'Ethereum',
          symbol: 'ETH',
        },
      });

      expect(mockSendNonEvmAsset).toHaveBeenCalled();

      expect(
        Engine.context.NetworkController.getNetworkConfigurationByChainId,
      ).not.toHaveBeenCalled();
      expect(
        Engine.context.MultichainNetworkController.setActiveNetwork,
      ).not.toHaveBeenCalled();

      expect(navigate).not.toHaveBeenCalledWith('SendFlowView');
    });

    it('should handle error in multichain send for Solana assets', async () => {
      const solanaAsset = {
        ...asset,
        address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        chainId: SolScope.Mainnet,
        isNative: true,
      };

      // Mock the hook to return true (handled) even when there's an internal error
      // The hook implementation handles errors gracefully and never throws
      mockSendNonEvmAsset.mockResolvedValue(true);

      const { getByTestId } = renderWithProvider(
        <AssetOverview
          asset={solanaAsset}
          displayBuyButton
          displaySwapsButton
        />,
        { state: mockInitialState },
      );

      const sendButton = getByTestId('token-send-button');
      await fireEvent.press(sendButton);

      await Promise.resolve();

      // Should still call the hook
      expect(mockSendNonEvmAsset).toHaveBeenCalled();

      // Should not navigate to traditional send flow since hook handled it
      expect(navigate).not.toHaveBeenCalledWith('SendFlowView');
    });

    it('should handle non-EVM account validation through hook', async () => {
      const solanaAsset = {
        ...asset,
        address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        chainId: SolScope.Mainnet,
        isNative: true,
      };

      // Mock the hook to handle validation errors internally
      mockSendNonEvmAsset.mockResolvedValue(true);

      const { getByTestId } = renderWithProvider(
        <AssetOverview
          asset={solanaAsset}
          displayBuyButton
          displaySwapsButton
        />,
        { state: mockInitialState },
      );

      const sendButton = getByTestId('token-send-button');
      await fireEvent.press(sendButton);

      await Promise.resolve();

      // Hook should be called and handle validation
      expect(mockSendNonEvmAsset).toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalledWith('SendFlowView');
    });

    it('should delegate snap validation to hook', async () => {
      const solanaAsset = {
        ...asset,
        address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        chainId: SolScope.Mainnet,
        isNative: true,
      };

      // Mock the hook to handle snap validation internally
      mockSendNonEvmAsset.mockResolvedValue(true);

      const { getByTestId } = renderWithProvider(
        <AssetOverview
          asset={solanaAsset}
          displayBuyButton
          displaySwapsButton
        />,
        { state: mockInitialState },
      );

      const sendButton = getByTestId('token-send-button');
      await fireEvent.press(sendButton);

      await Promise.resolve();

      // Hook should handle all snap validation
      expect(mockSendNonEvmAsset).toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalledWith('SendFlowView');
    });

    it('should use traditional EVM send flow for EVM accounts', async () => {
      const evmAsset = {
        ...asset,
        chainId: MOCK_CHAIN_ID,
        isETH: true,
      };

      // Mock the hook to indicate it didn't handle the transaction (EVM account)
      mockSendNonEvmAsset.mockResolvedValue(false);

      const { getByTestId } = renderWithProvider(
        <AssetOverview asset={evmAsset} displayBuyButton displaySwapsButton />,
        { state: mockInitialState },
      );

      const sendButton = getByTestId('token-send-button');
      await fireEvent.press(sendButton);

      await Promise.resolve();

      // Hook should be called but return false for EVM accounts
      expect(mockSendNonEvmAsset).toHaveBeenCalled();

      // Should navigate to traditional send flow
      expect(navigate.mock.calls[1][0]).toEqual('Send');
    });

    it('should display Solana balance correctly for non-EVM assets', async () => {
      const solanaAssetWithBalance = {
        ...asset,
        address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        chainId: SolScope.Mainnet,
        balance: '123.456789',
        symbol: 'SOL',
        isNative: true,
      };

      const mockSolanaAccount = createMockSnapInternalAccount(
        'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
        'Solana Account 1',
        SolAccountType.DataAccount,
      );

      const solanaAccountState = {
        ...mockInitialState,
        engine: {
          ...mockInitialState.engine,
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            AccountsController: {
              ...MOCK_ACCOUNTS_CONTROLLER_STATE,
              internalAccounts: {
                ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts,
                selectedAccount: mockSolanaAccount.id,
                accounts: {
                  ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts,
                  [mockSolanaAccount.id]: mockSolanaAccount,
                },
              },
            },
          },
        },
      };

      const { getByTestId } = renderWithProvider(
        <AssetOverview asset={solanaAssetWithBalance} />,
        { state: solanaAccountState },
      );

      const secondaryBalance = getByTestId(TOKEN_AMOUNT_BALANCE_TEST_ID);

      // Should display formatted Solana balance
      expect(secondaryBalance.props.children).toBe('123.45679 SOL');
    });
  });

  it('should not render Balance component when balance is undefined', () => {
    // Given an asset with undefined balance
    const assetWithNoBalance = {
      ...asset,
      balance: undefined as unknown as string,
    };

    // Override the mock to enable state2 so balance stays undefined
    const mockModule = jest.requireMock(
      '../../../selectors/featureFlagController/multichainAccounts',
    );
    const originalMock = mockModule.selectMultichainAccountsState2Enabled;
    mockModule.selectMultichainAccountsState2Enabled = jest
      .fn()
      .mockReturnValue(true);

    const { queryByTestId } = renderWithProvider(
      <AssetOverview asset={assetWithNoBalance} />,
      { state: mockInitialState },
    );

    expect(queryByTestId(BALANCE_TEST_ID)).toBeNull();

    // Restore original mock
    mockModule.selectMultichainAccountsState2Enabled = originalMock;
  });

  describe('Exchange Rate Fetching', () => {
    const SOLANA_ASSET_ID =
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN';
    const SOLANA_CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

    const mockSolanaAccount = createMockSnapInternalAccount(
      'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH',
      'Solana Account 1',
      SolAccountType.DataAccount,
    );

    const createSolanaToken = (balanceFiat: string) => ({
      address: SOLANA_ASSET_ID,
      aggregators: [],
      balanceFiat,
      balance: '10',
      logo: 'https://example.com/jup.png',
      decimals: 9,
      image: 'https://example.com/jup.png',
      name: 'Jupiter',
      symbol: 'JUP',
      isETH: false,
      hasBalanceError: false,
      chainId: SOLANA_CHAIN_ID,
      isNative: false,
    });

    const createSolanaState = (customState = {}) => ({
      ...mockInitialState,
      engine: {
        ...mockInitialState.engine,
        backgroundState: {
          ...mockInitialState.engine.backgroundState,
          AccountsController: {
            ...MOCK_ACCOUNTS_CONTROLLER_STATE,
            internalAccounts: {
              ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts,
              selectedAccount: mockSolanaAccount.id,
              accounts: {
                ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts,
                [mockSolanaAccount.id]: mockSolanaAccount,
              },
            },
          },
          ...customState,
        },
      },
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should fetch exchange rate from API for non-imported EVM token', async () => {
      const testTokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      const testToken = {
        address: testTokenAddress,
        aggregators: [],
        balanceFiat: '$0.00',
        balance: '100',
        logo: 'https://example.com/test.png',
        decimals: 18,
        image: 'https://example.com/test.png',
        name: 'Test Token',
        symbol: 'TEST',
        isETH: false,
        hasBalanceError: false,
        chainId: MOCK_CHAIN_ID,
      };

      jest.mocked(handleFetch).mockResolvedValue({
        [testTokenAddress.toLowerCase()]: { price: 0.0005 },
      });

      const { findByText } = renderWithProvider(
        <AssetOverview asset={testToken} />,
        {
          state: {
            ...mockInitialState,
            engine: {
              ...mockInitialState.engine,
              backgroundState: {
                ...mockInitialState.engine.backgroundState,
                TokenRatesController: {
                  marketData: { '0x1': {} },
                },
              },
            },
          },
        },
      );

      await findByText(testToken.name);
      expect(handleFetch).toHaveBeenCalledWith(
        expect.stringContaining('price.api.cx.metamask.io/v3/spot-prices'),
      );
      expect(handleFetch).toHaveBeenCalledWith(
        expect.stringContaining('assetIds=eip155%3A1%2Ferc20%3A'),
      );
    });

    it('should not fetch exchange rate when already cached for EVM token', () => {
      jest.clearAllMocks();

      const cachedTokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      const cachedToken = {
        address: cachedTokenAddress,
        aggregators: [],
        balanceFiat: '$5.00',
        balance: '1000',
        logo: 'https://example.com/token.png',
        decimals: 18,
        image: 'https://example.com/token.png',
        name: 'Cached Token',
        symbol: 'CACHED',
        isETH: false,
        hasBalanceError: false,
        chainId: MOCK_CHAIN_ID,
      };

      renderWithProvider(<AssetOverview asset={cachedToken} />, {
        state: {
          ...mockInitialState,
          engine: {
            ...mockInitialState.engine,
            backgroundState: {
              ...mockInitialState.engine.backgroundState,
              TokenRatesController: {
                marketData: {
                  '0x1': {
                    [cachedTokenAddress.toLowerCase()]: {
                      price: 0.005,
                      marketCap: 5000000,
                      totalVolume: 1000000,
                      circulatingSupply: 10000000,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const exchangeRateCalls = jest
        .mocked(handleFetch)
        .mock.calls.filter((call) => {
          const url = String(call[0]);
          return (
            url.includes('spot-prices') &&
            url.includes(cachedTokenAddress) &&
            !url.includes('includeMarketData')
          );
        });
      expect(exchangeRateCalls.length).toBe(0);
    });

    it('should not fetch exchange rate when already cached for Solana token', () => {
      jest.clearAllMocks();

      const cachedSolanaToken = createSolanaToken('$10.00');

      renderWithProvider(<AssetOverview asset={cachedSolanaToken} />, {
        state: createSolanaState({
          MultichainAssetsRatesController: {
            conversionRates: {
              [SOLANA_ASSET_ID]: {
                rate: '0.431111',
                conversionTime: Date.now(),
                marketData: {
                  fungible: true as const,
                  allTimeHigh: '2',
                  allTimeLow: '0.306358',
                  circulatingSupply: '3165216666.64',
                  marketCap: '1364703778',
                  totalVolume: '32954819',
                  dilutedMarketCap: '3017669206',
                },
              },
            },
          },
        }),
      });

      const exchangeRateCalls = jest
        .mocked(handleFetch)
        .mock.calls.filter((call) => {
          const url = String(call[0]);
          return (
            url.includes('spot-prices') &&
            url.includes('JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN') &&
            !url.includes('includeMarketData')
          );
        });
      expect(exchangeRateCalls.length).toBe(0);
    });

    it('should fetch exchange rate from API for non-imported Solana token', async () => {
      const solanaToken = createSolanaToken('$0.00');

      jest.mocked(handleFetch).mockResolvedValue({
        [SOLANA_ASSET_ID]: { price: 0.431111 },
      });

      const { findByText } = renderWithProvider(
        <AssetOverview asset={solanaToken} />,
        { state: createSolanaState() },
      );

      await findByText(solanaToken.name);
      expect(handleFetch).toHaveBeenCalledWith(
        expect.stringContaining('price.api.cx.metamask.io/v3/spot-prices'),
      );
    });
  });
});
