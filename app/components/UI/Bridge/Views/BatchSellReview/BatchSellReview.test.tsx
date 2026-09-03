import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CaipAssetType, Hex } from '@metamask/utils';

import { BridgeToken } from '../../types';
import { BatchSellReview } from './BatchSellReview';
import { BatchSellReviewSelectorsIDs } from './BatchSellReview.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockCancelBatchSellQuoteParams = jest.fn();
const mockUpdateBatchSellQuoteParams = Object.assign(jest.fn(), {
  cancel: mockCancelBatchSellQuoteParams,
});
const mockGetNewQuote = jest.fn();
const mockTrackBatchSellQuotePageReviewClicked = jest.fn();
const ethAssetId =
  'eip155:1/erc20:0x1111111111111111111111111111111111111111' as CaipAssetType;
const uniAssetId =
  'eip155:1/erc20:0x2222222222222222222222222222222222222222' as CaipAssetType;
const linkAssetId =
  'eip155:1/erc20:0x3333333333333333333333333333333333333333' as CaipAssetType;

interface MockBatchSellQuoteTokenData {
  key: string;
  tokenSymbol: string;
  slippage: string;
  receivedAmount: string;
  receivedAmountFiat: string;
  priceImpact?: string;
  isLoading?: boolean;
  isHighPriceImpact?: boolean;
  isQuoteUnavailable?: boolean;
}

interface MockBatchSellQuoteData {
  tokenData: Record<string, MockBatchSellQuoteTokenData>;
  totalReceived: { formatted: string; formattedFiat: string };
  minimumReceived: { formatted: string };
  isLoading: boolean;
  isSummaryLoading: boolean;
  hasAnyQuote: boolean;
  hasPendingQuoteRows: boolean;
  needsNewQuote: boolean;
  networkFee: { formatted: string; formattedFiat: string };
}

const defaultQuoteData: MockBatchSellQuoteData = {
  tokenData: {
    [ethAssetId]: {
      key: ethAssetId,
      tokenSymbol: 'ETH',
      slippage: '2%',
      receivedAmount: '3,456.78 USDC',
      receivedAmountFiat: '$3,456.78',
    },
    [uniAssetId]: {
      key: uniAssetId,
      tokenSymbol: 'UNI',
      slippage: '2%',
      receivedAmount: '500 USDC',
      receivedAmountFiat: '$500.00',
    },
  },
  totalReceived: {
    formatted: '3,956.78 USDC',
    formattedFiat: '$3,956.78',
  },
  minimumReceived: { formatted: '3,900 USDC' },
  isLoading: false,
  isSummaryLoading: false,
  hasAnyQuote: true,
  hasPendingQuoteRows: false,
  needsNewQuote: false,
  networkFee: {
    formatted: '1.20 USDC',
    formattedFiat: '$1.20',
  },
};
let mockBatchSellQuoteData = defaultQuoteData;
const defaultSelectedTokens: BridgeToken[] = [
  {
    address: '0x1111111111111111111111111111111111111111',
    chainId: '0x1' as Hex,
    decimals: 18,
    symbol: 'ETH',
    balance: '1.498',
  },
  {
    address: '0x2222222222222222222222222222222222222222',
    chainId: '0x1' as Hex,
    decimals: 18,
    symbol: 'UNI',
    balance: '154.297',
  },
];
const thirdSelectedToken: BridgeToken = {
  address: '0x3333333333333333333333333333333333333333',
  chainId: '0x1' as Hex,
  decimals: 18,
  symbol: 'LINK',
  balance: '42.123',
};
const usdcToken: BridgeToken = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: '0x1' as Hex,
  decimals: 6,
  symbol: 'USDC',
  image: 'usdc-image-url',
};
const musdToken: BridgeToken = {
  address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
  chainId: '0x1' as Hex,
  decimals: 6,
  symbol: 'MUSD',
  image: 'musd-image-url',
};
let mockSelectedTokens: BridgeToken[] = defaultSelectedTokens;
let mockSelectedDestinationToken: BridgeToken | undefined = usdcToken;
let mockDestinationTokens: BridgeToken[] = [usdcToken];
let mockBatchSellSlippages: Partial<Record<CaipAssetType, string | undefined>> =
  {};
