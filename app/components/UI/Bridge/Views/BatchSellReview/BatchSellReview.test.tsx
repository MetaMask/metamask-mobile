import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CaipAssetType, Hex } from '@metamask/utils';

import { BridgeToken } from '../../types';
import { BatchSellReview } from './BatchSellReview';
import { BatchSellReviewSelectorsIDs } from './BatchSellReview.testIds';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockCancelBatchSellQuoteParams = jest.fn();
const mockUpdateBatchSellQuoteParams = Object.assign(jest.fn(), {
  cancel: mockCancelBatchSellQuoteParams,
});
const defaultQuoteData = {
  tokenData: [
    {
      key: '0x1:0x1111111111111111111111111111111111111111',
      tokenSymbol: 'ETH',
      slippage: '2%',
      receivedAmount: '3,456.78 USDC',
      isLoading: false,
    },
    {
      key: '0x1:0x2222222222222222222222222222222222222222',
      tokenSymbol: 'UNI',
      slippage: '2%',
      receivedAmount: '500 USDC',
      isLoading: false,
    },
  ],
  totalReceived: '3,956.78 USDC',
  minimumReceived: '3,900 USDC',
  isLoading: false,
  hasCompleteQuoteSet: true,
  networkFee: '1.20 USDC',
  networkFeeFiat: '$1.20',
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
    (token: { balance?: string }, percent: number) =>
      token.balance && percent > 0 ? token.balance : '0',
  ),
  useBatchSellQuoteRequest: jest.fn(() => mockUpdateBatchSellQuoteParams),
}));

jest.mock('../../hooks/useBatchSellQuoteData', () => ({
  useBatchSellQuoteData: () => mockBatchSellQuoteData,
}));

jest.mock('./BatchSellReviewTokenRow', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable, Text, View } = jest.requireActual('react-native');

  return {
    BatchSellReviewTokenRow: ({
      isRemoveTokenDisabled,
      onRemovePress,
      onSlippagePress,
      percent,
      receivedAmount,
      isLoading,
      token,
      tokenKey,
    }: {
      isRemoveTokenDisabled?: boolean;
      onRemovePress: (token: BridgeToken) => void;
      onSlippagePress: (token: BridgeToken) => void;
      percent: number;
      receivedAmount: string;
      isLoading?: boolean;
      token: BridgeToken;
      tokenKey: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID: `batch-sell-review-token-row-${tokenKey}` },
        ReactActual.createElement(Text, null, token.symbol),
        isLoading
          ? ReactActual.createElement(View, {
              testID: `batch-sell-review-token-amount-skeleton-${tokenKey}`,
            })
          : ReactActual.createElement(Text, null, receivedAmount),
        ReactActual.createElement(Text, null, `${percent}%`),
        ReactActual.createElement(Pressable, {
          onPress: () => onSlippagePress(token),
          testID: `batch-sell-review-customize-button-${tokenKey}`,
        }),
        ReactActual.createElement(Pressable, {
          accessibilityState: { disabled: Boolean(isRemoveTokenDisabled) },
          disabled: isRemoveTokenDisabled,
          onPress: isRemoveTokenDisabled
            ? undefined
            : () => onRemovePress(token),
          testID: `batch-sell-review-remove-button-${tokenKey}`,
        }),
      ),
  };
});

