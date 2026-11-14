import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PostTradeBottomSheet } from './index';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  getPostTradeSuggestionPillTestId,
  PostTradeBottomSheetTestIds,
} from './PostTradeBottomSheet.testIds';
import {
  PostTradeStatus,
  type SwapSocialPostTrade,
} from './PostTradeBottomSheet.types';
import { getDefaultDestToken } from '../../utils/tokenUtils';
import {
  ImpactMoment,
  playErrorNotification,
  playImpact,
  playSuccessNotification,
} from '../../../../../util/haptics';
import { incrementShareSheetCount } from '../../../../../util/social/postTradePromptStorage';
import {
  buildSpotPostTradeComposerParams,
  openPostTradeComposer,
} from '../../../../Views/SocialLeaderboard/PostTradeShareBottomSheet/postTradeComposerParams';
import Routes from '../../../../../constants/navigation/Routes';

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
let mockDestinationTxHash: string | undefined;
let mockSocialPostTrade: SwapSocialPostTrade | undefined;
let mockTransactionHash: string | undefined;
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
  transactionMetaId: undefined as string | undefined,
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
  useParams: () => ({
    ...mockParams,
    socialPostTrade: mockSocialPostTrade,
    transactionHash: mockTransactionHash,
  }),
}));
jest.mock('./usePostTradeTxStatus', () => ({
  usePostTradeTxStatus: () => mockPostTradeStatus,
}));
jest.mock('./usePostTradeDestinationTxHash', () => ({
  usePostTradeDestinationTxHash: () => mockDestinationTxHash,
}));
jest.mock('../../../../../util/social/postTradePromptStorage', () => ({
  incrementShareSheetCount: jest.fn(),
}));
jest.mock(
  '../../../../Views/SocialLeaderboard/PostTradeShareBottomSheet/postTradeComposerParams',
  () => ({
    buildSpotPostTradeComposerParams: jest.fn((args) => ({ composer: args })),
    openPostTradeComposer: jest.fn(),
  }),
);
jest.mock('../../../../../util/haptics', () => ({
  ImpactMoment: { PrimaryCTA: 'primaryCta' },
  playImpact: jest.fn(() => Promise.resolve()),
  playSuccessNotification: jest.fn(() => Promise.resolve()),
  playErrorNotification: jest.fn(() => Promise.resolve()),
}));
jest.mock('./usePostTradeTrendingTokens', () => ({
  usePostTradeTrendingTokens: () => mockPostTradeTrendingTokens,
}));
jest.mock('../../utils/tokenUtils', () => {
  const actual = jest.requireActual('../../utils/tokenUtils');
  return {
    ...actual,
    getDefaultDestToken: jest.fn(actual.getDefaultDestToken),
  };
});

const mockPlayImpact = jest.mocked(playImpact);
const mockPlaySuccessNotification = jest.mocked(playSuccessNotification);
const mockPlayErrorNotification = jest.mocked(playErrorNotification);

