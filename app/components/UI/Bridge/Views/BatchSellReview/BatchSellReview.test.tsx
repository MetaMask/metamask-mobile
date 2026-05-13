import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CaipAssetType, Hex } from '@metamask/utils';

import { BridgeToken } from '../../types';
import { BatchSellReview } from './BatchSellReview';
import { BatchSellReviewSelectorsIDs } from './BatchSellReview.testIds';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
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

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: mockNavigate,
    setOptions: jest.fn(),
  }),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  selectBatchSellSourceTokens: jest.fn(() => mockSelectedTokens),
  selectBatchSellDestStablecoins: jest.fn(() => mockDestinationTokens),
  selectBatchSellDestToken: jest.fn(() => mockSelectedDestinationToken),
  selectBatchSellSlippages: jest.fn(() => mockBatchSellSlippages),
  setBatchSellDestToken: jest.fn((token: BridgeToken) => ({
    type: 'bridge/setBatchSellDestToken',
    payload: token,
  })),
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

jest.mock('./BatchSellReviewTokenRow', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable, Text, View } = jest.requireActual('react-native');

  return {
    BatchSellReviewTokenRow: ({
      isRemoveTokenDisabled,
      onRemovePress,
      onSlippagePress,
      percent,
      token,
      tokenKey,
    }: {
      isRemoveTokenDisabled?: boolean;
      onRemovePress: (token: BridgeToken) => void;
      onSlippagePress: (token: BridgeToken) => void;
      percent: number;
      token: BridgeToken;
      tokenKey: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID: `batch-sell-review-token-row-${tokenKey}` },
        ReactActual.createElement(Text, null, token.symbol),
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
  });

  it('renders the quote loading screen', () => {
    const { getByTestId, getByText } = render(<BatchSellReview />);

    expect(
      getByTestId(BatchSellReviewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByText('Total received')).toBeOnTheScreen();
    expect(
      getByTestId(BatchSellReviewSelectorsIDs.TOTAL_RECEIVED_SKELETON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(BatchSellReviewSelectorsIDs.DESTINATION_TOKEN_PILL),
    ).toBeOnTheScreen();
    expect(getByText('USDC')).toBeOnTheScreen();
    expect(getByText('ETH')).toBeOnTheScreen();
    expect(getByText('UNI')).toBeOnTheScreen();
  });

  it('sets selected token percents to 100% on entry', () => {
    const { getAllByText } = render(<BatchSellReview />);

    expect(getAllByText('100%')).toHaveLength(mockSelectedTokens.length);
  });

  it('keeps the review button disabled while quotes load', () => {
    const { getByTestId, getByText } = render(<BatchSellReview />);
    const reviewButton = getByTestId(BatchSellReviewSelectorsIDs.REVIEW_BUTTON);

    expect(getByText('Review')).toBeOnTheScreen();
    expect(reviewButton.props.accessibilityState.disabled).toBe(true);
  });

  it('shows UNKNOWN when there is no destination token match', () => {
    mockSelectedDestinationToken = undefined;
    mockDestinationTokens = [];

    const { getByTestId, getByText, queryByText } = render(<BatchSellReview />);
    const reviewButton = getByTestId(BatchSellReviewSelectorsIDs.REVIEW_BUTTON);

    expect(getByText('UNKNOWN')).toBeOnTheScreen();
    expect(queryByText('USDC')).toBeNull();
    expect(reviewButton.props.accessibilityState.disabled).toBe(true);
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
