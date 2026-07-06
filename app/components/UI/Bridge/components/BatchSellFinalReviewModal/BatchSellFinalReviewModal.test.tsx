import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';

import Routes from '../../../../../constants/navigation/Routes';
import { replaceWithTransactionsView } from '../../../../../util/navigation/replaceWithTransactionsView';
import { BatchSellQuoteDetailsModalSelectorsIDs } from '../BatchSellQuoteDetailsModal/BatchSellQuoteDetailsModal.testIds';
import { BatchSellFinalReviewModal } from './index';
import { BatchSellFinalReviewModalSelectorsIDs } from './BatchSellFinalReviewModal.testIds';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => {
  callback?.();
});
const mockDispatch = jest.fn();
const mockUpdateBatchSellQuoteParams = jest.fn();
const mockGetNewQuote = jest.fn();
const mockSubmitBatchSellTx = jest.fn();
const mockTrackBatchSellReviewModalSubmitted = jest.fn();
const mockUseBatchSellHasSufficientGas = jest.fn((_params: unknown) => true);
const errorTextColor = lightTheme.colors.error.default;
const ethAssetId = 'eip155:1/erc20:0x1111111111111111111111111111111111111111';
const uniAssetId = 'eip155:1/erc20:0x2222222222222222222222222222222222222222';
const linkAssetId = 'eip155:1/erc20:0x3333333333333333333333333333333333333333';
const defaultSelectedTokens = [
  {
    address: '0x1111111111111111111111111111111111111111',
    chainId: '0x1',
    decimals: 18,
    symbol: 'ETH',
    image: 'eth-image-url',
  },
  {
    address: '0x2222222222222222222222222222222222222222',
    chainId: '0x1',
    decimals: 18,
    symbol: 'UNI',
  },
];
const linkToken = {
  address: '0x3333333333333333333333333333333333333333',
  chainId: '0x1',
  decimals: 18,
  symbol: 'LINK',
};
const defaultRecommendedQuotes = [
  { quoteId: 'eth-quote-id' },
  { quoteId: 'uni-quote-id' },
];
let mockIsSubmittingTx = false;

interface MockQuoteTokenData {
  key: string;
  tokenSymbol: string;
  slippage: string;
  receivedAmount: string;
  receivedAmountFiat: string;
  isLoading: boolean;
  isHighPriceImpact: boolean;
  isQuoteUnavailable: boolean;
}

interface MockBatchSellQuoteData {
  tokenData: Record<string, MockQuoteTokenData>;
  totalReceived: { formatted: string };
  minimumReceived: { formatted: string };
  isLoading: boolean;
  isSummaryLoading: boolean;
  isGasless: boolean;
  isBatchSellTradeAvailable: boolean;
  isBatchSellTradesLoading: boolean;
  isNetworkFeeUnavailable: boolean;
  hasAnyQuote: boolean;
  hasPendingQuoteRows: boolean;
  needsNewQuote: boolean;
  quotePercentFee?: string;
  recommendedQuotes: unknown[];
  networkFee: {
    amount?: string;
    valueInCurrency?: string | null;
    asset?: {
      address: string;
      assetId: string;
      chainId: number;
      decimals: number;
      name: string;
      symbol: string;
    };
    formatted: string;
    formattedFiat: string;
  };
}