describe('BatchSellReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedTokens = defaultSelectedTokens;
    mockSelectedDestinationToken = usdcToken;
    mockDestinationTokens = [usdcToken];
    mockBatchSellSlippages = {};
    mockBatchSellSourceTokenAmounts = {
      'eip155:1/erc20:0x1111111111111111111111111111111111111111': '1.498',
      'eip155:1/erc20:0x2222222222222222222222222222222222222222': '154.297',
    };
    mockBatchSellQuoteData = defaultQuoteData;
  });

  it('renders the quote review screen', () => {
    const { getByTestId, getByText } = render(<BatchSellReview />);

    expect(
      getByTestId(BatchSellReviewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByText('Total received')).toBeOnTheScreen();
    expect(getByText('3,956.78 USDC')).toBeOnTheScreen();
    expect(
      getByTestId(BatchSellReviewSelectorsIDs.DESTINATION_TOKEN_PILL),
    ).toBeOnTheScreen();
    expect(getByText('USDC')).toBeOnTheScreen();
    expect(getByText('ETH')).toBeOnTheScreen();
    expect(getByText('UNI')).toBeOnTheScreen();
    expect(getByText('3,456.78 USDC')).toBeOnTheScreen();
    expect(getByText('500 USDC')).toBeOnTheScreen();
  });

  it('renders the quote loading screen', () => {
    mockBatchSellQuoteData = {
      ...defaultQuoteData,
      tokenData: defaultQuoteData.tokenData.map((tokenData) => ({
        ...tokenData,
        isLoading: true,
      })),
      isLoading: true,
      hasCompleteQuoteSet: false,
    };
    const { getByTestId } = render(<BatchSellReview />);
    const reviewButton = getByTestId(BatchSellReviewSelectorsIDs.REVIEW_BUTTON);

    expect(
      getByTestId(BatchSellReviewSelectorsIDs.TOTAL_RECEIVED_SKELETON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        `${BatchSellReviewSelectorsIDs.TOKEN_AMOUNT_SKELETON}-0x1:0x1111111111111111111111111111111111111111`,
      ),
    ).toBeOnTheScreen();
    expect(reviewButton.props.accessibilityState.disabled).toBe(true);
  });

  it('sets selected token percents to 100% on entry', () => {
    const { getAllByText } = render(<BatchSellReview />);

    expect(getAllByText('100%')).toHaveLength(mockSelectedTokens.length);
  });

  it('enables the review button when quotes are available', () => {
    const { getByTestId, getByText } = render(<BatchSellReview />);
    const reviewButton = getByTestId(BatchSellReviewSelectorsIDs.REVIEW_BUTTON);

    expect(getByText('Review')).toBeOnTheScreen();
    expect(reviewButton.props.accessibilityState.disabled).not.toBe(true);
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
      params: {
        tokenData: [
          {
            key: '0x1:0x1111111111111111111111111111111111111111',
            tokenSymbol: 'ETH',
            slippage: '2%',
            receivedAmount: '3,456.78 USDC',
          },
          {
            key: '0x1:0x2222222222222222222222222222222222222222',
            tokenSymbol: 'UNI',
            slippage: '2%',
            receivedAmount: '500 USDC',
          },
        ],
        totalReceived: '3,956.78 USDC',
        minimumReceived: '3,900 USDC',
        isLoading: false,
      },
    });
  });

  it('opens the final review modal from the review button', () => {
    const { getByTestId } = render(<BatchSellReview />);

    fireEvent.press(getByTestId(BatchSellReviewSelectorsIDs.REVIEW_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.BATCH_SELL_FINAL_REVIEW_MODAL,
      params: {
        tokenData: [
          {
            key: '0x1:0x1111111111111111111111111111111111111111',
            tokenSymbol: 'ETH',
            slippage: '2%',
            receivedAmount: '3,456.78 USDC',
          },
          {
            key: '0x1:0x2222222222222222222222222222222222222222',
            tokenSymbol: 'UNI',
            slippage: '2%',
            receivedAmount: '500 USDC',
          },
        ],
        totalReceived: '3,956.78 USDC',
        minimumReceived: '3,900 USDC',
        isLoading: false,
        sourceTokens: [
          {
            key: '0x1:0x1111111111111111111111111111111111111111',
            tokenSymbol: 'ETH',
          },
          {
            key: '0x1:0x2222222222222222222222222222222222222222',
            tokenSymbol: 'UNI',
          },
        ],
        networkFee: '1.20 USDC',
        networkFeeFiat: '$1.20',
        metamaskFeePercent: '0.875',
      },
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
        batchSellAssetId:
          'eip155:1/erc20:0x1111111111111111111111111111111111111111',
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

  it('leaves bridge state intact on unmount', () => {
    const { unmount } = render(<BatchSellReview />);

    mockDispatch.mockClear();
    unmount();

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
