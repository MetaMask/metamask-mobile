import { initialState } from '../../_mocks_/initialState';
import {
  renderScreen,
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import {
  setDestToken,
  setSourceToken,
  selectNoFeeAssets,
} from '../../../../../core/redux/slices/bridge';
import { Hex } from '@metamask/utils';
import BridgeView from '.';
import type { BridgeRouteParams } from './index';
import { createBridgeTestState } from '../../testUtils';
import { RequestStatus, type QuoteResponse } from '@metamask/bridge-controller';
import { SolScope } from '@metamask/keyring-api';
import { mockUseBridgeQuoteData } from '../../_mocks_/useBridgeQuoteData.mock';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import { strings } from '../../../../../../locales/i18n';
import { isHardwareAccount } from '../../../../../util/address';
import { MOCK_ENTROPY_SOURCE as mockEntropySource } from '../../../../../util/test/keyringControllerTestUtils';
import { RootState } from '../../../../../reducers';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { BridgeViewMode } from '../../types';

// Mock the account-tree-controller file that imports the problematic module
jest.mock(
  '../../../../../multichain-accounts/controllers/account-tree-controller',
  () => ({
    accountTreeControllerInit: jest.fn(() => ({
      controller: {
        state: { accountTree: { wallets: {} } },
      },
    })),
  }),
);

const mockState = {
  ...initialState,
  engine: {
    ...initialState.engine,
    backgroundState: {
      ...initialState.engine.backgroundState,
      KeyringController: {
        keyrings: [
          {
            accounts: ['0x1234567890123456789012345678901234567890'],
            type: 'HD Key Tree',
            metadata: {
              id: mockEntropySource,
              name: '',
            },
          },
        ],
      },
      AccountsController: {
        internalAccounts: {
          selectedAccount: '30786334-3935-4563-b064-363339643939',
          accounts: {
            '30786334-3935-4563-b064-363339643939': {
              id: '30786334-3935-4563-b064-363339643939',
              address: '0x1234567890123456789012345678901234567890',
              name: 'Account 1',
              type: 'eip155:eoa',
              scopes: ['eip155:0'],
              metadata: {
                lastSelected: 0,
                keyring: {
                  type: 'HD Key Tree',
                },
              },
            },
          },
        },
      },
    },
  },
} as DeepPartial<RootState>;

// TODO remove this mock once we have a real implementation
jest.mock('../../../../../selectors/confirmTransaction');

jest.mock('../../../../../core/Engine', () => {
  const { MOCK_ENTROPY_SOURCE } = jest.requireActual(
    '../../../../../util/test/keyringControllerTestUtils',
  );
  return {
    controllerMessenger: {
      call: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    },
    context: {
      SwapsController: {
        fetchAggregatorMetadataWithCache: jest.fn(),
        fetchTopAssetsWithCache: jest.fn(),
        fetchTokenWithCache: jest.fn(),
      },
      KeyringController: {
        state: {
          keyrings: [
            {
              accounts: ['0x1234567890123456789012345678901234567890'],
              type: 'HD Key Tree',
              metadata: {
                id: MOCK_ENTROPY_SOURCE,
                name: '',
              },
            },
          ],
        },
      },
      AccountsController: {
        state: {
          internalAccounts: {
            selectedAccount: '30786334-3935-4563-b064-363339643939',
            accounts: {
              '30786334-3935-4563-b064-363339643939': {
                id: '30786334-3935-4563-b064-363339643939',
                address: '0x1234567890123456789012345678901234567890',
                name: 'Account 1',
                type: 'eip155:eoa',
                scopes: ['eip155:0'],
                metadata: {
                  lastSelected: 0,
                  keyring: {
                    type: 'HD Key Tree',
                  },
                },
              },
            },
          },
        },
      },
      AccountTreeController: {
        accountTree: {
          wallets: {},
        },
      },
      GasFeeController: {
        startPolling: jest.fn(),
        stopPollingByPollingToken: jest.fn(),
      },
      NetworkController: {
        getNetworkConfigurationByNetworkClientId: jest.fn(),
      },
      BridgeStatusController: {
        submitTx: jest.fn().mockResolvedValue({ success: true }),
      },
      BridgeController: {
        resetState: jest.fn(),
        setBridgeFeatureFlags: jest.fn().mockResolvedValue(undefined),
        updateBridgeQuoteRequestParams: jest.fn(),
      },
    },
    getTotalEvmFiatAccountBalance: jest.fn().mockReturnValue({
      balance: '1000000000000000000', // 1 ETH
      fiatBalance: '2000', // $2000
    }),
  };
});

// Mock useAccounts hook
jest.mock('../../../../hooks/useAccounts', () => ({
  useAccounts: () => ({
    accounts: [
      {
        id: '30786334-3935-4563-b064-363339643939',
        address: '0x1234567890123456789012345678901234567890',
        name: 'Account 1',
        type: 'HD Key Tree',
        yOffset: 0,
        isSelected: true,
        caipAccountId: 'eip155:1:0x1234567890123456789012345678901234567890',
        scopes: ['eip155:0', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
      },
    ],
    ensByAccountAddress: {
      '0x1234567890123456789012345678901234567890': '',
    },
  }),
}));

// Mock useValidateBridgeTx hook
const mockValidateBridgeTx = jest.fn();
jest.mock('../../../../../util/bridge/hooks/useValidateBridgeTx.ts', () => ({
  __esModule: true,
  default: () => ({
    validateBridgeTx: mockValidateBridgeTx,
  }),
}));

// Mock useSubmitBridgeTx hook
const mockSubmitBridgeTx = jest.fn();
jest.mock('../../../../../util/bridge/hooks/useSubmitBridgeTx', () => ({
  __esModule: true,
  default: () => ({
    submitBridgeTx: mockSubmitBridgeTx,
  }),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => {
  const actualBridgeSlice = jest.requireActual(
    '../../../../../core/redux/slices/bridge',
  );
  return {
    __esModule: true,
    ...actualBridgeSlice,
    default: actualBridgeSlice.default,
    setSourceToken: jest.fn(actualBridgeSlice.setSourceToken),
    setDestToken: jest.fn(actualBridgeSlice.setDestToken),
    selectNoFeeAssets: jest.fn(actualBridgeSlice.selectNoFeeAssets),
  };
});

const mockNavigate = jest.fn();
const mockRoute = {
  params: {
    sourcePage: 'test',
  } as BridgeRouteParams,
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: jest.fn(),
    }),
    useRoute: () => mockRoute,
  };
});

