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
import { swapsUtils } from '@metamask/swaps-controller';
import {
  BALANCE_TEST_ID,
  TOKEN_AMOUNT_BALANCE_TEST_ID,
} from '../AssetElement/index.constants';
import { SolScope, SolAccountType } from '@metamask/keyring-api';
import { useSendNonEvmAsset } from '../../hooks/useSendNonEvmAsset';

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
    // Default mock setup for the hook - return false to continue with EVM flow
    mockSendNonEvmAsset.mockResolvedValue(false);
    (useSendNonEvmAsset as jest.Mock).mockReturnValue({
      sendNonEvmAsset: mockSendNonEvmAsset,
      isNonEvmAccount: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should render correctly', async () => {
    const container = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayFundButton
        displaySwapsButton
        displayBridgeButton
        swapsIsLive
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
        displayFundButton
        displaySwapsButton
        displayBridgeButton
        swapsIsLive
        networkName="Ethereum Mainnet"
      />,
      { state: mockInitialState },
    );

    const buyButton = getByTestId(TokenOverviewSelectorsIDs.FUND_BUTTON);
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

  it('should handle send button press', async () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayFundButton
        displaySwapsButton
        displayBridgeButton
        swapsIsLive
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
      <AssetOverview
        asset={nativeAsset}
        displayFundButton
        displaySwapsButton
        displayBridgeButton
        swapsIsLive
      />,
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
      <AssetOverview
        asset={asset}
        displayFundButton
        displaySwapsButton
        displayBridgeButton
        swapsIsLive
      />,
      { state: mockInitialState },
    );

    const swapButton = getByTestId('token-swap-button');
    fireEvent.press(swapButton);

    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenNthCalledWith(1, 'WalletTabHome', {
      screen: 'WalletTabStackFlow',
      params: {
        screen: 'WalletView',
      },
    });
    expect(navigate).toHaveBeenNthCalledWith(2, 'Swaps', {
      screen: 'SwapsAmountView',
      params: { sourceToken: '0x123', chainId: '0x1', sourcePage: 'MainView' },
    });
  });

  it('should handle receive button press', async () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayFundButton
        displaySwapsButton
        displayBridgeButton
        swapsIsLive
      />,
      { state: mockInitialState },
    );

    const receiveButton = getByTestId('token-receive-button');
    fireEvent.press(receiveButton);

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenNthCalledWith(1, 'QRTabSwitcher', {
      disableTabber: true,
      initialScreen: 1,
      networkName: undefined,
    });
  });

  it('should handle bridge button press', async () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayFundButton
        displaySwapsButton
        displayBridgeButton
        swapsIsLive
      />,
      { state: mockInitialState },
    );

    const receiveButton = getByTestId('token-bridge-button');
    fireEvent.press(receiveButton);

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenNthCalledWith(1, 'BrowserTabHome', {
      params: {
        newTabUrl:
          'https://portfolio.metamask.io/bridge/?metamaskEntry=mobile&srcChain=1',
        timestamp: 123,
      },
      screen: 'BrowserView',
    });
  });

  it('should not render swap button if displaySwapsButton is false', async () => {
    const { queryByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayFundButton
        displaySwapsButton={false}
        displayBridgeButton
      />,
      { state: mockInitialState },
    );

    const swapButton = queryByTestId('token-swap-button');
    expect(swapButton).toBeNull();
  });

  it('should not render bridge button if displayBridgeButton is false', async () => {
    const { queryByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayFundButton
        displaySwapsButton
        displayBridgeButton={false}
      />,
      { state: mockInitialState },
    );

    const bridgeButton = queryByTestId('token-bridge-button');
    expect(bridgeButton).toBeNull();
  });

  it('should not render buy button if displayFundButton is false', async () => {
    const { queryByTestId } = renderWithProvider(
      <AssetOverview
        asset={asset}
        displayFundButton={false}
        displaySwapsButton
        displayBridgeButton
        swapsIsLive
      />,
      { state: mockInitialState },
    );

    const buyButton = queryByTestId(TokenOverviewSelectorsIDs.FUND_BUTTON);
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
        displayFundButton
        displaySwapsButton
        displayBridgeButton
        swapsIsLive
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
        displayFundButton
        displaySwapsButton
        displayBridgeButton
        swapsIsLive
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

  it('should swap into the asset when coming from search', async () => {
    const { getByTestId } = renderWithProvider(
      <AssetOverview
        asset={assetFromSearch}
        displayFundButton
        displaySwapsButton
        swapsIsLive
      />,
      { state: mockInitialState },
    );

    const swapButton = getByTestId('token-swap-button');
    fireEvent.press(swapButton);

    // Wait for all promises to resolve
    await Promise.resolve();

    expect(navigate).toHaveBeenCalledWith('Swaps', {
      screen: 'SwapsAmountView',
      params: {
        sourceToken: swapsUtils.NATIVE_SWAPS_TOKEN_ADDRESS,
        destinationToken: assetFromSearch.address,
        sourcePage: 'MainView',
        chainId: assetFromSearch.chainId,
      },
    });
  });

  it('should prompt to add the network if coming from search and on a different chain', async () => {
    (
      Engine.context.NetworkController
        .getNetworkConfigurationByChainId as jest.Mock
    ).mockReturnValueOnce(null);
    const differentChainAssetFromSearch = {
      ...assetFromSearch,
      chainId: '0xa',
    };
    const { getByTestId } = renderWithProvider(
      <AssetOverview
        asset={differentChainAssetFromSearch}
        displayFundButton
        displaySwapsButton
        swapsIsLive
      />,
      { state: mockInitialState },
    );

    const swapButton = getByTestId('token-swap-button');
    fireEvent.press(swapButton);

    // Wait for all promises to resolve
    await Promise.resolve();

    expect(mockAddPopularNetwork).toHaveBeenCalled();
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
          displayFundButton
          displaySwapsButton
          displayBridgeButton
          swapsIsLive
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

    it('should switch networks before swapping when on different chain', async () => {
      const differentChainAsset = {
        ...asset,
        chainId: '0x89', // Different chain (Polygon)
      };

      const { getByTestId } = renderWithProvider(
        <AssetOverview
          asset={differentChainAsset}
          displayFundButton
          displaySwapsButton
          displayBridgeButton
          swapsIsLive
        />,
        { state: mockInitialState },
      );

      const swapButton = getByTestId('token-swap-button');
      await fireEvent.press(swapButton);

      // Wait for all promises to resolve
      await Promise.resolve();

      expect(navigate).toHaveBeenCalledWith(Routes.WALLET.HOME, {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
        },
      });

      expect(
        Engine.context.NetworkController.getNetworkConfigurationByChainId,
      ).toHaveBeenCalledWith('0x89');

      // Fast-forward timers to trigger the swap navigation
      jest.advanceTimersByTime(500);

      expect(navigate).toHaveBeenCalledWith('Swaps', {
        screen: 'SwapsAmountView',
        params: {
          sourceToken: differentChainAsset.address,
          sourcePage: 'MainView',
          chainId: '0x89',
        },
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
          displayFundButton
          displaySwapsButton
          displayBridgeButton
          swapsIsLive
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

    it('render mainBalance as fiat and secondaryBalance as native with portfolio view enabled', async () => {
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
          displayFundButton
          displaySwapsButton
          displayBridgeButton
          swapsIsLive
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
          displayFundButton
          displaySwapsButton
          displayBridgeButton
          swapsIsLive
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
          displayFundButton
          displaySwapsButton
          displayBridgeButton
          swapsIsLive
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
          displayFundButton
          displaySwapsButton
          displayBridgeButton
          swapsIsLive
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
        <AssetOverview
          asset={evmAsset}
          displayFundButton
          displaySwapsButton
          displayBridgeButton
          swapsIsLive
        />,
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
});