beforeEach(() => {
  jest.clearAllMocks();
  mockPlayImpact.mockResolvedValue(undefined);
  mockPlaySuccessNotification.mockResolvedValue(undefined);
  mockPlayErrorNotification.mockResolvedValue(undefined);
  mockNow = 1000;
  jest.spyOn(Date, 'now').mockImplementation(() => mockNow);
  mockPostTradeStatus = PostTradeStatus.Failed;
  mockSocialPostTrade = undefined;
  mockTransactionHash = undefined;
  mockDestinationTxHash = undefined;
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
    transactionMetaId: undefined,
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
  it('plays status haptics', () => {
    mockPostTradeStatus = PostTradeStatus.InProgress;
    mockParams = {
      ...mockParams,
      status: PostTradeStatus.InProgress,
      transactionMetaId: 'tx-1',
    };
    const { rerender } = render(React.createElement(PostTradeBottomSheet));
    expect(mockPlayImpact).toHaveBeenCalledWith(ImpactMoment.PrimaryCTA);

    mockPostTradeStatus = PostTradeStatus.Success;
    rerender(React.createElement(PostTradeBottomSheet));
    expect(mockPlaySuccessNotification).toHaveBeenCalledTimes(1);

    mockPostTradeStatus = PostTradeStatus.Failed;
    rerender(React.createElement(PostTradeBottomSheet));
    expect(mockPlayErrorNotification).toHaveBeenCalledTimes(1);
  });

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

  const USDC = {
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    symbol: 'USDC',
    chainId: '0x1',
    decimals: 6,
  };
  const ETH = {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    chainId: '0x1',
    decimals: 18,
  };
  const MUSD = {
    address: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
    symbol: 'mUSD',
    chainId: '0x1',
    decimals: 6,
  };
  const suggestion = (
    assetId: string,
    name: string,
    symbol: string,
    decimals: number,
  ) => ({
    assetId,
    name,
    symbol,
    decimals,
    marketCap: 1000,
    priceChangePct: { h24: '1.23' },
  });
  const USDC_SUGGESTION = suggestion(
    'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    'USD Coin',
    'USDC',
    6,
  );
  const ETH_SUGGESTION = suggestion(
    'eip155:1/slip44:60',
    'Ethereum',
    'ETH',
    18,
  );

  // Sets up a successful post-trade modal with the given suggestion and source
  // token override, then presses the suggestion pill.
  const pressSuggestion = (
    suggested: typeof USDC_SUGGESTION,
    sourceToken: typeof USDC,
    destToken?: typeof USDC,
  ) => {
    mockPostTradeStatus = PostTradeStatus.Success;
    mockParams = {
      ...mockParams,
      status: PostTradeStatus.Success,
      sourceToken,
      ...(destToken ? { destToken } : {}),
    };
    mockPostTradeTrendingTokens = {
      tokens: [suggested],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    };
    const { getByTestId } = render(React.createElement(PostTradeBottomSheet));
    fireEvent.press(
      getByTestId(getPostTradeSuggestionPillTestId(suggested.assetId)),
    );
  };

  const expectDispatchedToken = (
    type: string,
    token: { address: string; chainId: string; symbol: string },
  ) =>
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type,
        payload: expect.objectContaining({
          address: token.address,
          chainId: token.chainId,
          symbol: token.symbol,
        }),
      }),
    );

  it('falls back to the native source token when the suggestion matches the previous source on the same chain', () => {
    pressSuggestion(USDC_SUGGESTION, USDC);
    expectDispatchedToken('bridge/setSourceToken', ETH);
    expectDispatchedToken('bridge/setDestToken', USDC);
  });

  it('falls back to the chain default token when the suggestion is the native source token', () => {
    pressSuggestion(ETH_SUGGESTION, ETH);
    expectDispatchedToken('bridge/setSourceToken', MUSD);
    expectDispatchedToken('bridge/setDestToken', ETH);
  });

  it('falls back to the prior destination token when the chain has no configured default', () => {
    (getDefaultDestToken as jest.Mock).mockReturnValue(undefined);
    pressSuggestion(ETH_SUGGESTION, ETH, USDC);
    expectDispatchedToken('bridge/setSourceToken', USDC);
    expectDispatchedToken('bridge/setDestToken', ETH);
  });
});

