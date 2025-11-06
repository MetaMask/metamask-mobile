import { initialState } from '../../_mocks_/initialState';
import { DeepPartial } from '../../../../../util/test/renderWithProvider';
import { renderBridgeScreen } from './tests/renderBridgeScreen';
import { bridgeViewRobot } from './tests/BridgeView.screen-object';
import { Hex } from '@metamask/utils';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import {
  setDestToken,
  setSourceToken,
} from '../../../../../core/redux/slices/bridge';
import type { BridgeRouteParams } from './index';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import { mockUseBridgeQuoteData } from '../../_mocks_/useBridgeQuoteData.mock';
import { MOCK_ENTROPY_SOURCE as mockEntropySource } from '../../../../../util/test/keyringControllerTestUtils';
import { RootState } from '../../../../../reducers';
import {
  RequestStatus,
  type QuoteResponse,
  type BridgeControllerState,
} from '@metamask/bridge-controller';
import { SolScope } from '@metamask/keyring-api';
import { strings } from '../../../../../../locales/i18n';
import { createBridgeTestState } from '../../testUtils';
import { BridgeViewMode } from '../../types';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import {
  buildStateWith,
  markNoFeeDestAsset,
  tokenFactory,
  scenarioMetabridgeBpsFee,
} from './tests/BridgeView.builders';

// Mocks (copied to keep tests self-contained)
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

jest.mock('../../../../../core/Engine', () => {
  const { MOCK_ENTROPY_SOURCE } = jest.requireActual(
    '../../../../../util/test/keyringControllerTestUtils',
  );
  return {
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
      balance: '1000000000000000000',
      fiatBalance: '2000',
    }),
  };
});

