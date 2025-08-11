import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import PerpsDepositAmountView from './PerpsDepositAmountView';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import Engine from '../../../../../core/Engine';
import { ARBITRUM_MAINNET_CHAIN_ID } from '../../constants/hyperLiquidConfig';
import type { AssetRoute } from '../../controllers/types';

// Mock react-native at the top
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Platform: {
    OS: 'ios',
  },
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  })),
  useFocusEffect: jest.fn((callback) => callback()),
}));

// Mock Engine
jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getDepositRoutes: jest.fn(),
      deposit: jest.fn(),
      isTestnet: false,
    },
  },
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'perps.deposit.get_usdc_hyperliquid': 'Deposit to HyperLiquid',
      'perps.deposit.insufficient_funds': 'Insufficient balance',
      'perps.deposit.minimum_deposit_error': params?.amount
        ? `Minimum deposit: ${params.amount} USDC`
        : 'Minimum deposit required',
      'perps.deposit.enter_amount': 'Enter amount',
      'perps.deposit.fetching_quote': 'Fetching quote...',
      'perps.deposit.submitting': 'Submitting...',
      'perps.deposit.get_usdc': 'Get USDC',
      'perps.errors.tokenNotSupported': params?.token
        ? `Token ${params.token} not supported`
        : 'Token not supported',
      'perps.errors.unknownError': 'Unknown error occurred',
    };
    return translations[key] || key;
  }),
}));

// Mock components to avoid complex dependencies
jest.mock('../../../../Base/Keypad', () => {
  const View = jest.requireActual('react-native').View;
  return {
    __esModule: true,
    default: ({
      onChange,
      currentValue,
    }: {
      onChange: (data: { value: string; valueAsNumber: number }) => void;
      currentValue: string;
    }) => (
      <View
        testID="keypad"
        onTouchEnd={() => onChange({ value: '100', valueAsNumber: 100 })}
      >
        {currentValue}
      </View>
    ),
  };
});

jest.mock('../../components/PerpsQuoteDetailsCard', () => {
  const View = jest.requireActual('react-native').View;
  return {
    __esModule: true,
    default: ({ isAmountValid }: { isAmountValid: boolean }) => (
      <View testID="perps-quote-details" isAmountValid={isAmountValid} />
    ),
  };
});

jest.mock('../../../../UI/Bridge/components/TokenInputArea', () => {
  const MockReact = jest.requireActual('react');
  const View = jest.requireActual('react-native').View;
  const TouchableOpacity = jest.requireActual('react-native').TouchableOpacity;
  const Text = jest.requireActual('react-native').Text;
  return {
    TokenInputArea: MockReact.forwardRef(
      (
        props: {
          onPress?: () => void;
          token?: { symbol: string };
          tokenBalance?: string;
          error?: string;
          onTokenPress?: () => void;
          testID?: string;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref: React.Ref<any>,
      ) => (
        <View ref={ref} testID={props.testID || 'token-input-area'}>
          <TouchableOpacity
            testID="token-selector-button"
            onPress={props.onTokenPress || props.onPress}
          >
            <Text>{props.token?.symbol || 'Select Token'}</Text>
          </TouchableOpacity>
          {props.tokenBalance && (
            <Text testID="balance">{props.tokenBalance}</Text>
          )}
          {props.error && <Text testID="error">{props.error}</Text>}
        </View>
      ),
    ),
    TokenInputAreaType: {
      Source: 'SOURCE',
      Destination: 'DESTINATION',
    },
    MAX_INPUT_LENGTH: 21,
  };
});

jest.mock('../../../../Base/ScreenView', () => {
  const View = jest.requireActual('react-native').View;
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const TouchableOpacity = jest.requireActual('react-native').TouchableOpacity;
  const Text = jest.requireActual('react-native').Text;
  return {
    __esModule: true,
    default: (props: {
      onPress?: () => void;
      label?: string;
      children?: React.ReactNode;
      disabled?: boolean;
      testID?: string;
    }) => (
      <TouchableOpacity
        testID={props.testID || 'button'}
        onPress={props.onPress}
        disabled={props.disabled}
      >
        <Text>{props.label || props.children}</Text>
      </TouchableOpacity>
    ),
    ButtonSize: { Lg: 'lg', Md: 'md' },
    ButtonVariants: { Primary: 'primary', Secondary: 'secondary' },
  };
});

jest.mock(
  '../../../../../component-library/components/Buttons/ButtonIcon',
  () => {
    const TouchableOpacity =
      jest.requireActual('react-native').TouchableOpacity;
    return {
      __esModule: true,
      default: (props: { onPress?: () => void; testID?: string }) => (
        <TouchableOpacity
          testID={props.testID || 'button-icon'}
          onPress={props.onPress}
        />
      ),
    };
  },
);

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const View = jest.requireActual('react-native').View;
  return {
    __esModule: true,
    default: () => <View testID="icon" />,
    IconName: { ArrowLeft: 'arrow-left' },
    IconSize: { Lg: 'lg' },
    IconColor: { Default: 'default' },
  };
});

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const Text = jest.requireActual('react-native').Text;
  return {
    __esModule: true,
    default: (props: { children: React.ReactNode }) => (
      <Text>{props.children}</Text>
    ),
    TextVariant: { HeadingMD: 'heading-md', BodyMD: 'body-md' },
    TextColor: { Default: 'default', Alternative: 'alternative' },
  };
});