describe('PostTradeBottomSheet social Create post CTA', () => {
  const COUNT_KEY = {
    address: '0x1111111111111111111111111111111111111111',
    product: 'swaps' as const,
  };
  const SOCIAL_POST_TRADE: SwapSocialPostTrade = {
    countKey: COUNT_KEY,
    tradeInFlightChain: 'ethereum',
    txHash: 'submitted',
    preview: {
      tokenSymbol: 'PEPE',
      tokenAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
      chain: 'ethereum',
      side: 'buy',
      costLabel: '$25.00',
    },
  };
  const SUBMITTED_HASH = '0xsubmitted';
  const DESTINATION_HASH = '0xdestination';

  /** `socialPostTrade: null` renders the sheet without a share context. */
  const renderSheet = ({
    status,
    socialPostTrade = SOCIAL_POST_TRADE,
    transactionHash = SUBMITTED_HASH,
    destinationTxHash,
  }: {
    status: PostTradeStatus;
    socialPostTrade?: SwapSocialPostTrade | null;
    transactionHash?: string;
    destinationTxHash?: string;
  }): ReturnType<typeof render> => {
    mockPostTradeStatus = status;
    mockParams = { ...mockParams, status };
    mockSocialPostTrade = socialPostTrade ?? undefined;
    mockTransactionHash = transactionHash;
    mockDestinationTxHash = destinationTxHash;
    return render(React.createElement(PostTradeBottomSheet));
  };

  it('does not show Create post without a social share context', () => {
    const { getByTestId, queryByTestId } = renderSheet({
      status: PostTradeStatus.Success,
      socialPostTrade: null,
    });

    expect(
      queryByTestId(PostTradeBottomSheetTestIds.CREATE_POST_BUTTON),
    ).toBeNull();
    expect(
      getByTestId(PostTradeBottomSheetTestIds.VIEW_ACTIVITY_BUTTON),
    ).toBeTruthy();
    expect(incrementShareSheetCount).not.toHaveBeenCalled();
  });

  it('shows Create post while in progress, but does not open or count it', () => {
    const { getByTestId } = renderSheet({
      status: PostTradeStatus.InProgress,
    });

    fireEvent.press(
      getByTestId(PostTradeBottomSheetTestIds.CREATE_POST_BUTTON),
    );

    expect(openPostTradeComposer).not.toHaveBeenCalled();
    expect(incrementShareSheetCount).not.toHaveBeenCalled();
  });

  it('enables Create post and counts the trade once when the swap succeeds', () => {
    const { getByTestId, rerender } = renderSheet({
      status: PostTradeStatus.Success,
    });

    expect(
      getByTestId(PostTradeBottomSheetTestIds.CREATE_POST_BUTTON),
    ).toBeTruthy();
    expect(incrementShareSheetCount).toHaveBeenCalledTimes(1);
    expect(incrementShareSheetCount).toHaveBeenCalledWith(
      COUNT_KEY.address,
      COUNT_KEY.product,
    );

    rerender(React.createElement(PostTradeBottomSheet));

    expect(incrementShareSheetCount).toHaveBeenCalledTimes(1);
  });

  it('counts a trade that completes while the sheet is open, not before', () => {
    const { rerender } = renderSheet({ status: PostTradeStatus.InProgress });
    expect(incrementShareSheetCount).not.toHaveBeenCalled();

    mockPostTradeStatus = PostTradeStatus.Success;
    rerender(React.createElement(PostTradeBottomSheet));

    expect(incrementShareSheetCount).toHaveBeenCalledTimes(1);
  });

  it('opens the composer with the submitted hash and tracks the tap', () => {
    const { getByTestId } = renderSheet({ status: PostTradeStatus.Success });

    fireEvent.press(
      getByTestId(PostTradeBottomSheetTestIds.CREATE_POST_BUTTON),
    );

    expect(
      getTrackedEvent(MetaMetricsEvents.SWAPBRIDGE_STATUS_MODAL_BUTTON_CLICKED),
    ).toMatchObject({
      properties: { status_at_click: 'complete', cta_clicked: 'create_post' },
    });
    expect(buildSpotPostTradeComposerParams).toHaveBeenCalledWith({
      transactionHash: SUBMITTED_HASH,
      chain: 'ethereum',
      preview: SOCIAL_POST_TRADE.preview,
    });
    expect(openPostTradeComposer).toHaveBeenCalledWith({
      composer: {
        transactionHash: SUBMITTED_HASH,
        chain: 'ethereum',
        preview: SOCIAL_POST_TRADE.preview,
      },
    });
  });

  it('keeps View activity working while Create post is shown', () => {
    const { getByTestId } = renderSheet({ status: PostTradeStatus.Success });

    fireEvent.press(
      getByTestId(PostTradeBottomSheetTestIds.VIEW_ACTIVITY_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    expect(openPostTradeComposer).not.toHaveBeenCalled();
  });

  it('hides Create post and does not count when the swap fails', () => {
    const { getByTestId, queryByTestId } = renderSheet({
      status: PostTradeStatus.Failed,
    });

    expect(
      queryByTestId(PostTradeBottomSheetTestIds.CREATE_POST_BUTTON),
    ).toBeNull();
    expect(
      getByTestId(PostTradeBottomSheetTestIds.TRY_AGAIN_BUTTON),
    ).toBeTruthy();
    expect(incrementShareSheetCount).not.toHaveBeenCalled();
  });

  it('hides Create post for a bridged buy until the destination hash exists', () => {
    const { queryByTestId } = renderSheet({
      status: PostTradeStatus.Success,
      socialPostTrade: { ...SOCIAL_POST_TRADE, txHash: 'destination' },
    });

    expect(
      queryByTestId(PostTradeBottomSheetTestIds.CREATE_POST_BUTTON),
    ).toBeNull();
    expect(incrementShareSheetCount).not.toHaveBeenCalled();
  });

  it('shares the destination hash for a bridged buy once it is known', () => {
    const { getByTestId } = renderSheet({
      status: PostTradeStatus.Success,
      socialPostTrade: { ...SOCIAL_POST_TRADE, txHash: 'destination' },
      destinationTxHash: DESTINATION_HASH,
    });

    fireEvent.press(
      getByTestId(PostTradeBottomSheetTestIds.CREATE_POST_BUTTON),
    );

    expect(buildSpotPostTradeComposerParams).toHaveBeenCalledWith(
      expect.objectContaining({ transactionHash: DESTINATION_HASH }),
    );
    expect(incrementShareSheetCount).toHaveBeenCalledTimes(1);
  });
});