const defaultQuoteData: MockBatchSellQuoteData = {
  tokenData: {
    [ethAssetId]: {
      key: ethAssetId,
      tokenSymbol: 'ETH',
      slippage: '0.5%',
      receivedAmount: '3,456.78 USDC',
      receivedAmountFiat: '$3,456.78',
      isLoading: false,
      isHighPriceImpact: false,
      isQuoteUnavailable: false,
    },
    [uniAssetId]: {
      key: uniAssetId,
      tokenSymbol: 'UNI',
      slippage: '0.5%',
      receivedAmount: '500 USDC',
      receivedAmountFiat: '$500.00',
      isLoading: false,
      isHighPriceImpact: false,
      isQuoteUnavailable: false,
    },
  },
  totalReceived: { formatted: '7,638.23 USDC' },
  minimumReceived: { formatted: '7,485.47 USDC' },
  isLoading: false,
  isSummaryLoading: false,
  isGasless: false,
  isBatchSellTradeAvailable: true,
  isBatchSellTradesLoading: false,
  isNetworkFeeUnavailable: false,
  hasAnyQuote: true,
  hasPendingQuoteRows: false,
  needsNewQuote: false,
  quotePercentFee: '1.25',
  recommendedQuotes: defaultRecommendedQuotes,
  networkFee: {
    amount: '1.2',
    valueInCurrency: '1.2',
    asset: {
      address: '0x0000000000000000000000000000000000000000',
      assetId: 'eip155:1/slip44:60',
      chainId: 1,
      decimals: 18,
      name: 'Ethereum',
      symbol: 'ETH',
    },
    formatted: '1.20 USDC',
    formattedFiat: '$1.20',
  },
};
let mockSelectedTokens = defaultSelectedTokens;
let mockBatchSellQuoteData = defaultQuoteData;

jest.mock('../../../../../util/navigation/replaceWithTransactionsView', () => ({
  replaceWithTransactionsView: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { View } = jest.requireActual('react-native');

  return {
    ...actual,
    BottomSheet: ReactActual.forwardRef(
      (
        {
          children,
          testID,
        }: {
          children?: React.ReactNode;
          testID?: string;
        },
        ref: React.Ref<{ onCloseBottomSheet: (callback?: () => void) => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
        }));

        return ReactActual.createElement(View, { testID }, children);
      },
    ),
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
    replace: mockReplace,
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  selectBatchSellSourceTokens: jest.fn(() => mockSelectedTokens),
  selectBatchSellSlippages: jest.fn(() => ({})),
  selectIsSubmittingTx: jest.fn(() => mockIsSubmittingTx),
  setIsSubmittingTx: jest.fn((isSubmittingTx: boolean) => ({
    type: 'bridge/setIsSubmittingTx',
    payload: isSubmittingTx,
  })),
}));

jest.mock('../../hooks/useBatchSellQuoteData', () => ({
  useBatchSellQuoteData: jest.fn(() => mockBatchSellQuoteData),
}));

jest.mock('../../hooks/useBatchSellQuoteRequest', () => ({
  useBatchSellQuoteRequest: jest.fn(() => ({
    updateBatchSellQuoteParams: mockUpdateBatchSellQuoteParams,
    getNewQuote: mockGetNewQuote,
  })),
}));

jest.mock('../../hooks/useBatchSellHasSufficientGas', () => ({
  useBatchSellHasSufficientGas: (params: unknown) =>
    mockUseBatchSellHasSufficientGas(params),
}));

jest.mock('../../hooks/useSubmitBatchSellTx', () => ({
  useSubmitBatchSellTx: () => ({
    submitBatchSellTx: mockSubmitBatchSellTx,
  }),
}));

jest.mock('../../hooks/useTrackBatchSellReviewModalSubmitted', () => ({
  useTrackBatchSellReviewModalSubmitted: jest.fn(
    () => mockTrackBatchSellReviewModalSubmitted,
  ),
}));

function renderModal(overrides: Partial<MockBatchSellQuoteData> = {}) {
  mockBatchSellQuoteData = {
    ...defaultQuoteData,
    ...overrides,
  };

  return render(<BatchSellFinalReviewModal />);
}