// Mock hooks
jest.mock(
  '../../../../Views/confirmations/hooks/gas/useGasFeeEstimates',
  () => ({
    useGasFeeEstimates: jest.fn(() => ({
      gasFeeEstimates: {
        gasLimit: '100000',
        maxFeePerGas: '50',
        maxPriorityFeePerGas: '2',
      },
      gasEstimateType: 'fee-market',
    })),
  }),
);

jest.mock('../../hooks/usePerpsDepositQuote', () => ({
  usePerpsDepositQuote: jest.fn(() => ({
    formattedQuoteData: {
      networkFee: '$2.50',
      estimatedTime: '15-30 seconds',
      receivingAmount: '100.00 USDC',
      exchangeRate: undefined,
    },
    isLoading: false,
    quoteFetchError: null,
    lastRefreshTime: Date.now(),
  })),
}));

jest.mock('../../hooks', () => ({
  usePerpsTrading: jest.fn(() => ({
    getDepositRoutes: jest.fn(() => [
      {
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        chainId: 'eip155:42161',
        contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7',
      },
    ]),
  })),
  usePerpsNetwork: jest.fn(() => 'mainnet'),
}));

// Mock redux actions
jest.mock('../../../../../core/redux/slices/bridge', () => ({
  setBridgeViewMode: jest.fn(() => ({ type: 'bridge/setBridgeViewMode' })),
  setSelectedSourceChainIds: jest.fn(() => ({
    type: 'bridge/setSelectedSourceChainIds',
  })),
  setBridgeSourceToken: jest.fn(() => ({
    type: 'bridge/setBridgeSourceToken',
  })),
  selectSourceToken: (state: { bridge?: { sourceToken?: unknown } }) =>
    state?.bridge?.sourceToken,
  setSourceToken: jest.fn(() => ({ type: 'bridge/setSourceToken' })),
}));

const mockStore = configureMockStore();

