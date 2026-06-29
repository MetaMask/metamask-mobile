import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PostTradeBottomSheet } from './index';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  getPostTradeSuggestionPillTestId,
  PostTradeBottomSheetTestIds,
} from './PostTradeBottomSheet.testIds';
import { PostTradeStatus } from './PostTradeBottomSheet.types';

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockResetState = jest.fn();
const mockUpdateQuoteParams = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn((event) => ({
  addProperties: (properties: Record<string, unknown>) => ({
    build: () => ({ event, properties }),
  }),
}));
let mockNow = 1000;
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
const expectedSharedProperties = {
  swap_type: 'single_chain',
  chain_id_source: '1',
  chain_id_destination: '1',
  token_symbol_source: 'ETH',
  token_symbol_destination: 'USDC',
  token_address_source: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  token_address_destination: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
};

jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch }));
jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));
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
  mockNow = 1000;
  jest.spyOn(Date, 'now').mockImplementation(() => mockNow);
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

afterEach(() => {
  jest.restoreAllMocks();
});

const getTrackedEvent = (event: unknown) =>
  mockTrackEvent.mock.calls.find(
    ([trackedEvent]) => trackedEvent.event === event,
  )?.[0];

describe('PostTradeBottomSheet', () => {
  it('tracks viewed with normalized status and trade properties', () => {
    mockPostTradeStatus = PostTradeStatus.Success;
    mockParams = {
      ...mockParams,
      status: PostTradeStatus.Success,
      destToken: {
        ...mockParams.destToken,
        chainId: '0x89',
      },
    };

    render(React.createElement(PostTradeBottomSheet));

    expect(
      getTrackedEvent(MetaMetricsEvents.SWAPBRIDGE_STATUS_MODAL_VIEWED),
    ).toEqual({
      event: MetaMetricsEvents.SWAPBRIDGE_STATUS_MODAL_VIEWED,
      properties: {
        initial_status: 'complete',
        ...expectedSharedProperties,
        swap_type: 'crosschain',
        chain_id_destination: '137',
      },
    });
  });

  it('tracks dismissed when the modal closes', () => {
    const { getByTestId } = render(React.createElement(PostTradeBottomSheet));

    mockNow = 1250;
    fireEvent.press(getByTestId(PostTradeBottomSheetTestIds.CLOSE_BUTTON));

    expect(
      getTrackedEvent(MetaMetricsEvents.SWAPBRIDGE_STATUS_MODAL_DISMISSED),
    ).toEqual({
      event: MetaMetricsEvents.SWAPBRIDGE_STATUS_MODAL_DISMISSED,
      properties: {
        status_at_dismissal: 'failed',
        time_modal_open_ms: 250,
        ...expectedSharedProperties,
      },
    });
  });

  it('tracks CTA clicks without double-counting dismissal', () => {
    const { getByTestId, queryByTestId } = render(
      React.createElement(PostTradeBottomSheet),
    );

    expect(
      queryByTestId(PostTradeBottomSheetTestIds.SUGGESTIONS_SECTION),
    ).toBeNull();

    mockNow = 1400;
    fireEvent.press(getByTestId(PostTradeBottomSheetTestIds.TRY_AGAIN_BUTTON));

    expect(
      getTrackedEvent(MetaMetricsEvents.SWAPBRIDGE_STATUS_MODAL_BUTTON_CLICKED),
    ).toEqual({
      event: MetaMetricsEvents.SWAPBRIDGE_STATUS_MODAL_BUTTON_CLICKED,
      properties: {
        status_at_click: 'failed',
        cta_clicked: 'try_again',
        time_modal_open_ms: 400,
        ...expectedSharedProperties,
      },
    });
    expect(
      getTrackedEvent(MetaMetricsEvents.SWAPBRIDGE_STATUS_MODAL_DISMISSED),
    ).toBeUndefined();
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

    mockNow = 1500;
    fireEvent.press(
      getByTestId(getPostTradeSuggestionPillTestId(suggestedToken.assetId)),
    );

    expect(
      getTrackedEvent(MetaMetricsEvents.SWAPBRIDGE_STATUS_MODAL_BUTTON_CLICKED),
    ).toMatchObject({
      properties: {
        status_at_click: 'complete',
        cta_clicked: 'trending_token',
        time_modal_open_ms: 500,
        token_symbol_clicked: 'UNI',
        token_address_clicked: '0x1111111111111111111111111111111111111111',
        token_clicked_is_imported: false,
      },
    });
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

  it('falls back to the native source token when the suggestion matches the previous source on the same chain', () => {
    mockPostTradeStatus = PostTradeStatus.Success;
    // Previous trade source is USDC on mainnet; the suggestion is the same USDC.
    mockParams = {
      ...mockParams,
      status: PostTradeStatus.Success,
      sourceToken: {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        symbol: 'USDC',
        chainId: '0x1',
        decimals: 6,
      },
    };
    const suggestedToken = {
      assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
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

    // Source should fall back to the native ETH token, not the conflicting USDC.
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'bridge/setSourceToken',
        payload: expect.objectContaining({
          address: '0x0000000000000000000000000000000000000000',
          chainId: '0x1',
          symbol: 'ETH',
        }),
      }),
    );
    // Destination is the selected suggestion.
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'bridge/setDestToken',
        payload: expect.objectContaining({
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          chainId: '0x1',
          symbol: 'USDC',
        }),
      }),
    );
  });

  it('keeps the previous source when the suggestion shares an address but is on a different chain', () => {
    mockPostTradeStatus = PostTradeStatus.Success;
    // Previous trade source is an ERC20 on mainnet.
    const sourceAddress = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca';
    mockParams = {
      ...mockParams,
      status: PostTradeStatus.Success,
      sourceToken: {
        address: sourceAddress,
        symbol: 'ABC',
        chainId: '0x1',
        decimals: 18,
      },
    };
    // Suggestion has the same address but on Polygon.
    const suggestedToken = {
      assetId: `eip155:137/erc20:${sourceAddress}`,
      name: 'ABC',
      symbol: 'ABC',
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

    // Same address, different chain -> not identical, so keep previous source.
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'bridge/setSourceToken',
        payload: expect.objectContaining({
          address: sourceAddress,
          chainId: '0x1',
          symbol: 'ABC',
        }),
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'bridge/setDestToken',
        payload: expect.objectContaining({
          address: sourceAddress,
          chainId: '0x89',
          symbol: 'ABC',
        }),
      }),
    );
  });
});