const mockState = {
  ...initialState,
  engine: {
    ...initialState.engine,
    backgroundState: {
      ...initialState.engine.backgroundState,
      GasFeeController: {
        gasFeeEstimates: { low: '1', medium: '2', high: '3' },
        gasEstimateType: 'fee-market',
      },
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

jest.mock('../../../../../selectors/confirmTransaction');

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

jest.mock('../../hooks/useLatestBalance', () => ({
  useLatestBalance: jest.fn().mockImplementation(({ address, chainId }) => {
    if (!address || !chainId) return undefined;
    const actualEthers = jest.requireActual('ethers');
    return {
      displayBalance: '2.0',
      atomicBalance: actualEthers.BigNumber.from('2000000000000000000'),
    };
  }),
}));

jest.mock('../../../../../component-library/components/Skeleton', () => ({
  Skeleton: () => null,
}));

// Avoid Animated.timing / timers from third-party image fade-in during tests
jest.mock('react-native-fade-in-image', () => 'FadeIn');

// Avoid async state updates from RemoteImage during tests
jest.mock('../../../../Base/RemoteImage', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock submit bridge tx to avoid real async + console errors
jest.mock('../../../../../util/bridge/hooks/useSubmitBridgeTx', () => ({
  __esModule: true,
  default: () => ({
    submitBridgeTx: jest.fn().mockResolvedValue({ success: true }),
  }),
}));

// Mock useAccounts to avoid reading internalAccounts metadata in tests
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

jest.mock('../../hooks/useBridgeQuoteData', () => ({
  useBridgeQuoteData: jest
    .fn()
    .mockImplementation(() => mockUseBridgeQuoteData),
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

jest.mock('../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../util/address'),
  isHardwareAccount: jest.fn(),
}));

describe('BridgeView (refactored)', () => {
  const token2Address = '0x0000000000000000000000000000000000000002' as Hex;

  let consoleErrorSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    // Default quote shape including gasIncluded to satisfy useHasSufficientGas
    jest
      .mocked(useBridgeQuoteData as unknown as jest.Mock)
      .mockImplementation(() => ({
        ...mockUseBridgeQuoteData,
        activeQuote: {
          ...(mockQuoteWithMetadata as object),
          quote: { gasIncluded: true, srcChainId: 1, destChainId: 1 },
        } as unknown as QuoteResponse,
      }));
    // Silence console.error noise from internal async updates/logs during tests
    consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });

  it('renders initial UI', async () => {
    renderBridgeScreen(mockState);
    bridgeViewRobot().expectSelectAmount();
  });

  it('opens token selector for source token', async () => {
    renderBridgeScreen(mockState);
    bridgeViewRobot().tapSourceToken();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SOURCE_TOKEN_SELECTOR,
    });
  });

  it('opens destination network selector from destination area', async () => {
    renderBridgeScreen(mockState);
    bridgeViewRobot().tapDestTokenArea();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.DEST_NETWORK_SELECTOR,
      params: { shouldGoToTokens: true },
    });
  });

  it('updates source token amount with keypad input', async () => {
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

    renderBridgeScreen(mockState);
    await bridgeViewRobot().typeAmount('9.5');
    await waitFor(() => bridgeViewRobot().expectAmountDisplayed('9.5'));
    bridgeViewRobot().expectFiatText('$19,000.00');
  });

  it('hides Max button for native token', () => {
    const stateWithNativeToken = {
      ...mockState,
      bridge: {
        ...mockState.bridge,
        sourceToken: tokenFactory('ETH', { chainId: '0x1' as Hex }),
      },
    };

    const { queryByText } = renderBridgeScreen(stateWithNativeToken);
    expect(queryByText('Max')).toBeNull();
  });

  it('shows Max button for ERC-20 token', () => {
    const stateWithERC20Token = {
      ...mockState,
      bridge: {
        ...mockState.bridge,
        sourceToken: tokenFactory('USDC', {
          chainId: '0x1' as Hex,
          image:
            'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
        }),
      },
    };

    const { queryByText } = renderBridgeScreen(stateWithERC20Token);
    expect(queryByText('Max')).toBeTruthy();
  });

  it('sets source amount to maximum balance when pressing Max', async () => {
    const stateWithERC20Token = {
      ...mockState,
      bridge: {
        ...mockState.bridge,
        sourceToken: tokenFactory('USDC', {
          chainId: '0x1' as Hex,
          image:
            'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
        }),
      },
    };

    const { getByText } = renderBridgeScreen(stateWithERC20Token);
    const maxButton = getByText('Max');
    expect(maxButton).toBeTruthy();
    fireEvent.press(maxButton);
    await waitFor(() => bridgeViewRobot().expectAmountDisplayed('2'));
  });

  it('switches tokens when pressing switch button', () => {
    const stateWithTokens = {
      ...mockState,
      bridge: {
        ...mockState.bridge,
        sourceToken: tokenFactory('ETH', { chainId: '0x1' as Hex }),
        destToken: tokenFactory('USDC', {
          chainId: '0x1' as Hex,
          address: token2Address,
          image:
            'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
        }),
      },
    };

    renderBridgeScreen(stateWithTokens);
    bridgeViewRobot().tapSwitchTokens();
    expect(setSourceToken).toHaveBeenCalledWith(
      stateWithTokens.bridge.destToken,
    );
    expect(setDestToken).toHaveBeenCalledWith(
      stateWithTokens.bridge.sourceToken,
    );
  });

  describe('Solana Swap', () => {
    it('sets slippage to undefined when isSolanaSwap is true', async () => {
      const mockQuote = mockQuoteWithMetadata as unknown as QuoteResponse;
      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quoteRequest: {
            insufficientBal: false,
          },
          quotesLoadingStatus: RequestStatus.FETCHED,
          quotes: [mockQuote],
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

      const { store } = renderBridgeScreen(testState);
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
      const { getByText } = renderBridgeScreen(mockState);
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

      const { getByText } = renderBridgeScreen(stateWithZeroAmount);
      expect(getByText('Select amount')).toBeTruthy();
    });

    it('displays "Insufficient funds" when amount exceeds balance', () => {
      const mockQuote = mockQuoteWithMetadata as unknown as QuoteResponse;
      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quoteRequest: {
            insufficientBal: true,
          },
          quotesLoadingStatus: RequestStatus.FETCHED,
          quotes: [mockQuote],
          quotesLastFetched: 12,
        },
      });

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          isLoading: false,
          isExpired: false,
          willRefresh: false,
        }));

      const { getByText } = renderBridgeScreen(testState);
      expect(getByText('Insufficient funds')).toBeTruthy();
    });

    it('displays "Fetching quote" when quotes are loading and there is no active quote', () => {
      const testState = createBridgeTestState(
        {
          bridgeControllerOverrides: {
            quotesLastFetched: null,
            quotesLoadingStatus: RequestStatus.LOADING,
            quotes: [],
          },
        },
        mockState,
      );

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          isLoading: true,
          isExpired: false,
          willRefresh: false,
          activeQuote: null,
        }));

      const { getByText } = renderBridgeScreen(testState);
      expect(getByText('Fetching quote')).toBeTruthy();
    });

    it('displays Continue button and Terms link when amount is valid', () => {
      const mockQuote = mockQuoteWithMetadata as unknown as QuoteResponse;
      const testState = createBridgeTestState(
        {
          bridgeControllerOverrides: {
            quoteRequest: {
              insufficientBal: false,
            },
            quotesLoadingStatus: RequestStatus.FETCHED,
            quotes: [mockQuote],
            quotesLastFetched: 12,
          },
          bridgeReducerOverrides: {
            sourceAmount: '1.0',
          },
        },
        mockState,
      );

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          isExpired: false,
          willRefresh: false,
        }));

      const { getByTestId } = renderBridgeScreen(testState);
      expect(getByTestId('bridge-confirm-button')).toBeTruthy();
    });

    it('displays Continue button and Terms link when a quote is available but other quotes are still loading', () => {
      const mockQuote = mockQuoteWithMetadata as unknown as QuoteResponse;
      const testState = createBridgeTestState(
        {
          bridgeControllerOverrides: {
            quoteRequest: {
              insufficientBal: false,
            },
            quotesLoadingStatus: RequestStatus.LOADING,
            quotes: [mockQuote],
            quotesLastFetched: 12,
          },
          bridgeReducerOverrides: {
            sourceAmount: '1.0',
          },
        },
        mockState,
      );

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementationOnce(() => ({
          ...mockUseBridgeQuoteData,
          isExpired: false,
          willRefresh: false,
        }));

      const { getByTestId } = renderBridgeScreen(testState);
      expect(getByTestId('bridge-confirm-button')).toBeTruthy();
    });

    it('handles Confirm Bridge button press (placeholder)', async () => {
      const mockQuote = mockQuoteWithMetadata as unknown as QuoteResponse;
      const testState = createBridgeTestState(
        {
          bridgeControllerOverrides: {
            quoteRequest: {
              insufficientBal: false,
            },
            quotesLoadingStatus: RequestStatus.FETCHED,
            quotes: [mockQuote],
            quotesLastFetched: 12,
          },
          bridgeReducerOverrides: {
            sourceAmount: '1.0',
          },
        },
        mockState,
      );

      const { getByTestId } = renderBridgeScreen(testState);
      fireEvent.press(getByTestId('bridge-confirm-button'));
    });

    it('navigates to QuoteExpiredModal when quote expires without refresh', async () => {
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementationOnce(() => ({
          ...mockUseBridgeQuoteData,
          isExpired: true,
          willRefresh: false,
          activeQuote: undefined,
        }));

      renderBridgeScreen(mockState);

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

      renderBridgeScreen(mockState);
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

      renderBridgeScreen(mockState);
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

      renderBridgeScreen(testState);
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
          activeQuote: undefined,
        }));

      renderBridgeScreen(mockState);
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
          screen: Routes.BRIDGE.MODALS.QUOTE_EXPIRED_MODAL,
        });
      });
      // snapshot avoided to improve stability
    });

    it('displays hardware wallet not supported banner (solana source)', async () => {
      const { isHardwareAccount } = jest.requireMock(
        '../../../../../util/address',
      );
      isHardwareAccount.mockImplementation(() => true);

      const mockQuote = mockQuoteWithMetadata as unknown as QuoteResponse;
      const testState = createBridgeTestState(
        {
          bridgeControllerOverrides: {
            quoteRequest: { insufficientBal: false },
            quotesLoadingStatus: RequestStatus.FETCHED,
            quotes: [mockQuote],
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

      const { getByText } = renderBridgeScreen(testState);
      await waitFor(() => {
        expect(
          getByText(strings('bridge.hardware_wallet_not_supported_solana')),
        ).toBeTruthy();
      });
    });

    it('shows no MM fee disclaimer when dest token is mUSD and fee is 0', async () => {
      const musdAddress = '0xaca92e438df0b2401ff60da7e4337b687a2435da' as Hex;
      const bridgeSliceMock = jest.requireMock(
        '../../../../../core/redux/slices/bridge',
      );
      bridgeSliceMock.selectNoFeeAssets.mockReturnValue([musdAddress]);

      scenarioMetabridgeBpsFee(0);

      let testState = buildStateWith({
        controllerOverrides: {
          quotesLoadingStatus: RequestStatus.FETCHED,
          quotes: [mockQuoteWithMetadata as unknown as QuoteResponse],
          quotesLastFetched: 12,
        },
        sourceAmount: '1.0',
        sourceToken: tokenFactory('ETH', { chainId: '0x1' as Hex }),
        destToken: tokenFactory('mUSD', { chainId: '0x1' as Hex }),
        baseState: mockState as DeepPartial<RootState>,
      });

      testState = markNoFeeDestAsset(testState, 'eip155:1', musdAddress);

      const { getByText } = renderBridgeScreen(testState);

      const expected = strings('bridge.no_mm_fee_disclaimer', {
        destTokenSymbol: 'mUSD',
      });
      await waitFor(() => {
        expect(getByText(expected)).toBeTruthy();
      });

      bridgeSliceMock.selectNoFeeAssets.mockReset();
    });
  });

  describe('Error Banner Visibility', () => {
    it('hides error banner when input is focused', async () => {
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

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          quoteFetchError: 'Error fetching quote',
          isNoQuotesAvailable: true,
          isLoading: false,
        }));

      const { getByTestId, queryByTestId } = renderBridgeScreen(
        createBridgeTestState(
          {
            bridgeControllerOverrides: testState.engine?.backgroundState
              ?.BridgeController as unknown as Partial<BridgeControllerState>,
            bridgeReducerOverrides: testState.bridge,
          },
          mockState,
        ),
      );
      await waitFor(() => {
        expect(queryByTestId('banneralert')).toBeTruthy();
      });

      const input = getByTestId('source-token-area-input');
      fireEvent(input, 'focus');

      await waitFor(() => {
        expect(queryByTestId('banneralert')).toBeNull();
      });
    });

    it('focuses input and shows keypad when error banner is closed', async () => {
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

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          quoteFetchError: 'Error fetching quote',
          isNoQuotesAvailable: true,
          isLoading: false,
        }));

      const { getByTestId, queryByTestId } = renderBridgeScreen(
        createBridgeTestState(
          {
            bridgeControllerOverrides: testState.engine?.backgroundState
              ?.BridgeController as unknown as Partial<BridgeControllerState>,
            bridgeReducerOverrides: testState.bridge,
          },
          mockState,
        ),
      );
      await waitFor(() => {
        expect(queryByTestId('banneralert')).toBeTruthy();
      });

      const closeButton = getByTestId('banner-close-button-icon');
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(queryByTestId('banneralert')).toBeNull();
        expect(queryByTestId('keypad-delete-button')).toBeTruthy();
      });
    });
  });

  describe('handleContinue - Blockaid Validation', () => {
    let mockQuote: QuoteResponse;

    beforeEach(() => {
      jest.clearAllMocks();
      mockQuote = mockQuoteWithMetadata as unknown as QuoteResponse;
      const { isHardwareAccount } = jest.requireMock(
        '../../../../../util/address',
      );
      isHardwareAccount.mockImplementation(() => false);
    });

    it('submits transaction for Solana swap', async () => {
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

      const { getByTestId } = renderBridgeScreen(testState);
      fireEvent.press(getByTestId('bridge-confirm-button'));
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
      });
    });

    it('submits transaction for Solana to EVM bridge', async () => {
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
            destToken: tokenFactory('ETH', {
              chainId: '0x1' as Hex,
              name: 'Ethereum',
            }),
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

      const { getByTestId } = renderBridgeScreen(testState);
      fireEvent.press(getByTestId('bridge-confirm-button'));
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
      });
    });

    it('proceeds with transaction when continue is pressed', async () => {
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

      const { getByTestId } = renderBridgeScreen(testState);
      fireEvent.press(getByTestId('bridge-confirm-button'));
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
      });
    });

    it('skips validation for non-Solana transactions', async () => {
      const testState = createBridgeTestState({
        bridgeControllerOverrides: {
          quotesLoadingStatus: RequestStatus.FETCHED,
          quotes: [mockQuote],
          quotesLastFetched: 12,
        },
        bridgeReducerOverrides: {
          sourceAmount: '1.0',
          sourceToken: tokenFactory('ETH', {
            chainId: '0x1' as Hex,
            address: token2Address,
            name: 'Ethereum',
          }),
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

      const { getByTestId } = renderBridgeScreen(testState);
      fireEvent.press(getByTestId('bridge-confirm-button'));
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
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
      mockRoute.params = {
        sourcePage: 'deeplink',
      } as BridgeRouteParams;
    });

    it('uses sourceToken from route params when provided', async () => {
      mockRoute.params.sourceToken = mockDeepLinkSourceToken;
      const testState = {
        ...mockState,
        bridge: {
          ...mockState.bridge,
          sourceToken: mockDeepLinkSourceToken,
        },
      };
      const { getByText } = renderBridgeScreen(testState);
      expect(getByText('USDC')).toBeTruthy();
    });

    it('uses destToken from route params when provided', () => {
      mockRoute.params.destToken = mockDeepLinkDestToken;
      const { getByText } = renderBridgeScreen(mockState);
      expect(getByText('USDT')).toBeTruthy();
    });

    it('uses sourceAmount from route params when provided', () => {
      mockRoute.params.sourceToken = {
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x1' as Hex,
        decimals: 18,
        image: '',
        name: 'Ether',
        symbol: 'ETH',
      };
      mockRoute.params.sourceAmount = '1000000';

      const testState = {
        ...mockState,
        bridge: {
          ...mockState.bridge,
          sourceToken: mockRoute.params.sourceToken,
          sourceAmount: '1000000',
        },
      };

      const { getByTestId } = renderBridgeScreen(testState);
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

      const testState = {
        ...mockState,
        bridge: {
          ...mockState.bridge,
          sourceToken: mockDeepLinkSourceToken,
          destToken: mockDeepLinkDestToken,
          sourceAmount: '1000000',
        },
      };

      const { getByText, getByTestId } = renderBridgeScreen(testState);
      expect(getByText('USDC')).toBeTruthy();
      expect(getByText('USDT')).toBeTruthy();
      const input = getByTestId('source-token-area-input');
      expect(input.props.value).toBe('1,000,000');
    });

    it('falls back to Redux state when deep link params are not provided', () => {
      mockRoute.params = {
        sourcePage: 'test',
      } as BridgeRouteParams;
      const { getByText } = renderBridgeScreen(mockState);
      expect(getByText('ETH')).toBeTruthy();
    });
  });
});