// Mock useLatestBalance hook
jest.mock('../../hooks/useLatestBalance', () => ({
  useLatestBalance: jest.fn().mockImplementation(({ address, chainId }) => {
    if (!address || !chainId) return undefined;

    // Need to do this due to this error: "The module factory of `jest.mock()` is not allowed to reference any out-of-scope variables.""
    const actualEthers = jest.requireActual('ethers');

    return {
      displayBalance: '2.0',
      atomicBalance: actualEthers.BigNumber.from('2000000000000000000'), // 2 ETH
    };
  }),
}));

// Mock Skeleton component to prevent animation
jest.mock('../../../../../component-library/components/Skeleton', () => ({
  Skeleton: () => null,
}));

jest.mock('../../hooks/useBridgeQuoteData', () => ({
  useBridgeQuoteData: jest
    .fn()
    .mockImplementation(() => mockUseBridgeQuoteData),
}));

jest.mock('../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../util/address'),
  isHardwareAccount: jest.fn(),
}));

jest.mock('react-native-fade-in-image', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      children,
      placeholderStyle,
    }: {
      children: React.ReactNode;
      placeholderStyle?: unknown;
    }) => React.createElement(View, { style: placeholderStyle }, children),
  };
});

// Mock gas included support hooks
const mockUseIsGasIncludedSTXSendBundleSupported = jest.fn();
jest.mock(
  '../../hooks/useIsGasIncludedSTXSendBundleSupported/index.ts',
  () => ({
    useIsGasIncludedSTXSendBundleSupported: (chainId?: string) =>
      mockUseIsGasIncludedSTXSendBundleSupported(chainId),
  }),
);

const mockUseIsGasIncluded7702Supported = jest.fn();
jest.mock('../../hooks/useIsGasIncluded7702Supported/index.ts', () => ({
  useIsGasIncluded7702Supported: (chainId?: string) =>
    mockUseIsGasIncluded7702Supported(chainId),
}));

