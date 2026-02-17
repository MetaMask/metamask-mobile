import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import { SwapsConfirmButton } from './index';
import { BridgeViewSelectorsIDs } from '../../Views/BridgeView/BridgeView.testIds';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { mockUseBridgeQuoteData } from '../../_mocks_/useBridgeQuoteData.mock';
import { Hex } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';
import { isHardwareAccount } from '../../../../../util/address';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import useIsInsufficientBalance from '../../hooks/useInsufficientBalance';
import { useHasSufficientGas } from '../../hooks/useHasSufficientGas';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { RootState } from '../../../../../reducers';
import { MOCK_ENTROPY_SOURCE as mockEntropySource } from '../../../../../util/test/keyringControllerTestUtils';
import { BigNumber } from 'ethers';
import Engine from '../../../../../core/Engine';
import { setSourceAmount } from '../../../../../core/redux/slices/bridge';

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

// TODO remove this mock once we have a real implementation
jest.mock('../../../../../selectors/confirmTransaction');

jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  context: {
    KeyringController: {
      state: {
        keyrings: [],
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
    },
  },
}));

// Mock selectSourceWalletAddress
jest.mock('../../../../../selectors/bridge', () => ({
  ...jest.requireActual('../../../../../selectors/bridge'),
  selectSourceWalletAddress: jest.fn(),
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: jest.fn(),
    }),
  };
});

// Mock useLatestBalance hook
jest.mock('../../hooks/useLatestBalance', () => ({
  useLatestBalance: jest.fn().mockImplementation(({ address, chainId }) => {
    if (!address || !chainId) return undefined;

    const actualEthers = jest.requireActual('ethers');

    return {
      displayBalance: '2.0',
      atomicBalance: actualEthers.BigNumber.from('2000000000000000000'), // 2 ETH
    };
  }),
}));

// Create mock latestSourceBalance to pass as prop
const mockLatestSourceBalance = {
  displayBalance: '2.0',
  atomicBalance: BigNumber.from('2000000000000000000'), // 2 ETH
};

// Override srcTokenAmount so it matches sourceAmount='1.0' with 18 decimals,
// preventing the quote from being detected as stale in default test scenarios.
const mockActiveQuote = {
  ...mockQuoteWithMetadata,
  quote: {
    ...mockQuoteWithMetadata.quote,
    srcTokenAmount: '1000000000000000000', // calcTokenValue('1.0', 18)
  },
};

// Mock useBridgeQuoteData
jest.mock('../../hooks/useBridgeQuoteData', () => ({
  useBridgeQuoteData: jest
    .fn()
    .mockImplementation(() => mockUseBridgeQuoteData),
}));

// Mock useIsInsufficientBalance
jest.mock('../../hooks/useInsufficientBalance', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue(false),
}));

// Mock useHasSufficientGas
jest.mock('../../hooks/useHasSufficientGas', () => ({
  useHasSufficientGas: jest.fn().mockReturnValue(true),
}));

// Mock useSubmitBridgeTx hook
const mockSubmitBridgeTx = jest.fn();
jest.mock('../../../../../util/bridge/hooks/useSubmitBridgeTx', () => ({
  __esModule: true,
  default: () => ({
    submitBridgeTx: mockSubmitBridgeTx,
  }),
}));

// Mock useBridgeQuoteRequest hook
const mockUpdateQuoteParams = jest.fn();
jest.mock('../../hooks/useBridgeQuoteRequest', () => ({
  useBridgeQuoteRequest: jest.fn(() => mockUpdateQuoteParams),
}));

// Mock isHardwareAccount
jest.mock('../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../util/address'),
  isHardwareAccount: jest.fn(),
}));

// Mock Skeleton component to prevent animation
jest.mock('../../../../../component-library/components/Skeleton', () => ({
  Skeleton: () => null,
}));

jest.mock('react-native-fade-in-image', () => {
  const ReactModule = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      children,
      placeholderStyle,
    }: {
      children: React.ReactNode;
      placeholderStyle?: unknown;
    }) =>
      ReactModule.createElement(View, { style: placeholderStyle }, children),
  };
});

const mockState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
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
  bridge: {
    sourceAmount: '1.0',
    sourceToken: {
      address: '0x0000000000000000000000000000000000000000',
      chainId: '0x1' as Hex,
      decimals: 18,
      image: '',
      name: 'Ether',
      symbol: 'ETH',
    },
    isSubmittingTx: false,
  },
};

