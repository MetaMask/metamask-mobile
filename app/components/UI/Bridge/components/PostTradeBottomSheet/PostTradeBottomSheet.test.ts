import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PostTradeBottomSheet } from './index';
import Routes from '../../../../../constants/navigation/Routes';
import {
  getPostTradeSuggestionPillTestId,
  PostTradeBottomSheetTestIds,
} from './PostTradeBottomSheet.testIds';
import { PostTradeStatus } from './PostTradeBottomSheet.types';

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockResetState = jest.fn();
const mockUpdateQuoteParams = jest.fn();
let mockPostTradeStatus = PostTradeStatus.Failed;
let mockPostTradeTrendingTokens = {
  tokens: [] as unknown[],
  isLoading: false,
  error: null,
  refetch: jest.fn(),
};
let mockParams = {
  status: PostTradeStatus.Failed,
  sourceAmount: '1.23456',
  destAmount: '2.34567',
  sourceToken: {
    address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    symbol: 'ETH',
    chainId: '0x1',
    decimals: 18,
  },
  destToken: {
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    symbol: 'USDC',
    chainId: '0x1',
    decimals: 6,
  },
};

jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch }));
jest.mock('../../hooks/useBridgeQuoteRequest', () => ({
  useBridgeQuoteRequest: () => mockUpdateQuoteParams,
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: mockNavigate }),
}));
jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: { BridgeController: { resetState: () => mockResetState() } },
  },
}));
jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => mockParams,
}));
jest.mock('./usePostTradeTxStatus', () => ({
  usePostTradeTxStatus: () => mockPostTradeStatus,
}));
jest.mock('./usePostTradeTrendingTokens', () => ({
  usePostTradeTrendingTokens: () => mockPostTradeTrendingTokens,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPostTradeStatus = PostTradeStatus.Failed;
  mockPostTradeTrendingTokens = {
    tokens: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  };
  mockParams = {
    status: PostTradeStatus.Failed,
    sourceAmount: '1.23456',
    destAmount: '2.34567',
    sourceToken: {
      address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      symbol: 'ETH',
      chainId: '0x1',
      decimals: 18,
    },
    destToken: {
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      symbol: 'USDC',
      chainId: '0x1',
      decimals: 6,
    },
  };
});

describe('PostTradeBottomSheet', () => {
  it('runs failed-state actions', () => {
    const { getByTestId, queryByTestId } = render(
      React.createElement(PostTradeBottomSheet),
    );

    expect(
      queryByTestId(PostTradeBottomSheetTestIds.SUGGESTIONS_SECTION),
    ).toBeNull();

    fireEvent.press(getByTestId(PostTradeBottomSheetTestIds.TRY_AGAIN_BUTTON));
    fireEvent.press(
      getByTestId(PostTradeBottomSheetTestIds.VIEW_ACTIVITY_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    expect(mockResetState).toHaveBeenCalled();
    expect(mockUpdateQuoteParams).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'bridge/setSourceAmount',
        payload: '1.23456',
      }),
    );
  });

  it('shows skeleton suggestions while trending tokens load', () => {
    mockPostTradeStatus = PostTradeStatus.InProgress;
    mockPostTradeTrendingTokens = {
      tokens: [],
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    };

    const { getAllByTestId, getByText } = render(
      React.createElement(PostTradeBottomSheet),
    );

    expect(getByText('What to swap next')).toBeTruthy();
    expect(getAllByTestId('section-pills-skeleton').length).toBeGreaterThan(0);
  });

  it('sets up the swap form with an empty source amount when a suggestion is pressed', () => {
    mockPostTradeStatus = PostTradeStatus.Success;
    const suggestedToken = {
      assetId: 'eip155:1/erc20:0x1111111111111111111111111111111111111111',
      name: 'Uniswap',
      symbol: 'UNI',
      decimals: 18,
      marketCap: 1000,
      priceChangePct: { h24: '1.23' },
    };
    mockPostTradeTrendingTokens = {
      tokens: [suggestedToken],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    };

    const { getByTestId } = render(React.createElement(PostTradeBottomSheet));

    fireEvent.press(
      getByTestId(getPostTradeSuggestionPillTestId(suggestedToken.assetId)),
    );

    expect(mockResetState).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'bridge/setSourceToken',
        payload: mockParams.sourceToken,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'bridge/setDestToken',
        payload: expect.objectContaining({
          address: '0x1111111111111111111111111111111111111111',
          chainId: '0x1',
          symbol: 'UNI',
        }),
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'bridge/setIsDestTokenManuallySet',
        payload: true,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'bridge/setSourceAmount',
        payload: undefined,
      }),
    );
  });
});