let mockBatchSellSourceTokenAmounts: Partial<
  Record<CaipAssetType, string | undefined>
> = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: mockNavigate,
    setOptions: jest.fn(),
  }),
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: {
        resetState: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  resetBridgeState: jest.fn(() => ({
    type: 'bridge/resetBridgeState',
  })),
  selectBatchSellSourceTokens: jest.fn(() => mockSelectedTokens),
  selectBatchSellDestStablecoins: jest.fn(() => mockDestinationTokens),
  selectBatchSellDestToken: jest.fn(() => mockSelectedDestinationToken),
  selectBatchSellSlippages: jest.fn(() => mockBatchSellSlippages),
  selectBatchSellSourceTokenAmounts: jest.fn(
    () => mockBatchSellSourceTokenAmounts,
  ),
  setBatchSellDestToken: jest.fn((token: BridgeToken) => ({
    type: 'bridge/setBatchSellDestToken',
    payload: token,
  })),
  setBatchSellSourceTokenAmount: jest.fn(
    ({
      assetId,
      amount,
    }: {
      assetId: CaipAssetType;
      amount: string | undefined;
    }) => ({
      type: 'bridge/setBatchSellSourceTokenAmount',
      payload: { assetId, amount },
    }),
  ),
  setBatchSellSourceTokenAmounts: jest.fn(
    (amounts: Partial<Record<CaipAssetType, string | undefined>>) => ({
      type: 'bridge/setBatchSellSourceTokenAmounts',
      payload: amounts,
    }),
  ),
  setBatchSellSourceTokens: jest.fn((tokens: BridgeToken[]) => ({
    type: 'bridge/setBatchSellSourceTokens',
    payload: tokens,
  })),
  setBatchSellTokenSlippages: jest.fn(
    (slippage: Partial<Record<CaipAssetType, string | undefined>>) => ({
      type: 'bridge/setBatchSellTokenSlippages',
      payload: slippage,
    }),
  ),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../hooks/useBatchSellQuoteRequest', () => ({
  getBatchSellAtomicSourceAmount: jest.fn(
    (token: { balance?: string }, amount?: string) =>
      token.balance && amount && Number(amount) > 0 ? '1' : undefined,
  ),
  getBatchSellSourceTokenAmount: jest.fn(
    (token: { balance?: string }, percent: number) => {
      if (percent <= 0) return '0';

      return token.balance;
    },
  ),
  hasValidBatchSellSourceAmounts: jest.fn(
    (
      _sourceTokens: BridgeToken[],
      batchSellSourceTokenAmounts: Record<string, string | undefined>,
    ) =>
      Object.values(batchSellSourceTokenAmounts).some(
        (amount) => amount !== undefined && Number(amount) > 0,
      ),
  ),
  useBatchSellQuoteRequest: jest.fn(() => ({
    updateBatchSellQuoteParams: mockUpdateBatchSellQuoteParams,
    getNewQuote: mockGetNewQuote,
  })),
}));

jest.mock('../../hooks/useBatchSellQuoteData', () => ({
  useBatchSellQuoteData: () => mockBatchSellQuoteData,
}));

jest.mock('../../hooks/useTrackBatchSellQuotePageViewed', () => ({
  useTrackBatchSellQuotePageViewed: jest.fn(),
}));

jest.mock('../../hooks/useTrackBatchSellQuotePageReviewClicked', () => ({
  useTrackBatchSellQuotePageReviewClicked: jest.fn(
    () => mockTrackBatchSellQuotePageReviewClicked,
  ),
}));