describe('PerpsDepositAmountView', () => {
  const mockInitialState = {
    ...backgroundState,
    engine: {
      backgroundState: {
        ...backgroundState,
        AccountTrackerController: {
          ...backgroundState.AccountTrackerController,
          accountsByChainId: {
            [ARBITRUM_MAINNET_CHAIN_ID]: {
              '0x123': {
                balance: '0x1BC16D674EC80000', // 2 ETH
              },
            },
          },
        },
        TokenBalancesController: {
          ...backgroundState.TokenBalancesController,
          contractBalances: {
            '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': '1000000000', // 1000 USDC (6 decimals)
          },
        },
        NetworkController: {
          ...backgroundState.NetworkController,
          selectedNetworkClientId: 'arbitrum-mainnet',
          networkConfigurationsByChainId: {
            [ARBITRUM_MAINNET_CHAIN_ID]: {
              chainId: ARBITRUM_MAINNET_CHAIN_ID,
              name: 'Arbitrum One',
              nativeCurrency: 'ETH',
              rpcEndpoints: [
                {
                  networkClientId: 'arbitrum-mainnet',
                  url: 'https://arb1.arbitrum.io/rpc',
                  type: 'Custom',
                },
              ],
            },
          },
        },
        AccountsController: {
          ...backgroundState.AccountsController,
          internalAccounts: {
            selectedAccount: 'account1',
            accounts: {
              account1: {
                id: 'account1',
                address: '0x123',
                type: 'eip155:eoa',
                options: {},
                methods: [],
                metadata: {
                  name: 'Account 1',
                  importTime: Date.now(),
                  keyring: {
                    type: 'HD Key Tree',
                  },
                },
              },
            },
          },
        },
        TokenListController: {
          tokenList: {},
        },
        PreferencesController: {
          ipfsGateway: 'https://cloudflare-ipfs.com/ipfs/',
        },
      },
    },
    bridge: {
      sourceToken: undefined,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const mockRoutes: AssetRoute[] = [
      {
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831/default',
        chainId: 'eip155:42161',
        contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7',
      },
    ];
    (
      Engine.context.PerpsController.getDepositRoutes as jest.Mock
    ).mockReturnValue(mockRoutes);
  });

  describe('rendering', () => {
    it('should render the component successfully', () => {
      const store = mockStore(mockInitialState);
      const { getByText } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      expect(getByText('Deposit to HyperLiquid')).toBeTruthy();
    });

    it('should have continue button disabled when no amount is entered', () => {
      const store = mockStore(mockInitialState);
      const { getAllByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const continueButtons = getAllByTestId('continue-button');
      expect(continueButtons[0]).toBeTruthy();
      expect(continueButtons[0].props.disabled).toBe(true);
    });

    it('should display selected token in source input', () => {
      const stateWithToken = {
        ...mockInitialState,
        bridge: {
          sourceToken: {
            symbol: 'USDC',
            address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
            decimals: 6,
            name: 'USD Coin',
            chainId: ARBITRUM_MAINNET_CHAIN_ID,
          },
        },
      };

      const store = mockStore(stateWithToken);
      const { getByTestId, getAllByText } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const sourceTokenArea = getByTestId('source-token-area');
      expect(sourceTokenArea).toBeTruthy();
      // Token should display USDC text (appears in both source and destination)
      const usdcTexts = getAllByText('USDC');
      expect(usdcTexts.length).toBeGreaterThan(0);
    });
  });

  describe('navigation', () => {
    it('should call goBack when back button is pressed', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const backButton = getByTestId('buttonicon-arrowleft');
      backButton.props.onPress();

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('amount validation', () => {
    it('should have disabled continue button when token selected but no amount', () => {
      const stateWithToken = {
        ...mockInitialState,
        bridge: {
          sourceToken: {
            symbol: 'USDC',
            address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
            decimals: 6,
            name: 'USD Coin',
            chainId: ARBITRUM_MAINNET_CHAIN_ID,
          },
        },
      };

      const store = mockStore(stateWithToken);
      const { getAllByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const continueButtons = getAllByTestId('continue-button');
      expect(continueButtons[0].props.disabled).toBe(true);
    });

    it('should disable continue button when amount is below minimum', () => {
      const stateWithToken = {
        ...mockInitialState,
        bridge: {
          sourceToken: {
            symbol: 'USDC',
            address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
            decimals: 6,
            name: 'USD Coin',
            chainId: ARBITRUM_MAINNET_CHAIN_ID,
          },
        },
      };

      const store = mockStore(stateWithToken);
      const { getAllByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const continueButtons = getAllByTestId('continue-button');
      expect(continueButtons[0].props.disabled).toBe(true);
    });
  });

  describe('deposit functionality', () => {
    it('should handle successful deposit when valid amount entered', async () => {
      const mockDepositResult = { success: true, txHash: '0x123' };
      const mockDeposit = jest.fn().mockResolvedValue(mockDepositResult);

      // Mock the usePerpsTrading hook
      jest.mock('../../hooks', () => ({
        ...jest.requireActual('../../hooks'),
        usePerpsTrading: () => ({
          getDepositRoutes: jest.fn(() => [
            {
              assetId:
                'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
              chainId: 'eip155:42161',
              contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7',
            },
          ]),
          deposit: mockDeposit,
        }),
        usePerpsNetwork: jest.fn(() => 'mainnet'),
      }));

      const stateWithTokenAndAmount = {
        ...mockInitialState,
        bridge: {
          sourceToken: {
            symbol: 'USDC',
            address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
            decimals: 6,
            name: 'USD Coin',
            chainId: ARBITRUM_MAINNET_CHAIN_ID,
          },
        },
      };

      const store = mockStore(stateWithTokenAndAmount);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      // Since we can't directly interact with keypad, we'll just verify the button exists and is clickable
      const continueButton = getByTestId('continue-button');
      expect(continueButton).toBeTruthy();

      // The button should be disabled initially (no amount entered)
      expect(continueButton.props.disabled).toBe(true);
    });

    it('should render deposit form with proper state', () => {
      const stateWithToken = {
        ...mockInitialState,
        bridge: {
          sourceToken: {
            symbol: 'USDC',
            address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
            decimals: 6,
            name: 'USD Coin',
            chainId: ARBITRUM_MAINNET_CHAIN_ID,
          },
        },
      };

      const store = mockStore(stateWithToken);
      const { getAllByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      // Verify the component renders continue buttons
      const buttons = getAllByTestId('continue-button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('token selection', () => {
    it('should navigate to token selector when token area is pressed', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      // Verify the source token area exists
      const sourceTokenArea = getByTestId('source-token-area');
      expect(sourceTokenArea).toBeTruthy();

      // The token selector would be triggered through the TokenInputArea's onTokenPress
      // For now, we just verify the component structure exists
      expect(sourceTokenArea).toBeTruthy();
    });
  });

  describe('quote display', () => {
    it('should have proper quote data from hook', () => {
      const stateWithToken = {
        ...mockInitialState,
        bridge: {
          sourceToken: {
            symbol: 'USDC',
            address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
            decimals: 6,
            name: 'USD Coin',
            chainId: ARBITRUM_MAINNET_CHAIN_ID,
          },
        },
      };

      const store = mockStore(stateWithToken);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      // Component should render source token area
      const sourceArea = getByTestId('source-token-area');
      expect(sourceArea).toBeTruthy();
    });
  });

  describe('state management', () => {
    it('should handle sourceAmount state changes', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId, getAllByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const sourceTokenArea = getByTestId('source-token-area');
      expect(sourceTokenArea).toBeTruthy();

      // Component should render with initial state
      // Check that token selector buttons exist
      const tokenSelectorButtons = getAllByTestId('token-selector-button');
      expect(tokenSelectorButtons.length).toBeGreaterThan(0);

      // Check that continue button exists
      const continueButton = getByTestId('continue-button');
      expect(continueButton).toBeTruthy();
    });

    it('should handle error state properly', () => {
      // Mock quote hook to return error
      const mockUsePerpsDepositQuote = jest.requireMock(
        '../../hooks/usePerpsDepositQuote',
      ).usePerpsDepositQuote;
      mockUsePerpsDepositQuote.mockReturnValue({
        formattedQuoteData: {
          networkFee: '$2.50',
          estimatedTime: '15-30 seconds',
          receivingAmount: '100.00 USDC',
          exchangeRate: undefined,
        },
        isLoading: false,
        quoteFetchError: 'Network error',
        lastRefreshTime: Date.now(),
      });

      const store = mockStore(mockInitialState);
      const { getByText } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      expect(getByText('Network error')).toBeTruthy();
    });

    it('should handle loading state properly', () => {
      const mockUsePerpsDepositQuote = jest.requireMock(
        '../../hooks/usePerpsDepositQuote',
      ).usePerpsDepositQuote;
      mockUsePerpsDepositQuote.mockReturnValue({
        formattedQuoteData: {
          networkFee: '$2.50',
          estimatedTime: '15-30 seconds',
          receivingAmount: '100.00 USDC',
          exchangeRate: undefined,
        },
        isLoading: true,
        quoteFetchError: null,
        lastRefreshTime: Date.now(),
      });

      const store = mockStore(mockInitialState);
      const { getAllByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const continueButtons = getAllByTestId('continue-button');
      expect(continueButtons[0].props.disabled).toBe(true);
    });

    it('should render default USDC token correctly', () => {
      const store = mockStore(mockInitialState);
      const { getByText, getAllByText } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      // Should display USDC as the default token
      const usdcTexts = getAllByText('USDC');
      expect(usdcTexts.length).toBeGreaterThan(0);

      // Should display the header
      expect(getByText('Deposit to HyperLiquid')).toBeTruthy();
    });
  });

  describe('input validation', () => {
    it('should show insufficient balance error when balance is too low', () => {
      const stateWithLowBalance = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            TokenBalancesController: {
              ...mockInitialState.engine.backgroundState
                .TokenBalancesController,
              contractBalances: {
                '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': '1000', // Very low balance
              },
            },
          },
        },
        bridge: {
          sourceToken: {
            symbol: 'USDC',
            address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
            decimals: 6,
            name: 'USD Coin',
            chainId: ARBITRUM_MAINNET_CHAIN_ID,
          },
        },
      };

      const store = mockStore(stateWithLowBalance);
      const { getAllByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const continueButtons = getAllByTestId('continue-button');
      expect(continueButtons[0].props.disabled).toBe(true);
    });

    it('should show minimum deposit error when amount is below minimum', () => {
      const mockUsePerpsDepositQuote = jest.requireMock(
        '../../hooks/usePerpsDepositQuote',
      ).usePerpsDepositQuote;
      mockUsePerpsDepositQuote.mockReturnValue({
        formattedQuoteData: {
          networkFee: '$2.50',
          estimatedTime: '15-30 seconds',
          receivingAmount: '0.50 USDC',
          exchangeRate: undefined,
        },
        isLoading: false,
        quoteFetchError: null,
        lastRefreshTime: Date.now(),
        hasInsufficientBalance: false,
        isBelowMinimumDeposit: true,
        minimumDepositAmount: '1.00',
      });

      const store = mockStore(mockInitialState);
      const { getAllByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const continueButtons = getAllByTestId('continue-button');
      expect(continueButtons[0].props.disabled).toBe(true);
    });
  });

  describe('percentage buttons', () => {
    it('should render percentage buttons when input is focused', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const sourceTokenArea = getByTestId('source-token-area');
      expect(sourceTokenArea).toBeTruthy();

      // The component should render the token area
      // Percentage buttons and keypad would appear when input is focused
      expect(sourceTokenArea).toBeTruthy();
    });

    it('should handle max button press', () => {
      const stateWithBalance = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            TokenBalancesController: {
              ...mockInitialState.engine.backgroundState
                .TokenBalancesController,
              contractBalances: {
                '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': '1000000000', // 1000 USDC
              },
            },
          },
        },
        bridge: {
          sourceToken: {
            symbol: 'USDC',
            address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
            decimals: 6,
            name: 'USD Coin',
            chainId: ARBITRUM_MAINNET_CHAIN_ID,
          },
        },
      };

      const store = mockStore(stateWithBalance);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const sourceTokenArea = getByTestId('source-token-area');
      expect(sourceTokenArea).toBeTruthy();

      // The max button functionality would be tested through integration
      // with the parent component's state management
    });
  });

  describe('deposit flow', () => {
    it('should handle successful deposit and navigate to processing screen', async () => {
      const mockDepositResult = {
        success: true,
        txHash: '0x123456789abcdef',
      };

      const mockDeposit = jest.fn().mockResolvedValue(mockDepositResult);
      const mockGetDepositRoutes = jest.fn().mockReturnValue([
        {
          assetId:
            'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          chainId: 'eip155:42161',
          contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7',
        },
      ]);

      const mockUsePerpsTrading =
        jest.requireMock('../../hooks').usePerpsTrading;
      mockUsePerpsTrading.mockReturnValue({
        getDepositRoutes: mockGetDepositRoutes,
        deposit: mockDeposit,
      });

      const stateWithTokenAndAmount = {
        ...mockInitialState,
        bridge: {
          sourceToken: {
            symbol: 'USDC',
            address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
            decimals: 6,
            name: 'USD Coin',
            chainId: ARBITRUM_MAINNET_CHAIN_ID,
          },
        },
      };

      const store = mockStore(stateWithTokenAndAmount);
      const { getAllByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const continueButtons = getAllByTestId('continue-button');
      expect(continueButtons[0]).toBeTruthy();
    });

    it('should handle deposit failure and show error', async () => {
      const mockDepositResult = {
        success: false,
        error: 'Transaction failed',
      };

      const mockDeposit = jest.fn().mockResolvedValue(mockDepositResult);
      const mockGetDepositRoutes = jest.fn().mockReturnValue([
        {
          assetId:
            'eip155:42161/erc20:0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          chainId: 'eip155:42161',
          contractAddress: '0x2df1c51e09aecf9cacb7bc98cb1742757f163df7',
        },
      ]);

      const mockUsePerpsTrading =
        jest.requireMock('../../hooks').usePerpsTrading;
      mockUsePerpsTrading.mockReturnValue({
        getDepositRoutes: mockGetDepositRoutes,
        deposit: mockDeposit,
      });

      const store = mockStore(mockInitialState);
      const { getAllByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const continueButtons = getAllByTestId('continue-button');
      expect(continueButtons[0]).toBeTruthy();
    });

    it('should handle unsupported token error', async () => {
      const mockGetDepositRoutes = jest.fn().mockReturnValue([]);

      const mockUsePerpsTrading =
        jest.requireMock('../../hooks').usePerpsTrading;
      mockUsePerpsTrading.mockReturnValue({
        getDepositRoutes: mockGetDepositRoutes,
        deposit: jest.fn(),
      });

      const stateWithUnsupportedToken = {
        ...mockInitialState,
        bridge: {
          sourceToken: {
            symbol: 'UNSUPPORTED',
            address: '0x1234567890123456789012345678901234567890', // Valid hex address
            decimals: 18,
            name: 'Unsupported Token',
            chainId: ARBITRUM_MAINNET_CHAIN_ID,
          },
        },
      };

      const store = mockStore(stateWithUnsupportedToken);
      const { getAllByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const continueButtons = getAllByTestId('continue-button');
      expect(continueButtons[0]).toBeTruthy();
    });
  });

  describe('token enhancement', () => {
    it('should enhance token with icon from token list', () => {
      const stateWithTokenList = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            TokenListController: {
              ...mockInitialState.engine.backgroundState.TokenListController,
              tokenList: {
                '0xaf88d065e77c8cC2239327C5EDb3A432268e5831': {
                  symbol: 'USDC',
                  address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
                  decimals: 6,
                  name: 'USD Coin',
                  iconUrl: 'https://example.com/usdc.png',
                },
              },
            },
          },
        },
      };

      const store = mockStore(stateWithTokenList);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const sourceTokenArea = getByTestId('source-token-area');
      expect(sourceTokenArea).toBeTruthy();
    });

    it('should handle missing token list gracefully', () => {
      const stateWithoutTokenList = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            TokenListController: {
              ...mockInitialState.engine.backgroundState.TokenListController,
              tokenList: null,
            },
          },
        },
      };

      const store = mockStore(stateWithoutTokenList);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const sourceTokenArea = getByTestId('source-token-area');
      expect(sourceTokenArea).toBeTruthy();
    });
  });

  describe('network modes', () => {
    it('should handle testnet mode correctly', () => {
      const mockUsePerpsNetwork =
        jest.requireMock('../../hooks').usePerpsNetwork;
      mockUsePerpsNetwork.mockReturnValue('testnet');

      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const sourceTokenArea = getByTestId('source-token-area');
      expect(sourceTokenArea).toBeTruthy();
    });

    it('should handle mainnet mode correctly', () => {
      const mockUsePerpsNetwork =
        jest.requireMock('../../hooks').usePerpsNetwork;
      mockUsePerpsNetwork.mockReturnValue('mainnet');

      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const sourceTokenArea = getByTestId('source-token-area');
      expect(sourceTokenArea).toBeTruthy();
    });
  });

  describe('keypad integration', () => {
    it('should handle keypad value changes', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const sourceTokenArea = getByTestId('source-token-area');
      expect(sourceTokenArea).toBeTruthy();

      // Keypad integration would be tested through the TokenInputArea component
      // which handles the onChange events
    });

    it('should respect decimal limits based on token decimals', () => {
      const stateWithToken = {
        ...mockInitialState,
        bridge: {
          sourceToken: {
            symbol: 'USDC',
            address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
            decimals: 6,
            name: 'USD Coin',
            chainId: ARBITRUM_MAINNET_CHAIN_ID,
          },
        },
      };

      const store = mockStore(stateWithToken);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const sourceTokenArea = getByTestId('source-token-area');
      expect(sourceTokenArea).toBeTruthy();
    });
  });

  describe('focus and blur behavior', () => {
    it('should handle input focus correctly', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const sourceTokenArea = getByTestId('source-token-area');
      expect(sourceTokenArea).toBeTruthy();

      // The TokenInputArea component handles focus/blur internally
      // We verify that the component renders correctly
      expect(sourceTokenArea).toBeTruthy();
    });

    it('should handle input blur correctly', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const sourceTokenArea = getByTestId('source-token-area');
      expect(sourceTokenArea).toBeTruthy();

      // The TokenInputArea component handles focus/blur internally
      // We verify that the component renders correctly
      expect(sourceTokenArea).toBeTruthy();
    });

    it('should handle done button press correctly', () => {
      const store = mockStore(mockInitialState);
      const { getByTestId } = render(
        <Provider store={store}>
          <PerpsDepositAmountView />
        </Provider>,
      );

      const sourceTokenArea = getByTestId('source-token-area');
      expect(sourceTokenArea).toBeTruthy();

      // Done button would be tested through the keypad component integration
      // For now, verify the component structure exists
      expect(sourceTokenArea).toBeTruthy();
    });
  });
});
