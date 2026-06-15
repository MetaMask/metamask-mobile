import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PostTradeBottomSheet } from './index';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
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
let mockParams = {
  status: PostTradeStatus.Failed,
  sourceAmount: '1.23456',
  destAmount: '2.34567',
  sourceToken: {
    address: '0xsource',
    symbol: 'ETH',
    chainId: '0x1',
    decimals: 18,
  },
  destToken: {
    address: '0xdest',
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
  token_address_source: '0xsource',
  token_address_destination: '0xdest',
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

beforeEach(() => {
  jest.clearAllMocks();
  mockNow = 1000;
  jest.spyOn(Date, 'now').mockImplementation(() => mockNow);
  mockPostTradeStatus = PostTradeStatus.Failed;
  mockParams = {
    status: PostTradeStatus.Failed,
    sourceAmount: '1.23456',
    destAmount: '2.34567',
    sourceToken: {
      address: '0xsource',
      symbol: 'ETH',
      chainId: '0x1',
      decimals: 18,
    },
    destToken: {
      address: '0xdest',
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
    fireEvent.press(getByTestId('post-trade-bottom-sheet-close-button'));

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
    const { getByTestId } = render(React.createElement(PostTradeBottomSheet));

    mockNow = 1400;
    fireEvent.press(getByTestId('post-trade-bottom-sheet-try-again-button'));

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
    expect(mockDispatch.mock.calls[3][0].payload).toBe('1.23456');
  });
});