describe('BatchSellReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedTokens = defaultSelectedTokens;
    mockSelectedDestinationToken = usdcToken;
    mockDestinationTokens = [usdcToken];
    mockBatchSellSlippages = {};
    mockBatchSellSourceTokenAmounts = {
      [ethAssetId]: '1.498',
      [uniAssetId]: '154.297',
    };
    mockBatchSellQuoteData = defaultQuoteData;
    mockGetNewQuote.mockClear();
  });

  it('renders the quote review screen', () => {
    const { getByTestId, getByText } = render(<BatchSellReview />);

    expect(
      getByTestId(BatchSellReviewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByText('Total received')).toBeOnTheScreen();
    expect(getByText('$3,956.78')).toBeOnTheScreen();
    expect(
      getByTestId(BatchSellReviewSelectorsIDs.DESTINATION_TOKEN_PILL),
    ).toBeOnTheScreen();
    expect(getByText('USDC')).toBeOnTheScreen();
    expect(getByText('1.498 ETH • 100%')).toBeOnTheScreen();
    expect(getByText('154.297 UNI • 100%')).toBeOnTheScreen();
    expect(getByText('$3,456.78')).toBeOnTheScreen();
    expect(getByText('$500.00')).toBeOnTheScreen();
  });

  it('renders the quote loading screen', () => {
    mockBatchSellQuoteData = {
      ...defaultQuoteData,
      isLoading: true,
      isSummaryLoading: true,
      hasPendingQuoteRows: true,
    };
    const { getByTestId, getByText } = render(<BatchSellReview />);
    const reviewButton = getByTestId(BatchSellReviewSelectorsIDs.REVIEW_BUTTON);

    expect(getByText('Searching for best quotes')).toBeOnTheScreen();
    expect(
      getByTestId(BatchSellReviewSelectorsIDs.TOTAL_RECEIVED_SKELETON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        `${BatchSellReviewSelectorsIDs.TOKEN_AMOUNT_SKELETON}-0x1:0x1111111111111111111111111111111111111111`,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        `${BatchSellReviewSelectorsIDs.TOKEN_AMOUNT_SKELETON}-0x1:0x2222222222222222222222222222222222222222`,
      ),
    ).toBeOnTheScreen();
    expect(reviewButton.props.accessibilityState.disabled).toBe(true);
  });

  it('keeps the review CTA disabled while quotes are fetching even when rows have streamed in', () => {
    mockBatchSellQuoteData = {
      ...defaultQuoteData,
      isLoading: true,
      isSummaryLoading: false,
      hasAnyQuote: true,
      hasPendingQuoteRows: false,
    };

    const { getByTestId, getByText } = render(<BatchSellReview />);
    const reviewButton = getByTestId(BatchSellReviewSelectorsIDs.REVIEW_BUTTON);

    expect(getByText('Searching for best quotes')).toBeOnTheScreen();
    expect(reviewButton.props.accessibilityState.disabled).toBe(true);
  });

  it('shows available row quotes and progressive total while other rows are still loading', () => {
    mockBatchSellQuoteData = {
      ...defaultQuoteData,
      totalReceived: {
        ...defaultQuoteData.totalReceived,
        formattedFiat: '$3,456.78',
      },
      isLoading: true,
      isSummaryLoading: false,
      hasPendingQuoteRows: true,
      tokenData: {
        ...defaultQuoteData.tokenData,
        [ethAssetId]: {
          ...defaultQuoteData.tokenData[ethAssetId],
          isLoading: false,
        },
        [uniAssetId]: {
          ...defaultQuoteData.tokenData[uniAssetId],
          isLoading: true,
        },
      },
    };

    const { getAllByText, getByTestId, getByText, queryByTestId } = render(
      <BatchSellReview />,
    );
    const reviewButton = getByTestId(BatchSellReviewSelectorsIDs.REVIEW_BUTTON);

    expect(getByText('Searching for best quotes')).toBeOnTheScreen();
    expect(getAllByText('$3,456.78').length).toBeGreaterThan(0);
    expect(
      queryByTestId(BatchSellReviewSelectorsIDs.TOTAL_RECEIVED_SKELETON),
    ).toBeNull();
    expect(
      queryByTestId(
        `${BatchSellReviewSelectorsIDs.TOKEN_AMOUNT_SKELETON}-0x1:0x1111111111111111111111111111111111111111`,
      ),
    ).toBeNull();
    expect(
      getByTestId(
        `${BatchSellReviewSelectorsIDs.TOKEN_AMOUNT_SKELETON}-0x1:0x2222222222222222222222222222222222222222`,
      ),
    ).toBeOnTheScreen();
    expect(reviewButton.props.accessibilityState.disabled).toBe(true);
  });

  it('renders no quote available for unavailable rows and allows review with multiple available quotes', () => {
    mockSelectedTokens = [...defaultSelectedTokens, thirdSelectedToken];
    mockBatchSellSourceTokenAmounts = {
      ...mockBatchSellSourceTokenAmounts,
      [linkAssetId]: '42.123',
    };
    mockBatchSellQuoteData = {
      ...defaultQuoteData,
      tokenData: {
        ...defaultQuoteData.tokenData,
        [linkAssetId]: {
          key: linkAssetId,
          tokenSymbol: 'LINK',
          slippage: '2%',
          receivedAmount: '-- USDC',
          receivedAmountFiat: '-',
          isQuoteUnavailable: true,
        },
      },
      totalReceived: {
        formatted: '3,956.78 USDC',
        formattedFiat: '$3,956.78',
      },
      isLoading: false,
      isSummaryLoading: false,
      hasAnyQuote: true,
      hasPendingQuoteRows: false,
    };

    const { getByTestId, getByText } = render(<BatchSellReview />);
    const reviewButton = getByTestId(BatchSellReviewSelectorsIDs.REVIEW_BUTTON);

    expect(getByText('No quote available')).toBeOnTheScreen();
    expect(getByText('42.123 LINK • 100%')).toBeOnTheScreen();
    expect(reviewButton.props.accessibilityState.disabled).not.toBe(true);
  });

  it('opens final review without a quote snapshot when unavailable rows are present', () => {
    mockSelectedTokens = [...defaultSelectedTokens, thirdSelectedToken];
    mockBatchSellSourceTokenAmounts = {
      ...mockBatchSellSourceTokenAmounts,
      [linkAssetId]: '42.123',
    };
    mockBatchSellQuoteData = {
      ...defaultQuoteData,
      tokenData: {
        ...defaultQuoteData.tokenData,
        [linkAssetId]: {
          key: linkAssetId,
          tokenSymbol: 'LINK',
          slippage: '2%',
          receivedAmount: '-- USDC',
          receivedAmountFiat: '-',
          isLoading: false,
          isQuoteUnavailable: true,
        },
      },
      hasAnyQuote: true,
      hasPendingQuoteRows: false,
    };

    const { getByTestId } = render(<BatchSellReview />);

    fireEvent.press(getByTestId(BatchSellReviewSelectorsIDs.REVIEW_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.BATCH_SELL_FINAL_REVIEW_MODAL,
    });
    expect(mockTrackBatchSellQuotePageReviewClicked).toHaveBeenCalled();
  });

  it('disables review when no rows have quotes', () => {
    mockBatchSellQuoteData = {
      ...defaultQuoteData,
      tokenData: Object.entries(defaultQuoteData.tokenData).reduce<
        MockBatchSellQuoteData['tokenData']
      >((tokenDataByAssetId, [assetId, tokenData]) => {
        tokenDataByAssetId[assetId] = {
          ...tokenData,
          receivedAmount: '-- USDC',
          receivedAmountFiat: '-',
          isQuoteUnavailable: true,
        };
        return tokenDataByAssetId;
      }, {}),
      totalReceived: {
        formatted: '-- USDC',
        formattedFiat: '-',
      },
      minimumReceived: { formatted: '-- USDC' },
      isLoading: false,
      isSummaryLoading: false,
      hasAnyQuote: false,
      hasPendingQuoteRows: false,
    };
    const { getAllByText, getByTestId, getByText } = render(
      <BatchSellReview />,
    );
    const reviewButton = getByTestId(BatchSellReviewSelectorsIDs.REVIEW_BUTTON);

    expect(getAllByText('No quote available')).toHaveLength(2);
    expect(getByText('Review')).toBeOnTheScreen();
    expect(reviewButton.props.accessibilityState.disabled).toBe(true);
  });

  it('sets selected token percents to 100% on entry', () => {
    const { getByText } = render(<BatchSellReview />);

    expect(getByText('1.498 ETH • 100%')).toBeOnTheScreen();
    expect(getByText('154.297 UNI • 100%')).toBeOnTheScreen();
  });

  it('does not dispatch source token amount updates when undefined values are unchanged', () => {
    mockSelectedTokens = [
      {
        ...defaultSelectedTokens[0],
        balance: undefined,
      },
      defaultSelectedTokens[1],
    ];
    mockBatchSellSourceTokenAmounts = {
      [ethAssetId]: undefined,
      [uniAssetId]: '154.297',
    };

    render(<BatchSellReview />);

    const sourceAmountUpdateCalls = mockDispatch.mock.calls.filter(
      ([action]) => action?.type === 'bridge/setBatchSellSourceTokenAmounts',
    );

    expect(sourceAmountUpdateCalls).toHaveLength(0);
  });

  it('enables the review button when quotes are available', () => {
    const { getByTestId, getByText } = render(<BatchSellReview />);
    const reviewButton = getByTestId(BatchSellReviewSelectorsIDs.REVIEW_BUTTON);

    expect(getByText('Review')).toBeOnTheScreen();
    expect(reviewButton.props.accessibilityState.disabled).not.toBe(true);
  });

  it('disables the review button and clears quotes when all source amounts are zero', () => {
    mockBatchSellSourceTokenAmounts = {
      [ethAssetId]: '0',
      [uniAssetId]: '0',
    };
    mockBatchSellQuoteData = {
      ...defaultQuoteData,
      hasAnyQuote: false,
    };

    const { getByTestId } = render(<BatchSellReview />);
    const reviewButton = getByTestId(BatchSellReviewSelectorsIDs.REVIEW_BUTTON);

    expect(reviewButton.props.accessibilityState.disabled).toBe(true);
    expect(mockUpdateBatchSellQuoteParams).not.toHaveBeenCalled();
    expect(Engine.context.BridgeController.resetState).toHaveBeenCalled();
    expect(mockCancelBatchSellQuoteParams).toHaveBeenCalled();
  });

  it('shows UNKNOWN when there is no destination token match', () => {
    mockSelectedDestinationToken = undefined;
    mockDestinationTokens = [];

    const { getByTestId, getByText } = render(<BatchSellReview />);
    const reviewButton = getByTestId(BatchSellReviewSelectorsIDs.REVIEW_BUTTON);

    expect(getByText('UNKNOWN')).toBeOnTheScreen();
    expect(reviewButton.props.accessibilityState.disabled).not.toBe(true);
  });

  it('opens the destination stablecoin selector modal from the pill', () => {
    const { getByTestId } = render(<BatchSellReview />);

    fireEvent.press(
      getByTestId(BatchSellReviewSelectorsIDs.DESTINATION_TOKEN_PILL),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.BATCH_SELL_DESTINATION_TOKEN_SELECTOR_MODAL,
    });
  });

  it('opens the quote details modal from the total received info button', () => {
    const { getByTestId } = render(<BatchSellReview />);

    fireEvent.press(
      getByTestId(BatchSellReviewSelectorsIDs.TOTAL_RECEIVED_INFO_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.BATCH_SELL_QUOTE_DETAILS_MODAL,
    });
  });

  it('opens the high price impact info modal from a token row tag', () => {
    mockBatchSellQuoteData = {
      ...defaultQuoteData,
      tokenData: {
        ...defaultQuoteData.tokenData,
        [ethAssetId]: {
          ...defaultQuoteData.tokenData[ethAssetId],
          priceImpact: '0.06',
          isHighPriceImpact: true,
        },
      },
    };
    const { getByTestId, getByText } = render(<BatchSellReview />);

    expect(getByText('High price impact')).toBeOnTheScreen();
    fireEvent.press(
      getByTestId(
        `${BatchSellReviewSelectorsIDs.HIGH_PRICE_IMPACT_TAG}-0x1:0x1111111111111111111111111111111111111111`,
      ),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.BATCH_SELL_PRICE_IMPACT_INFO_MODAL,
      params: { priceImpact: '0.06' },
    });
  });

  it('opens the final review modal from the review button', () => {
    const { getByTestId } = render(<BatchSellReview />);

    fireEvent.press(getByTestId(BatchSellReviewSelectorsIDs.REVIEW_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.BATCH_SELL_FINAL_REVIEW_MODAL,
    });
    expect(mockTrackBatchSellQuotePageReviewClicked).toHaveBeenCalled();
  });

  it('shows Get new quote when max refresh expires and fetches fresh quotes', () => {
    mockBatchSellQuoteData = {
      ...defaultQuoteData,
      needsNewQuote: true,
      hasPendingQuoteRows: true,
    };
    const { getByTestId, getByText } = render(<BatchSellReview />);
    const reviewButton = getByTestId(BatchSellReviewSelectorsIDs.REVIEW_BUTTON);

    fireEvent.press(reviewButton);

    expect(getByText('Get new quote')).toBeOnTheScreen();
    expect(reviewButton.props.accessibilityState.disabled).not.toBe(true);
    expect(mockGetNewQuote).toHaveBeenCalledTimes(1);
    expect(mockTrackBatchSellQuotePageReviewClicked).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.BATCH_SELL_FINAL_REVIEW_MODAL,
    });
  });

  it('opens the slippage modal for a selected token row', () => {
    const { getByTestId } = render(<BatchSellReview />);

    fireEvent.press(
      getByTestId(
        `${BatchSellReviewSelectorsIDs.CUSTOMIZE_BUTTON}-0x1:0x1111111111111111111111111111111111111111`,
      ),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.BATCH_SELL_DEFAULT_SLIPPAGE_MODAL,
      params: {
        sourceChainId: '0x1',
        destChainId: '0x1',
        batchSellAssetId: ethAssetId,
      },
    });
  });

  it('renders the selected destination token from Redux', () => {
    mockSelectedDestinationToken = musdToken;
    mockDestinationTokens = [usdcToken, musdToken];

    const { getByText, queryByText } = render(<BatchSellReview />);

    expect(getByText('MUSD')).toBeOnTheScreen();
    expect(queryByText('USDC')).toBeNull();
  });

  it('initializes the destination token to the first displayable stablecoin', () => {
    mockSelectedDestinationToken = undefined;
    mockDestinationTokens = [usdcToken, musdToken];

    render(<BatchSellReview />);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bridge/setBatchSellDestToken',
      payload: usdcToken,
    });
  });

  it('updates Batch Sell quote params when Redux inputs are present', () => {
    render(<BatchSellReview />);

    expect(mockUpdateBatchSellQuoteParams).toHaveBeenCalled();
  });

  it('cancels the Batch Sell quote params update on unmount', () => {
    const { unmount } = render(<BatchSellReview />);

    unmount();

    expect(mockCancelBatchSellQuoteParams).toHaveBeenCalled();
  });

  it('resets controller quote state but leaves Redux bridge state intact on unmount', () => {
    const { unmount } = render(<BatchSellReview />);

    mockDispatch.mockClear();
    unmount();

    expect(Engine.context.BridgeController.resetState).toHaveBeenCalledTimes(1);
    expect(mockDispatch).not.toHaveBeenCalledWith({
      type: 'bridge/resetBridgeState',
    });
  });

  it('removes a token when more than two source tokens are selected', () => {
    mockSelectedTokens = [...defaultSelectedTokens, thirdSelectedToken];
    const { getByTestId } = render(<BatchSellReview />);

    mockDispatch.mockClear();
    fireEvent.press(
      getByTestId(
        `${BatchSellReviewSelectorsIDs.REMOVE_BUTTON}-0x1:0x2222222222222222222222222222222222222222`,
      ),
    );

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bridge/setBatchSellSourceTokens',
      payload: [defaultSelectedTokens[0], thirdSelectedToken],
    });
  });

  it('disables token removal when two source tokens are selected', () => {
    const { getByTestId } = render(<BatchSellReview />);
    const removeButton = getByTestId(
      `${BatchSellReviewSelectorsIDs.REMOVE_BUTTON}-0x1:0x2222222222222222222222222222222222222222`,
    );

    mockDispatch.mockClear();
    fireEvent.press(removeButton);

    expect(removeButton.props.accessibilityState.disabled).toBe(true);
    expect(mockDispatch).not.toHaveBeenCalledWith({
      type: 'bridge/setBatchSellSourceTokens',
      payload: expect.any(Array),
    });
  });
});