describe('BatchSellFinalReviewModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedTokens = defaultSelectedTokens;
    mockIsSubmittingTx = false;
    mockBatchSellQuoteData = defaultQuoteData;
    mockUpdateBatchSellQuoteParams.mockClear();
    mockGetNewQuote.mockClear();
    mockSubmitBatchSellTx.mockResolvedValue(undefined);
    mockUseBatchSellHasSufficientGas.mockReturnValue(true);
  });

  it('renders the final review sheet content from live quote data', () => {
    const { getByTestId, getByText } = renderModal();
    const sellAllButton = getByTestId(
      BatchSellFinalReviewModalSelectorsIDs.SELL_ALL_BUTTON,
    );

    expect(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
    expect(getByText('Review')).toBeOnTheScreen();
    expect(getByText('You sell')).toBeOnTheScreen();
    expect(getByText('2 tokens')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.YOU_SELL_TOGGLE_BUTTON),
    );

    expect(getByText('ETH • 0.5% slippage')).toBeOnTheScreen();
    expect(getByText('3,456.78 USDC')).toBeOnTheScreen();
    expect(getByText('Total received')).toBeOnTheScreen();
    expect(getByText('7,638.23 USDC')).toBeOnTheScreen();
    expect(getByText('Min. received:')).toBeOnTheScreen();
    expect(getByText('7,485.47 USDC')).toBeOnTheScreen();
    expect(getByText('Network fee')).toBeOnTheScreen();
    expect(getByText('1.20 USDC')).toBeOnTheScreen();
    expect(getByText('$1.20')).toBeOnTheScreen();
    expect(getByText('Sell all')).toBeOnTheScreen();
    expect(sellAllButton.props.accessibilityState.disabled).not.toBe(true);
    expect(getByText('Includes 1.25% MetaMask fee')).toBeOnTheScreen();
  });

  it('hides the MetaMask fee disclosure when quoteBpsFee has no fee', () => {
    const { queryByTestId } = renderModal({
      quotePercentFee: undefined,
    });

    expect(
      queryByTestId(
        BatchSellFinalReviewModalSelectorsIDs.METAMASK_FEE_DISCLOSURE,
      ),
    ).toBeNull();
  });

  it('submits Batch Sell with the recommended quotes', async () => {
    const { getByTestId } = renderModal();

    fireEvent.press(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.SELL_ALL_BUTTON),
    );

    await waitFor(() => {
      expect(mockSubmitBatchSellTx).toHaveBeenCalledWith({
        quoteResponses: defaultRecommendedQuotes,
      });
    });
    expect(mockTrackBatchSellReviewModalSubmitted).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenNthCalledWith(1, {
      type: 'bridge/setIsSubmittingTx',
      payload: true,
    });
    expect(mockDispatch).toHaveBeenLastCalledWith({
      type: 'bridge/setIsSubmittingTx',
      payload: false,
    });
    expect(replaceWithTransactionsView).toHaveBeenCalled();
  });

  it('closes the sheet before navigating to activity after submit', async () => {
    mockOnCloseBottomSheet.mockImplementation((callback?: () => void) => {
      callback?.();
    });

    const { getByTestId } = renderModal();

    fireEvent.press(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.SELL_ALL_BUTTON),
    );

    await waitFor(() => {
      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    });
    expect(mockOnCloseBottomSheet).toHaveBeenCalledWith(expect.any(Function));
    expect(replaceWithTransactionsView).toHaveBeenCalled();
    expect(mockOnCloseBottomSheet.mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(replaceWithTransactionsView).mock.invocationCallOrder[0],
    );
  });

  it('blocks Sell all while submitting', () => {
    mockIsSubmittingTx = true;

    const { getByTestId, getByText } = renderModal();

    expect(getByText('Submitting')).toBeOnTheScreen();
    expect(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.SELL_ALL_BUTTON).props
        .accessibilityState.disabled,
    ).toBe(true);
    expect(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.SELL_ALL_BUTTON).props
        .accessibilityState.busy,
    ).toBe(true);
  });

  it('closes the sheet when the close button is pressed', () => {
    const { getByTestId } = renderModal();

    fireEvent.press(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.CLOSE_BUTTON),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('starts collapsed and hides token rows while keeping received summary rows visible', () => {
    const { queryByText, getByText } = renderModal();

    expect(queryByText('ETH • 0.5% slippage')).toBeNull();
    expect(queryByText('UNI • 0.5% slippage')).toBeNull();
    expect(getByText('Total received')).toBeOnTheScreen();
    expect(getByText('7,638.23 USDC')).toBeOnTheScreen();
    expect(getByText('Min. received:')).toBeOnTheScreen();
    expect(getByText('7,485.47 USDC')).toBeOnTheScreen();
  });

  it('expands token rows when toggle is pressed', () => {
    const { getByTestId, getByText } = renderModal();
    const toggleButton = getByTestId(
      BatchSellFinalReviewModalSelectorsIDs.YOU_SELL_TOGGLE_BUTTON,
    );

    fireEvent.press(toggleButton);

    expect(getByText('ETH • 0.5% slippage')).toBeOnTheScreen();
    expect(getByText('UNI • 0.5% slippage')).toBeOnTheScreen();
  });

  it('collapses token rows after they are expanded', () => {
    const { getByTestId, queryByText, getByText } = renderModal();
    const toggleButton = getByTestId(
      BatchSellFinalReviewModalSelectorsIDs.YOU_SELL_TOGGLE_BUTTON,
    );

    fireEvent.press(toggleButton);
    fireEvent.press(toggleButton);

    expect(queryByText('ETH • 0.5% slippage')).toBeNull();
    expect(queryByText('UNI • 0.5% slippage')).toBeNull();
    expect(getByText('Total received')).toBeOnTheScreen();
    expect(getByText('7,638.23 USDC')).toBeOnTheScreen();
  });

  it('shows only quoted rows and source tokens', () => {
    mockSelectedTokens = [...defaultSelectedTokens, linkToken];
    const { getByTestId, getByText, queryByText } = renderModal({
      tokenData: {
        ...defaultQuoteData.tokenData,
        [linkAssetId]: {
          key: linkAssetId,
          tokenSymbol: 'LINK',
          slippage: '0.5%',
          receivedAmount: '-- USDC',
          receivedAmountFiat: '-',
          isLoading: false,
          isHighPriceImpact: false,
          isQuoteUnavailable: true,
        },
      },
    });

    expect(getByText('2 tokens')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.YOU_SELL_TOGGLE_BUTTON),
    );

    expect(getByText('ETH • 0.5% slippage')).toBeOnTheScreen();
    expect(getByText('UNI • 0.5% slippage')).toBeOnTheScreen();
    expect(queryByText('LINK • 0.5% slippage')).toBeNull();
  });

  it('switches to the minimum received info modal when the info button is pressed', () => {
    const { getByTestId } = renderModal();

    fireEvent.press(
      getByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_INFO_BUTTON,
      ),
    );

    expect(mockReplace).toHaveBeenCalledWith(
      Routes.BRIDGE.MODALS.BATCH_SELL_MINIMUM_RECEIVED_INFO_MODAL,
      {
        sourceModal: {
          screen: Routes.BRIDGE.MODALS.BATCH_SELL_FINAL_REVIEW_MODAL,
        },
      },
    );
  });

  it('switches to the network fee info modal when the info button is pressed', () => {
    const { getByTestId } = renderModal();

    fireEvent.press(
      getByTestId(
        BatchSellFinalReviewModalSelectorsIDs.NETWORK_FEE_INFO_BUTTON,
      ),
    );

    expect(mockReplace).toHaveBeenCalledWith(
      Routes.BRIDGE.MODALS.BATCH_SELL_NETWORK_FEE_INFO_MODAL,
      {
        sourceModal: {
          screen: Routes.BRIDGE.MODALS.BATCH_SELL_FINAL_REVIEW_MODAL,
        },
      },
    );
  });

  it('keeps token rows visible as skeletons while loading and disables Sell all', () => {
    const { getByTestId, getByText, queryByTestId, queryByText } = renderModal({
      tokenData: {
        [ethAssetId]: {
          ...defaultQuoteData.tokenData[ethAssetId],
          isLoading: true,
        },
        [uniAssetId]: {
          ...defaultQuoteData.tokenData[uniAssetId],
          isLoading: true,
        },
      },
      isLoading: true,
      isSummaryLoading: true,
      hasAnyQuote: false,
      hasPendingQuoteRows: true,
    });

    expect(getByText('2 tokens')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.YOU_SELL_TOGGLE_BUTTON),
    );

    expect(getByText('ETH • 0.5% slippage')).toBeOnTheScreen();
    expect(getByText('UNI • 0.5% slippage')).toBeOnTheScreen();
    expect(
      getByTestId(
        `${BatchSellQuoteDetailsModalSelectorsIDs.QUOTE_ROW_RECEIVED_AMOUNT_SKELETON}-${ethAssetId}`,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        `${BatchSellQuoteDetailsModalSelectorsIDs.QUOTE_ROW_RECEIVED_AMOUNT_SKELETON}-${uniAssetId}`,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.TOTAL_RECEIVED_SKELETON,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        BatchSellQuoteDetailsModalSelectorsIDs.MINIMUM_RECEIVED_SKELETON,
      ),
    ).toBeOnTheScreen();
    expect(queryByText('3,456.78 USDC')).toBeNull();
    expect(queryByText('7,638.23 USDC')).toBeNull();
    expect(queryByText('7,485.47 USDC')).toBeNull();
    expect(
      queryByTestId(
        `${BatchSellFinalReviewModalSelectorsIDs.SOURCE_TOKEN_AVATAR}-${linkAssetId}`,
      ),
    ).toBeNull();
    expect(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.SELL_ALL_BUTTON).props
        .accessibilityState.disabled,
    ).toBe(true);
    expect(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.SELL_ALL_BUTTON).props
        .accessibilityState.busy,
    ).toBe(true);
  });

  it('renders a network fee values skeleton while the network fee is loading', () => {
    const { getByTestId, getByText, queryByText } = renderModal({
      isBatchSellTradeAvailable: false,
      isBatchSellTradesLoading: true,
    });

    expect(
      getByTestId(
        BatchSellFinalReviewModalSelectorsIDs.NETWORK_FEE_VALUES_SKELETON,
      ),
    ).toBeOnTheScreen();
    expect(getByText('Network fee')).toBeOnTheScreen();
    expect(queryByText('1.20 USDC')).toBeNull();
    expect(queryByText('$1.20')).toBeNull();
    expect(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.SELL_ALL_BUTTON).props
        .accessibilityState.disabled,
    ).toBe(true);
    expect(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.SELL_ALL_BUTTON).props
        .accessibilityState.busy,
    ).toBe(true);
  });

  it('blocks Sell all while the Batch Sell trade is unavailable', () => {
    const { getByTestId } = renderModal({
      isBatchSellTradeAvailable: false,
    });

    expect(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.SELL_ALL_BUTTON).props
        .accessibilityState.disabled,
    ).toBe(true);
  });

  it('shows insufficient balance when the network fee is unavailable', () => {
    const { getByTestId, getByText, queryByTestId } = renderModal({
      isBatchSellTradeAvailable: false,
      isBatchSellTradesLoading: false,
      isNetworkFeeUnavailable: true,
      networkFee: {
        formatted: '--',
        formattedFiat: '-',
      },
    });
    const getTextColor = (text: string) =>
      StyleSheet.flatten(getByText(text).props.style).color;

    expect(
      queryByTestId(
        BatchSellFinalReviewModalSelectorsIDs.NETWORK_FEE_VALUES_SKELETON,
      ),
    ).toBeNull();
    expect(getByText('Insufficient balance')).toBeOnTheScreen();
    expect(getTextColor('Network fee')).toBe(errorTextColor);
    expect(getTextColor('--')).toBe(errorTextColor);
    expect(getTextColor('-')).toBe(errorTextColor);
    expect(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.SELL_ALL_BUTTON).props
        .accessibilityState.disabled,
    ).toBe(true);
    expect(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.SELL_ALL_BUTTON).props
        .accessibilityState.busy,
    ).not.toBe(true);
  });

  it('blocks Sell all when the network fee is unavailable even if trades are available', () => {
    const { getByTestId, getByText } = renderModal({
      isBatchSellTradeAvailable: true,
      isBatchSellTradesLoading: false,
      isNetworkFeeUnavailable: true,
      networkFee: {
        formatted: '--',
        formattedFiat: '-',
      },
    });

    expect(getByText('Insufficient balance')).toBeOnTheScreen();
    expect(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.SELL_ALL_BUTTON).props
        .accessibilityState.disabled,
    ).toBe(true);
  });

  it('shows insufficient funds when gasless destination-token fee cannot be covered', () => {
    const { getByTestId, getByText, queryByTestId } = renderModal({
      isGasless: true,
      isBatchSellTradeAvailable: false,
      isBatchSellTradesLoading: false,
    });
    const getTextColor = (text: string) =>
      StyleSheet.flatten(getByText(text).props.style).color;

    expect(
      queryByTestId(
        BatchSellFinalReviewModalSelectorsIDs.NETWORK_FEE_VALUES_SKELETON,
      ),
    ).toBeNull();
    expect(getByText('Insufficient funds')).toBeOnTheScreen();
    expect(getTextColor('Network fee')).toBe(errorTextColor);
    expect(getTextColor('1.20 USDC')).toBe(errorTextColor);
    expect(getTextColor('$1.20')).toBe(errorTextColor);
    expect(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.SELL_ALL_BUTTON).props
        .accessibilityState.disabled,
    ).toBe(true);
    expect(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.SELL_ALL_BUTTON).props
        .accessibilityState.busy,
    ).not.toBe(true);
  });

  it('blocks Sell all and highlights the network fee when gas is insufficient', () => {
    mockUseBatchSellHasSufficientGas.mockReturnValue(false);

    const { getByTestId, getByText } = renderModal();
    const getTextColor = (text: string) =>
      StyleSheet.flatten(getByText(text).props.style).color;

    expect(getByText('Insufficient funds')).toBeOnTheScreen();
    expect(getTextColor('Network fee')).toBe(errorTextColor);
    expect(getTextColor('1.20 USDC')).toBe(errorTextColor);
    expect(getTextColor('$1.20')).toBe(errorTextColor);
    expect(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.SELL_ALL_BUTTON).props
        .accessibilityState.disabled,
    ).toBe(true);
    expect(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.SELL_ALL_BUTTON).props
        .accessibilityState.busy,
    ).not.toBe(true);
  });

  it('shows Get new quote when max refresh expires and fetches fresh quotes', () => {
    mockUseBatchSellHasSufficientGas.mockReturnValue(false);

    const { getByTestId, getByText } = renderModal({
      needsNewQuote: true,
      isBatchSellTradeAvailable: false,
      hasPendingQuoteRows: true,
    });
    const button = getByTestId(
      BatchSellFinalReviewModalSelectorsIDs.SELL_ALL_BUTTON,
    );

    fireEvent.press(button);

    expect(getByText('Get new quote')).toBeOnTheScreen();
    expect(button.props.accessibilityState.disabled).not.toBe(true);
    expect(button.props.accessibilityState.busy).not.toBe(true);
    expect(mockGetNewQuote).toHaveBeenCalledTimes(1);
  });

  it('updates quote values from live data while mounted', () => {
    const { getByTestId, getByText, rerender } = renderModal();

    expect(getByText('7,638.23 USDC')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(BatchSellFinalReviewModalSelectorsIDs.YOU_SELL_TOGGLE_BUTTON),
    );

    mockBatchSellQuoteData = {
      ...defaultQuoteData,
      tokenData: {
        ...defaultQuoteData.tokenData,
        [ethAssetId]: {
          ...defaultQuoteData.tokenData[ethAssetId],
          receivedAmount: '3,500 USDC',
        },
      },
      totalReceived: { formatted: '7,700 USDC' },
      minimumReceived: { formatted: '7,650 USDC' },
    };

    rerender(<BatchSellFinalReviewModal />);

    expect(getByText('3,500 USDC')).toBeOnTheScreen();
    expect(getByText('7,700 USDC')).toBeOnTheScreen();
    expect(getByText('7,650 USDC')).toBeOnTheScreen();
  });
});