describe('BridgeView', () => {
  const token2Address = '0x0000000000000000000000000000000000000002' as Hex;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', async () => {
    const { toJSON } = renderScreen(
      BridgeView,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: mockState },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('should open BridgeTokenSelector when clicking source token', async () => {
    const { findByText } = renderScreen(
      BridgeView,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: mockState },
    );

    // Find and click the token button
    const tokenButton = await findByText('ETH');
    expect(tokenButton).toBeTruthy();
    fireEvent.press(tokenButton);

    // Verify navigation to BridgeTokenSelector
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SOURCE_TOKEN_SELECTOR,
    });
  });

  it('should open BridgeDestNetworkSelector when clicking destination token area', async () => {
    const { getByText } = renderScreen(
      BridgeView,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: mockState },
    );

    // Find and click the destination token area
    const destTokenArea = getByText('Swap to');
    expect(destTokenArea).toBeTruthy();

    fireEvent.press(destTokenArea);

    // Verify navigation to BridgeTokenSelector
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.DEST_NETWORK_SELECTOR,
      params: {
        shouldGoToTokens: true,
      },
    });
  });

  it('should update source token amount when typing', async () => {
    jest
      .mocked(useBridgeQuoteData as unknown as jest.Mock)
      .mockImplementation(() => ({
        ...mockUseBridgeQuoteData,
        activeQuote: null,
        bestQuote: null,
        sourceAmount: undefined,
        isLoading: false,
        destTokenAmount: undefined,
        formattedQuoteData: undefined,
      }));

    const { getByTestId, getByText } = renderScreen(
      BridgeView,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: mockState },
    );

    // Press number buttons to input
    fireEvent.press(getByText('9'));
    fireEvent.press(getByText('.'));
    fireEvent.press(getByText('5'));

    // Verify the input value is updated
    const input = getByTestId('source-token-area-input');
    await waitFor(() => {
      expect(input.props.value).toBe('9.5');
    });

    // Verify fiat value is displayed (9.5 ETH * $2000 = $19000)
    expect(getByText('$19,000.00')).toBeTruthy();
  });

  it('should display source token symbol and balance', async () => {
    const stateWithAmount = {
      ...mockState,
      bridge: {
        ...mockState.bridge,
        sourceAmount: '1.5',
      },
    };

    const { getByText, getByTestId } = renderScreen(
      BridgeView,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: stateWithAmount },
    );

    // Verify token symbol is displayed
    expect(getByText('ETH')).toBeTruthy();

    // Verify token amount is displayed
    const input = getByTestId('source-token-area-input');
    expect(input.props.value).toBe('1.5');

    // Verify fiat value is displayed (1.5 ETH * $2000 = $3000)
    expect(getByText('$3,000.00')).toBeTruthy();

    // Verify balance is displayed
    await waitFor(() => {
      expect(getByText('2 ETH')).toBeTruthy();
    });
  });

  it('should not display max button when source token is native token', () => {
    const stateWithNativeToken = {
      ...mockState,
      bridge: {
        ...mockState.bridge,
        sourceToken: {
          address: '0x0000000000000000000000000000000000000000', // Native ETH address
          chainId: '0x1' as Hex,
          decimals: 18,
          image: '',
          name: 'Ether',
          symbol: 'ETH',
        },
      },
    };

    const { queryByTestId } = renderScreen(
      BridgeView,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: stateWithNativeToken },
    );

    // Verify max button is not present for native token
    expect(queryByTestId('token-input-area-max-button')).toBeNull();
  });

  it('should display max button when source token is not native token', () => {
    const stateWithERC20Token = {
      ...mockState,
      bridge: {
        ...mockState.bridge,
        sourceToken: {
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC token address
          chainId: '0x1' as Hex,
          decimals: 6,
          image:
            'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
          name: 'USD Coin',
          symbol: 'USDC',
        },
      },
    };

    const { queryByTestId } = renderScreen(
      BridgeView,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: stateWithERC20Token },
    );

    // Verify max button is present for ERC-20 token
    expect(queryByTestId('token-input-area-max-button')).toBeTruthy();
  });

  it('should set source amount to maximum balance when max button is pressed', async () => {
    const stateWithERC20Token = {
      ...mockState,
      bridge: {
        ...mockState.bridge,
        sourceToken: {
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC token address
          chainId: '0x1' as Hex,
          decimals: 6,
          image:
            'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
          name: 'USD Coin',
          symbol: 'USDC',
        },
      },
    };

    const { getByTestId } = renderScreen(
      BridgeView,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: stateWithERC20Token },
    );

    // Find and press the max button
    const maxButton = getByTestId('token-input-area-max-button');
    expect(maxButton).toBeTruthy();
    fireEvent.press(maxButton);

    // Verify the input displays truncated value ("2.0" → "2" for display only)
    // The actual sourceAmount in Redux state retains full precision "2.0" for API
    const input = getByTestId('source-token-area-input');
    await waitFor(() => {
      expect(input.props.value).toBe('2');
    });
  });

  it('should switch tokens when clicking arrow button', () => {
    const mockStateWithTokens = {
      ...mockState,
      bridge: {
        ...mockState.bridge,
        sourceToken: {
          address: '0x0000000000000000000000000000000000000000',
          chainId: '0x1' as Hex,
          decimals: 18,
          image: '',
          name: 'Ether',
          symbol: 'ETH',
        },
        destToken: {
          address: token2Address,
          chainId: '0x1' as Hex,
          decimals: 6,
          image:
            'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
          symbol: 'USDC',
        },
      },
    };

    const { getByTestId } = renderScreen(
      BridgeView,
      {
        name: Routes.BRIDGE.ROOT,
      },
      { state: mockStateWithTokens },
    );

    const arrowButton = getByTestId('arrow-button');
    fireEvent.press(arrowButton);

    expect(setSourceToken).toHaveBeenCalledWith(
      mockStateWithTokens.bridge.destToken,
    );
    expect(setDestToken).toHaveBeenCalledWith(
      mockStateWithTokens.bridge.sourceToken,
    );
  });

  describe('Solana Swap', () => {
    it('should set slippage to undefined when isSolanaSwap is true', async () => {
      const mockQuote = mockQuoteWithMetadata;
      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quoteRequest: {
            insufficientBal: false,
          },
          quotesLoadingStatus: RequestStatus.FETCHED,
          quotes: [mockQuote as unknown as QuoteResponse],
        },
        bridgeReducerOverrides: {
          sourceAmount: '1.0',
          sourceToken: {
            address: 'So11111111111111111111111111111111111111112',
            chainId: SolScope.Mainnet,
            decimals: 9,
            image: '',
            name: 'Solana',
            symbol: 'SOL',
          },
          destToken: {
            address: 'So11111111111111111111111111111111111111112',
            chainId: SolScope.Mainnet,
            decimals: 9,
            image: '',
            name: 'Solana',
            symbol: 'SOL',
          },
        },
      });

      const { store } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: testState },
      );

      // Wait for the useEffect to run and update the state
      await waitFor(() => {
        expect(store.getState().bridge.slippage).toBeUndefined();
      });
    });
  });

  describe('Bottom Content', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('displays "Select amount" when no amount is entered', () => {
      const { getByText } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: mockState },
      );

      expect(getByText('Select amount')).toBeTruthy();
    });

    it('displays "Select amount" when amount is zero', () => {
      const stateWithZeroAmount = {
        ...mockState,
        bridge: {
          ...mockState.bridge,
          sourceAmount: '0',
        },
      };

      const { getByText } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: stateWithZeroAmount },
      );

      expect(getByText('Select amount')).toBeTruthy();
    });

    it('displays "Insufficient funds" when amount exceeds balance', () => {
      const mockQuote = mockQuoteWithMetadata;
      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quoteRequest: {
            insufficientBal: true,
          },
          quotesLoadingStatus: RequestStatus.FETCHED,
          quotes: [mockQuote as unknown as QuoteResponse],
          quotesLastFetched: 12,
        },
      });

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => mockUseBridgeQuoteData);

      const { getByText } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: testState },
      );

      expect(getByText('Insufficient funds')).toBeTruthy();
    });

    it('displays "Fetching quote" when quotes are loading and there is no active quote', () => {
      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quotesLastFetched: null,
        },
      });

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          isLoading: true,
          activeQuote: null,
        }));

      const { getByText } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: testState },
      );

      expect(getByText('Fetching quote')).toBeTruthy();
    });

    it('displays Continue button and Terms link when amount is valid', () => {
      const mockQuote = mockQuoteWithMetadata;
      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quoteRequest: {
            insufficientBal: false,
          },
          quotesLoadingStatus: RequestStatus.FETCHED,
          quotes: [mockQuote as unknown as QuoteResponse],
          quotesLastFetched: 12,
        },
        bridgeReducerOverrides: {
          sourceAmount: '1.0', // Less than balance of 2.0 ETH
        },
      });

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          isExpired: false,
          willRefresh: false,
        }));

      const { getByTestId } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: testState },
      );

      const continueButton = getByTestId('bridge-confirm-button');
      expect(continueButton).toBeTruthy();
    });

    it('displays Continue button and Terms link when a quote is available but other quotes are still loading', () => {
      const mockQuote = mockQuoteWithMetadata;
      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quoteRequest: {
            insufficientBal: false,
          },
          quotesLoadingStatus: RequestStatus.LOADING,
          quotes: [mockQuote as unknown as QuoteResponse],
          quotesLastFetched: 12,
        },
        bridgeReducerOverrides: {
          sourceAmount: '1.0', // Less than balance of 2.0 ETH
        },
      });

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementationOnce(() => ({
          ...mockUseBridgeQuoteData,
          isExpired: false,
          willRefresh: false,
        }));

      const { getByTestId } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: testState },
      );

      const continueButton = getByTestId('bridge-confirm-button');
      expect(continueButton).toBeTruthy();
    });

    it('should handle "Confirm Bridge" button press', async () => {
      const mockQuote = mockQuoteWithMetadata;
      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quoteRequest: {
            insufficientBal: false,
          },
          quotesLoadingStatus: RequestStatus.FETCHED,
          quotes: [mockQuote as unknown as QuoteResponse],
          quotesLastFetched: 12,
        },
        bridgeReducerOverrides: {
          sourceAmount: '1.0', // Less than balance of 2.0 ETH
        },
      });

      const { getByTestId } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        {
          state: testState,
        },
      );

      const continueButton = getByTestId('bridge-confirm-button');
      fireEvent.press(continueButton);

      // TODO: Add expectations once quote response is implemented
      // expect(mockSubmitBridgeTx).toHaveBeenCalled();
    });

    it('navigates to QuoteExpiredModal when quote expires without refresh', async () => {
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementationOnce(() => ({
          ...mockUseBridgeQuoteData,
          isExpired: true,
          willRefresh: false,
          activeQuote: undefined, // activeQuote is undefined when quote expires without refresh
        }));

      renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: mockState },
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
          screen: Routes.BRIDGE.MODALS.QUOTE_EXPIRED_MODAL,
        });
      });
    });

    it('does not navigate to QuoteExpiredModal when quote expires with refresh', async () => {
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementationOnce(() => ({
          ...mockUseBridgeQuoteData,
          isExpired: true,
          willRefresh: true,
        }));

      renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: mockState },
      );

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalledWith(
          Routes.BRIDGE.MODALS.ROOT,
          {
            screen: Routes.BRIDGE.MODALS.QUOTE_EXPIRED_MODAL,
          },
        );
      });
    });

    it('does not navigate to QuoteExpiredModal when quote is valid', async () => {
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementationOnce(() => ({
          ...mockUseBridgeQuoteData,
          isExpired: false,
          willRefresh: false,
        }));

      renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: mockState },
      );

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalledWith(
          Routes.BRIDGE.MODALS.ROOT,
          {
            screen: Routes.BRIDGE.MODALS.QUOTE_EXPIRED_MODAL,
          },
        );
      });
    });

    it('does not navigate to QuoteExpiredModal when RecipientSelectorModal is open', async () => {
      // Set the Redux state to indicate user is selecting recipient
      const testState = {
        ...mockState,
        bridge: {
          ...mockState.bridge,
          isSelectingRecipient: true,
        },
      };

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          isExpired: true,
          willRefresh: false,
        }));

      renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: testState },
      );

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalledWith(
          Routes.BRIDGE.MODALS.ROOT,
          {
            screen: Routes.BRIDGE.MODALS.QUOTE_EXPIRED_MODAL,
          },
        );
      });
    });

    it('blurs input when opening QuoteExpiredModal', async () => {
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementationOnce(() => ({
          ...mockUseBridgeQuoteData,
          isExpired: true,
          willRefresh: false,
          isLoading: false,
          activeQuote: undefined, // activeQuote is undefined when quote expires without refresh
        }));

      const { toJSON } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: mockState },
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
          screen: Routes.BRIDGE.MODALS.QUOTE_EXPIRED_MODAL,
        });
      });

      expect(toJSON()).toMatchSnapshot();
    });

    it('displays hardware wallet not supported banner and disables continue button when using hardware wallet with Solana source', async () => {
      // Mock isHardwareAccount to return true for this test only
      const mockIsHardwareAccount = jest.fn().mockReturnValue(true);
      jest.mocked(isHardwareAccount).mockImplementation(mockIsHardwareAccount);

      const mockQuote = mockQuoteWithMetadata;
      const testState = createBridgeTestState(
        {
          bridgeControllerOverrides: {
            quoteRequest: {
              insufficientBal: false,
            },
            quotesLoadingStatus: RequestStatus.FETCHED,
            quotes: [mockQuote as unknown as QuoteResponse],
            quotesLastFetched: Date.now(),
          },
          bridgeReducerOverrides: {
            sourceAmount: '1.0',
            sourceToken: {
              address: 'So11111111111111111111111111111111111111112',
              chainId: SolScope.Mainnet,
              decimals: 9,
              image: '',
              name: 'Solana',
              symbol: 'SOL',
            },
          },
        },
        mockState,
      );

      const { getByText } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: testState },
      );

      // Wait for the banner text to appear
      await waitFor(() => {
        expect(
          getByText(strings('bridge.hardware_wallet_not_supported_solana')),
        ).toBeTruthy();
      });
    });

    it('shows no MM fee disclaimer when dest token is mUSD and fee is 0', async () => {
      const musdAddress = '0xaca92e438df0b2401ff60da7e4337b687a2435da' as Hex;

      // Locally force selector to return mUSD as no-fee for this test only
      // This avoids suite-order/caching issues without affecting other tests
      const noFeeSpy = jest
        .spyOn({ selectNoFeeAssets }, 'selectNoFeeAssets')
        .mockReturnValue([musdAddress]);

      // Ensure quote exists and has 0 fee so hasFee === false
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          isLoading: false,
          activeQuote: {
            ...(mockQuoteWithMetadata as unknown as QuoteResponse),
            // Minimal shape to provide 0 bps fee
            quote: { feeData: { metabridge: { quoteBpsFee: 0 } } },
          } as unknown as QuoteResponse,
        }));

      // Build test state: provide amount, ETH source, mUSD destination
      const testState = createBridgeTestState(
        {
          bridgeControllerOverrides: {
            quotesLoadingStatus: RequestStatus.FETCHED,
            quotes: [mockQuoteWithMetadata as unknown as QuoteResponse],
            quotesLastFetched: 12,
          },
          bridgeReducerOverrides: {
            sourceAmount: '1.0',
            sourceToken: {
              address: '0x0000000000000000000000000000000000000000',
              chainId: '0x1' as Hex,
              decimals: 18,
              image: '',
              name: 'Ether',
              symbol: 'ETH',
            },
            destToken: {
              address: musdAddress,
              chainId: '0x1' as Hex,
              decimals: 6,
              image: '',
              name: 'MetaMask USD',
              symbol: 'mUSD',
            },
          },
        },
        mockState as DeepPartial<RootState>,
      );

      // Mark mUSD as a no-fee asset in feature flags without using any
      interface BridgeFeatureFlagsChainConfig {
        noFeeAssets?: string[];
        isActiveSrc?: boolean;
        isActiveDest?: boolean;
      }
      type StateWithBridgeFlags = DeepPartial<RootState> & {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                bridgeConfigV2: {
                  chains: Record<string, BridgeFeatureFlagsChainConfig>;
                };
              };
            };
          };
        };
      };
      const typedState = testState as unknown as StateWithBridgeFlags;
      typedState.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfigV2.chains[
        'eip155:1'
      ].noFeeAssets = [musdAddress];

      // Keep test isolated from module cache side-effects: skip selector sanity check

      const { getByText } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: testState },
      );

      // Expect translated disclaimer text
      const expected = strings('bridge.no_mm_fee_disclaimer', {
        destTokenSymbol: 'mUSD',
      });
      await waitFor(() => {
        expect(getByText(expected)).toBeTruthy();
      });

      noFeeSpy.mockRestore();
    });
  });

  describe('Error Banner Visibility', () => {
    it('should hide error banner when input is focused', async () => {
      // Setup state with error condition
      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quotesLoadingStatus: RequestStatus.FETCHED,
          quotes: [],
          quotesLastFetched: 12,
        },
        bridgeReducerOverrides: {
          sourceAmount: '1.0',
        },
      });

      // Mock quote data to show an error
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          quoteFetchError: 'Error fetching quote',
          isNoQuotesAvailable: true,
          isLoading: false,
        }));

      const { getByTestId, queryByTestId } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: testState },
      );

      // Error banner should be visible initially
      await waitFor(() => {
        expect(queryByTestId('banneralert')).toBeTruthy();
      });

      // Focus the input
      const input = getByTestId('source-token-area-input');
      fireEvent(input, 'focus');

      // Error banner should be hidden
      await waitFor(() => {
        expect(queryByTestId('banneralert')).toBeNull();
      });
    });

    it('should focus input and show keypad when error banner is closed', async () => {
      // Setup state with error condition
      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quotesLoadingStatus: RequestStatus.FETCHED,
          quotes: [],
          quotesLastFetched: 12,
        },
        bridgeReducerOverrides: {
          sourceAmount: '1.0',
        },
      });

      // Mock quote data to show an error
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          quoteFetchError: 'Error fetching quote',
          isNoQuotesAvailable: true,
          isLoading: false,
        }));

      const { getByTestId, queryByTestId } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: testState },
      );

      // Error banner should be visible initially
      await waitFor(() => {
        expect(queryByTestId('banneralert')).toBeTruthy();
      });

      // Close the banner by clicking close button
      const closeButton = getByTestId('banner-close-button-icon');
      fireEvent.press(closeButton);

      // Error banner should be hidden and keypad should be visible
      await waitFor(() => {
        expect(queryByTestId('banneralert')).toBeNull();
        // Keypad should be visible - check for the delete button which is part of the keypad
        expect(queryByTestId('keypad-delete-button')).toBeTruthy();
      });
    });
  });

  describe('handleContinue - Blockaid Validation', () => {
    let mockQuote: QuoteResponse;

    beforeEach(() => {
      jest.clearAllMocks();
      mockQuote = mockQuoteWithMetadata as unknown as QuoteResponse;
      mockValidateBridgeTx.mockResolvedValue({
        result: { validation: { reason: null } },
        error: null,
      });
      mockSubmitBridgeTx.mockResolvedValue({ success: true });
      // Mock isHardwareAccount to return false for these tests
      jest.mocked(isHardwareAccount).mockReturnValue(false);
    });

    it('should submit transaction for Solana swap', async () => {
      // Set route params for swap mode
      mockRoute.params.bridgeViewMode = BridgeViewMode.Swap;

      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quotesLoadingStatus: RequestStatus.FETCHED,
          quotes: [mockQuote],
          quotesLastFetched: 12,
        },
        bridgeReducerOverrides: {
          sourceAmount: '1.0',
          sourceToken: {
            address: 'So11111111111111111111111111111111111111112',
            chainId: SolScope.Mainnet,
            decimals: 9,
            image: '',
            name: 'Solana',
            symbol: 'SOL',
          },
          destToken: {
            address: 'So11111111111111111111111111111111111111112',
            chainId: SolScope.Mainnet,
            decimals: 9,
            image: '',
            name: 'Solana',
            symbol: 'SOL',
          },
        },
      });

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          activeQuote: mockQuote,
          isLoading: false,
        }));

      const { getByTestId } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: testState },
      );

      // Find and press the continue button
      const continueButton = getByTestId('bridge-confirm-button');
      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await waitFor(() => {
          expect(mockSubmitBridgeTx).toHaveBeenCalledWith({
            quoteResponse: mockQuote,
          });
          expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
        });
      });
    });

    it('should submit transaction for Solana to EVM bridge', async () => {
      // Set route params for bridge mode
      mockRoute.params.bridgeViewMode = BridgeViewMode.Bridge;

      const testState = createBridgeTestState(
        {
          bridgeControllerOverrides: {
            quotesLoadingStatus: RequestStatus.FETCHED,
            quotes: [mockQuote],
            quotesLastFetched: 12,
          },
          bridgeReducerOverrides: {
            sourceAmount: '1.0',
            sourceToken: {
              address: 'So11111111111111111111111111111111111111112',
              chainId: SolScope.Mainnet,
              decimals: 9,
              image: '',
              name: 'Solana',
              symbol: 'SOL',
            },
            destToken: {
              address: '0xA0b86a33E6441E84d9cDbdd8d2Dd2Bc0F40Cd1',
              chainId: '0x1' as Hex,
              decimals: 18,
              image: '',
              name: 'Ethereum',
              symbol: 'ETH',
            },
          },
        },
        mockState,
      );

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          activeQuote: mockQuote,
          isLoading: false,
        }));

      const { getByTestId } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: testState },
      );

      // Find and press the continue button - use getAllByText to handle multiple elements
      const continueButton = getByTestId('bridge-confirm-button');
      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await waitFor(() => {
          expect(mockSubmitBridgeTx).toHaveBeenCalledWith({
            quoteResponse: mockQuote,
          });
          expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
        });
      });
    });

    it('should proceed with transaction when continue is pressed', async () => {
      // Set route params for swap mode
      mockRoute.params.bridgeViewMode = BridgeViewMode.Swap;

      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quotesLoadingStatus: RequestStatus.FETCHED,
          quotes: [mockQuote],
          quotesLastFetched: 12,
        },
        bridgeReducerOverrides: {
          sourceAmount: '1.0',
          sourceToken: {
            address: 'So11111111111111111111111111111111111111112',
            chainId: SolScope.Mainnet,
            decimals: 9,
            image: '',
            name: 'Solana',
            symbol: 'SOL',
          },
          destToken: {
            address: 'So11111111111111111111111111111111111111112',
            chainId: SolScope.Mainnet,
            decimals: 9,
            image: '',
            name: 'Solana',
            symbol: 'SOL',
          },
        },
      });

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          activeQuote: mockQuote,
          isLoading: false,
        }));

      const { getByTestId } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: testState },
      );

      // Find and press the continue button
      const continueButton = getByTestId('bridge-confirm-button');
      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await waitFor(() => {
          expect(mockSubmitBridgeTx).toHaveBeenCalledWith({
            quoteResponse: mockQuote,
          });
          expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
        });
      });
    });

    it('should skip validation for non-Solana transactions', async () => {
      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quotesLoadingStatus: RequestStatus.FETCHED,
          quotes: [mockQuote],
          quotesLastFetched: 12,
        },
        bridgeReducerOverrides: {
          sourceAmount: '1.0',
          sourceToken: {
            address: token2Address,
            chainId: '0x1' as Hex,
            decimals: 18,
            image: '',
            name: 'Ethereum',
            symbol: 'ETH',
          },
          destToken: {
            address: '0xA0b86a33E6441E84d9cDbdd8d2Dd2Bc0F40Cd1',
            chainId: '0x89' as Hex,
            decimals: 18,
            image: '',
            name: 'Polygon',
            symbol: 'MATIC',
          },
        },
      });

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          activeQuote: mockQuote,
          isLoading: false,
        }));

      const { getByTestId } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: testState },
      );

      // Find and press the continue button - use getAllByText to handle multiple elements
      const continueButton = getByTestId('bridge-confirm-button');
      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await waitFor(() => {
          expect(mockSubmitBridgeTx).toHaveBeenCalledWith({
            quoteResponse: mockQuote,
          });
          expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
        });
      });
    });
  });

  describe('deep link parameter handling', () => {
    const mockDeepLinkSourceToken = {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      chainId: '0x1' as Hex,
      decimals: 6,
      name: 'USD Coin',
      symbol: 'USDC',
    };

    const mockDeepLinkDestToken = {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      chainId: '0x1' as Hex,
      decimals: 6,
      name: 'Tether USD',
      symbol: 'USDT',
    };

    beforeEach(() => {
      jest.clearAllMocks();
      // Reset route params to default for deep link testing
      mockRoute.params = {
        sourcePage: 'deeplink',
      } as BridgeRouteParams;
    });

    it('uses sourceToken from route params when provided', async () => {
      mockRoute.params.sourceToken = mockDeepLinkSourceToken;

      // Update the mock state to include the deep link source token
      const testState = {
        ...mockState,
        bridge: {
          ...mockState.bridge,
          sourceToken: mockDeepLinkSourceToken,
        },
      };

      const { getByText } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: testState },
      );

      // Should display the deep link token symbol
      expect(getByText('USDC')).toBeTruthy();
    });

    it('uses destToken from route params when provided', () => {
      mockRoute.params.destToken = mockDeepLinkDestToken;

      const { getByText } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: mockState },
      );

      // Should display the deep link dest token symbol
      expect(getByText('USDT')).toBeTruthy();
    });

    it('uses sourceAmount from route params when provided', () => {
      // Need to provide a source token for the amount to be set
      mockRoute.params.sourceToken = {
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x1' as Hex,
        decimals: 18,
        image: '',
        name: 'Ether',
        symbol: 'ETH',
      };
      mockRoute.params.sourceAmount = '1000000';

      // Update the mock state to include the source token and amount
      const testState = {
        ...mockState,
        bridge: {
          ...mockState.bridge,
          sourceToken: mockRoute.params.sourceToken,
          sourceAmount: '1000000',
        },
      };

      const { getByTestId } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: testState },
      );

      // Should display the deep link amount in the input (formatted with commas)
      const input = getByTestId('source-token-area-input');
      expect(input.props.value).toBe('1,000,000');
    });

    it('uses all deep link params when all are provided', async () => {
      mockRoute.params = {
        ...mockRoute.params,
        sourceToken: mockDeepLinkSourceToken,
        destToken: mockDeepLinkDestToken,
        sourceAmount: '1000000',
      } as BridgeRouteParams;

      // Update the mock state to include the deep link tokens and amount
      const testState = {
        ...mockState,
        bridge: {
          ...mockState.bridge,
          sourceToken: mockDeepLinkSourceToken,
          destToken: mockDeepLinkDestToken,
          sourceAmount: '1000000',
        },
      };

      const { getByText, getByTestId } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: testState },
      );

      // Should display all deep link data
      expect(getByText('USDC')).toBeTruthy();
      expect(getByText('USDT')).toBeTruthy();
      const input = getByTestId('source-token-area-input');
      expect(input.props.value).toBe('1,000,000');
    });

    it('falls back to Redux state when deep link params are not provided', () => {
      // Ensure no deep link params are set
      mockRoute.params = {
        sourcePage: 'test',
      } as BridgeRouteParams;

      const { getByText } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: mockState },
      );

      // Should display default ETH token from Redux state
      expect(getByText('ETH')).toBeTruthy();
    });
  });

  describe('gas included support hooks', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calls gas included support hooks with source token chain ID', () => {
      const testState = {
        ...mockState,
        bridge: {
          ...mockState.bridge,
          sourceToken: {
            address: '0x0000000000000000000000000000000000000000',
            chainId: '0x1' as Hex,
            decimals: 18,
            image: '',
            name: 'Ether',
            symbol: 'ETH',
          },
        },
      };

      renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE.ROOT,
        },
        { state: testState },
      );

      expect(mockUseIsGasIncludedSTXSendBundleSupported).toHaveBeenCalledWith(
        '0x1',
      );
      expect(mockUseIsGasIncluded7702Supported).toHaveBeenCalledWith('0x1');
    });
  });
});