describe('SwapsConfirmButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(selectSourceWalletAddress)
      .mockReturnValue('0x1234567890123456789012345678901234567890');
    jest.mocked(isHardwareAccount).mockReturnValue(false);
    jest
      .mocked(useBridgeQuoteData as unknown as jest.Mock)
      .mockImplementation(() => ({
        ...mockUseBridgeQuoteData,
        activeQuote: mockActiveQuote,
      }));
    jest.mocked(useIsInsufficientBalance).mockReturnValue(false);
    jest.mocked(useHasSufficientGas).mockReturnValue(true);
    mockSubmitBridgeTx.mockResolvedValue({ success: true });
  });

  describe('Button Label', () => {
    it('displays "Confirm swap" label by default', () => {
      const { getByText } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      expect(getByText(strings('bridge.confirm_swap'))).toBeTruthy();
    });

    it('displays "Insufficient funds" when balance is insufficient', () => {
      jest.mocked(useIsInsufficientBalance).mockReturnValue(true);

      const { getByText } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      expect(getByText(strings('bridge.insufficient_funds'))).toBeTruthy();
    });

    it('displays "Insufficient gas" when gas is insufficient', () => {
      jest.mocked(useHasSufficientGas).mockReturnValue(false);

      const { getByText } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      expect(getByText(strings('bridge.insufficient_gas'))).toBeTruthy();
    });

    it('hides label behind loading indicator when submitting', () => {
      const submittingState = {
        ...mockState,
        bridge: {
          ...mockState.bridge,
          isSubmittingTx: true,
        },
      };

      const { queryByText } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: submittingState,
        },
      );

      // When submitting, buttonIsInLoadingState is true so Button renders
      // an ActivityIndicator instead of the label text
      expect(queryByText(strings('bridge.submitting_transaction'))).toBeNull();
    });
  });

  describe('Button Disabled State', () => {
    it('disables button when loading without active quote', () => {
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          isLoading: true,
          activeQuote: null,
        }));

      const { getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      expect(button.props.disabled).toBe(true);
    });

    it('disables button when balance is insufficient', () => {
      jest.mocked(useIsInsufficientBalance).mockReturnValue(true);

      const { getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      expect(button.props.disabled).toBe(true);
    });

    it('disables button when transaction is submitting', () => {
      const submittingState = {
        ...mockState,
        bridge: {
          ...mockState.bridge,
          isSubmittingTx: true,
        },
      };

      const { getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: submittingState,
        },
      );

      const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      expect(button.props.disabled).toBe(true);
    });

    it('disables button for hardware wallet with Solana source', () => {
      jest.mocked(isHardwareAccount).mockReturnValue(true);

      const solanaState = {
        ...mockState,
        bridge: {
          ...mockState.bridge,
          sourceToken: {
            address: 'So11111111111111111111111111111111111111112',
            chainId: SolScope.Mainnet,
            decimals: 9,
            image: '',
            name: 'Solana',
            symbol: 'SOL',
          },
        },
      };

      const { getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: solanaState,
        },
      );

      const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      expect(button.props.disabled).toBe(true);
    });

    it('disables button when blockaid error exists', () => {
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          blockaidError: 'Transaction flagged as suspicious',
        }));

      const { getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      expect(button.props.disabled).toBe(true);
    });

    it('disables button when gas is insufficient', () => {
      jest.mocked(useHasSufficientGas).mockReturnValue(false);

      const { getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      expect(button.props.disabled).toBe(true);
    });

    it('disables button when walletAddress is missing', () => {
      jest.mocked(selectSourceWalletAddress).mockReturnValue(undefined);

      const { getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      expect(button.props.disabled).toBe(true);
    });
  });

  describe('Button Loading State', () => {
    it('shows loading indicator when loading without active quote', () => {
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          isLoading: true,
          activeQuote: null,
        }));

      const { queryByText, getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      // Button is disabled (isLoading && !activeQuote)
      expect(button.props.disabled).toBe(true);
      // Label text is hidden behind ActivityIndicator
      expect(queryByText(strings('bridge.confirm_swap'))).toBeNull();
    });

    it('shows loading indicator when submitting transaction', () => {
      const submittingState = {
        ...mockState,
        bridge: {
          ...mockState.bridge,
          isSubmittingTx: true,
        },
      };

      const { queryByText, getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: submittingState,
        },
      );

      const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      expect(button.props.disabled).toBe(true);
      // Label hidden by loading indicator
      expect(queryByText(strings('bridge.submitting_transaction'))).toBeNull();
    });

    it('shows loading when awaiting quote (valid amount, no quote, not loading)', () => {
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          isLoading: false,
          activeQuote: null,
        }));

      const { queryByText, getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState, // sourceAmount: '1.0'
        },
      );

      const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      expect(button.props.disabled).toBe(true);
      // Label hidden by loading indicator during debounce gap
      expect(queryByText(strings('bridge.confirm_swap'))).toBeNull();
    });

    it('does not show loading when source amount is empty', () => {
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          isLoading: false,
          activeQuote: null,
        }));

      const emptyAmountState = {
        ...mockState,
        bridge: {
          ...mockState.bridge,
          sourceAmount: undefined,
        },
      };

      const { getByText } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: emptyAmountState,
        },
      );

      // Label is visible (not in loading state) when no amount entered
      expect(getByText(strings('bridge.confirm_swap'))).toBeTruthy();
    });

    it.each(['0', '0.0', '0.00'])(
      'does not show loading when source amount is "%s"',
      (zeroAmount) => {
        jest
          .mocked(useBridgeQuoteData as unknown as jest.Mock)
          .mockImplementation(() => ({
            ...mockUseBridgeQuoteData,
            isLoading: false,
            activeQuote: null,
          }));

        const zeroAmountState = {
          ...mockState,
          bridge: {
            ...mockState.bridge,
            sourceAmount: zeroAmount,
          },
        };

        const { getByText } = renderWithProvider(
          <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
          {
            state: zeroAmountState,
          },
        );

        // Label is visible (not in loading state) for zero amounts
        expect(getByText(strings('bridge.confirm_swap'))).toBeTruthy();
      },
    );

    it('does not show loading when loading with active quote present', () => {
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          isLoading: true,
          activeQuote: mockActiveQuote,
        }));

      const { getByText, getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      // Not disabled because activeQuote exists
      expect(button.props.disabled).toBe(false);
      // Label is visible (no loading indicator)
      expect(getByText(strings('bridge.confirm_swap'))).toBeTruthy();
    });

    it('does not show loading when disabled due to insufficient balance', () => {
      jest.mocked(useIsInsufficientBalance).mockReturnValue(true);

      const { getByText, getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      // Button is disabled
      expect(button.props.disabled).toBe(true);
      // But not in loading state (isLoading=false, isSubmittingTx=false)
      // so the label is visible
      expect(getByText(strings('bridge.insufficient_funds'))).toBeTruthy();
    });

    it('does not show loading when disabled due to insufficient gas', () => {
      jest.mocked(useHasSufficientGas).mockReturnValue(false);

      const { getByText, getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      expect(button.props.disabled).toBe(true);
      // Label visible because not loading/submitting
      expect(getByText(strings('bridge.insufficient_gas'))).toBeTruthy();
    });
  });

  describe('Stale Quote (isQuoteStale)', () => {
    it('shows loading when amount changes to non-zero and quote is stale', () => {
      // First render with sourceAmount='1.0' — settledAmountRef latches to '1.0'
      const { queryByText, getByTestId, store } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      // Change sourceAmount via Redux so the component re-renders with a
      // different amount while the settled ref still points to '1.0'
      act(() => {
        store.dispatch(setSourceAmount('2.0'));
      });

      const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      expect(button.props.disabled).toBe(true);
      // Label hidden by loading indicator
      expect(queryByText(strings('bridge.confirm_swap'))).toBeNull();
    });

    it('disables button without loading when amount changes to zero and quote is stale', () => {
      // First render with sourceAmount='1.0' — settledAmountRef latches to '1.0'
      const { getByText, getByTestId, store } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      // Change to a zero-ish amount — stale (different from settled '1.0') but
      // hasNonZeroSourceAmount is false, so isPendingQuoteRefresh is false.
      // The button disables without entering the loading state.
      act(() => {
        store.dispatch(setSourceAmount('0.000'));
      });

      const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      expect(button.props.disabled).toBe(true);
      // Label visible (not loading) — shows default "Confirm swap"
      expect(getByText(strings('bridge.confirm_swap'))).toBeTruthy();
    });

    it('is not stale when amount matches the quote', () => {
      // sourceAmount='1.0' matches the mock quote's srcTokenAmount
      const { getByText, getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      expect(button.props.disabled).toBe(false);
      expect(getByText(strings('bridge.confirm_swap'))).toBeTruthy();
    });
  });

  describe('Quote Expired (needsNewQuote)', () => {
    it('displays "Get new quote" label when quote is expired', () => {
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          isExpired: true,
          isLoading: false,
        }));

      const { getByText } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      expect(
        getByText(strings('quote_expired_modal.get_new_quote')),
      ).toBeTruthy();
    });

    it('button is not disabled when quote is expired', () => {
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          isExpired: true,
          isLoading: false,
        }));

      const { getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      expect(button.props.disabled).toBe(false);
    });

    it('calls resetState and updateQuoteParams when expired quote button is pressed', async () => {
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          isExpired: true,
          isLoading: false,
        }));

      const { getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      await act(async () => {
        fireEvent.press(button);
      });

      expect(Engine.context.BridgeController.resetState).toHaveBeenCalled();
      expect(mockUpdateQuoteParams).toHaveBeenCalled();
      // Should NOT call submitBridgeTx
      expect(mockSubmitBridgeTx).not.toHaveBeenCalled();
    });

    it('shows "Get new quote" when expired and loading with no active quote (escape hatch)', () => {
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          isExpired: true,
          isLoading: true,
          activeQuote: null,
        }));

      const { getByText, getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      // needsNewQuote is true because there is no active quote
      expect(
        getByText(strings('quote_expired_modal.get_new_quote')),
      ).toBeTruthy();
      // Button is not disabled — user can press "Get new quote"
      const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      expect(button.props.disabled).toBe(false);
    });

    it('does not show "Get new quote" when expired and loading with active quote', () => {
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          isExpired: true,
          isLoading: true,
          activeQuote: mockActiveQuote,
        }));

      const { queryByText } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      // needsNewQuote is false because activeQuote exists and isLoading is true
      expect(
        queryByText(strings('quote_expired_modal.get_new_quote')),
      ).toBeNull();
    });

    it('does not show "Get new quote" when expired but submitting', () => {
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          isExpired: true,
          isLoading: false,
        }));

      const submittingState = {
        ...mockState,
        bridge: {
          ...mockState.bridge,
          isSubmittingTx: true,
        },
      };

      const { queryByText } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: submittingState,
        },
      );

      // needsNewQuote is false because isSubmittingTx is true
      expect(
        queryByText(strings('quote_expired_modal.get_new_quote')),
      ).toBeNull();
    });
  });

  describe('handleContinue', () => {
    it('submits transaction and navigates to transactions view', async () => {
      const { getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      const continueButton = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await waitFor(() => {
          expect(mockSubmitBridgeTx).toHaveBeenCalledWith({
            quoteResponse: {
              ...mockActiveQuote,
              aggregator: mockActiveQuote.quote.bridgeId,
              walletAddress: '0x1234567890123456789012345678901234567890',
            },
          });
          expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
        });
      });
    });

    it('submits transaction for Solana swap', async () => {
      // For Solana (9 decimals), sourceAmount='1.0' → atomic '1000000000'
      const solanaActiveQuote = {
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          srcTokenAmount: '1000000000',
        },
      };

      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          activeQuote: solanaActiveQuote,
        }));

      const solanaState = {
        ...mockState,
        bridge: {
          ...mockState.bridge,
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
      };

      const { getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: solanaState,
        },
      );

      const continueButton = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await waitFor(() => {
          expect(mockSubmitBridgeTx).toHaveBeenCalledWith({
            quoteResponse: {
              ...solanaActiveQuote,
              aggregator: solanaActiveQuote.quote.bridgeId,
              walletAddress: '0x1234567890123456789012345678901234567890',
            },
          });
          expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
        });
      });
    });

    it('handles errors gracefully during submission', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSubmitBridgeTx.mockRejectedValue(new Error('Network error'));

      const { getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      const continueButton = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await waitFor(() => {
          expect(consoleSpy).toHaveBeenCalledWith(
            'Error submitting bridge tx',
            expect.any(Error),
          );
          // Should still navigate after error (in finally block)
          expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
        });
      });

      consoleSpy.mockRestore();
    });

    it('does not submit when activeQuote is null', async () => {
      jest
        .mocked(useBridgeQuoteData as unknown as jest.Mock)
        .mockImplementation(() => ({
          ...mockUseBridgeQuoteData,
          activeQuote: null,
          isLoading: false,
        }));

      const { getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      const continueButton = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockSubmitBridgeTx).not.toHaveBeenCalled();
    });

    it('does not submit when walletAddress is missing', async () => {
      jest.mocked(selectSourceWalletAddress).mockReturnValue(undefined);

      const { getByTestId } = renderWithProvider(
        <SwapsConfirmButton latestSourceBalance={mockLatestSourceBalance} />,
        {
          state: mockState,
        },
      );

      // Button should be disabled when walletAddress is missing
      const continueButton = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      expect(continueButton.props.disabled).toBe(true);

      // Verify submitBridgeTx is not called since button is disabled
      expect(mockSubmitBridgeTx).not.toHaveBeenCalled();
    });
  });
});
