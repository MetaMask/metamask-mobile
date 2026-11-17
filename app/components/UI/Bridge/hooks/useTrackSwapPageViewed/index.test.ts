import {
  FeatureId,
  MetaMetricsSwapsEventSource,
} from '@metamask/bridge-controller';
import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  selectDestToken,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  createMockEventBuilder,
  createMockUseAnalyticsHook,
} from '../../../../../util/test/analyticsMock';
import { useSwapsFeatureId } from '../useSwapsFeatureId';
import { useTrackSwapPageViewed } from './index';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics');

jest.mock('../useSwapsFeatureId', () => ({
  useSwapsFeatureId: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseSwapsFeatureId = jest.mocked(useSwapsFeatureId);
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();

const mockLocation = MetaMetricsSwapsEventSource.MainView;

const sourceToken = {
  symbol: 'ETH',
  chainId: '0x1',
  address: '0x0000000000000000000000000000000000000000',
};

const destToken = {
  symbol: 'USDC',
  chainId: '0x89',
  address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
};

const mockTokens = (
  source: typeof sourceToken | null = sourceToken,
  dest: typeof destToken = destToken,
) => {
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectSourceToken) {
      return source;
    }
    if (selector === selectDestToken) {
      return dest;
    }
    return undefined;
  });
};

const pageViewedProperties = (featureId: FeatureId) => ({
  chain_id_source: '1',
  chain_id_destination: '137',
  token_symbol_source: 'ETH',
  token_symbol_destination: 'USDC',
  token_address_source: sourceToken.address,
  token_address_destination: destToken.address,
  location: mockLocation,
  feature_id: featureId,
});

describe('useTrackSwapPageViewed', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUseSwapsFeatureId.mockReturnValue(FeatureId.UNIFIED_SWAP_BRIDGE);
    mockCreateEventBuilder.mockImplementation(() => createMockEventBuilder());
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
  });

  it('does not track when the source token is missing', () => {
    mockTokens(null);

    renderHook(() => useTrackSwapPageViewed(mockLocation));

    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(mockCreateEventBuilder).not.toHaveBeenCalled();
  });

  it('tracks SWAP_PAGE_VIEWED when the source token appears after the first render', () => {
    mockTokens(null);

    const { rerender } = renderHook(() => useTrackSwapPageViewed(mockLocation));
    mockTokens();

    rerender(undefined);

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockCreateEventBuilder.mock.calls[0][0]).toBe(
      MetaMetricsEvents.SWAP_PAGE_VIEWED,
    );
  });

  it('does not track again when the source token is cleared then set on the same tab', () => {
    mockTokens();

    const { rerender } = renderHook(() => useTrackSwapPageViewed(mockLocation));
    mockTrackEvent.mockClear();
    mockTokens(null);
    rerender(undefined);
    mockTokens();

    rerender(undefined);

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('tracks SWAP_PAGE_VIEWED and Asset Viewed with swap page properties when the source token is set', () => {
    mockTokens();

    renderHook(() => useTrackSwapPageViewed(mockLocation));

    const expectedPageProperties = pageViewedProperties(
      FeatureId.UNIFIED_SWAP_BRIDGE,
    );

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockCreateEventBuilder.mock.calls[0][0]).toBe(
      MetaMetricsEvents.SWAP_PAGE_VIEWED,
    );
    expect(mockCreateEventBuilder.mock.calls[1][0]).toBe(
      MetaMetricsEvents.ASSET_VIEWED,
    );

    const swapBuilder = mockCreateEventBuilder.mock.results[0].value;
    const assetViewedBuilder = mockCreateEventBuilder.mock.results[1].value;

    expect(swapBuilder.addProperties).toHaveBeenCalledWith(
      expectedPageProperties,
    );
    expect(assetViewedBuilder.addProperties).toHaveBeenCalledWith({
      ...expectedPageProperties,
      trade_type: 'Swaps',
      implementation_type: 'native',
    });
  });

  it('tracks ADVANCED_ORDER_PAGE_VIEWED when the feature is not UNIFIED_SWAP_BRIDGE', () => {
    mockUseSwapsFeatureId.mockReturnValue(FeatureId.LIMIT_ORDER);
    mockTokens();

    renderHook(() => useTrackSwapPageViewed(mockLocation));

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockCreateEventBuilder.mock.calls[0][0]).toBe(
      MetaMetricsEvents.ADVANCED_ORDER_PAGE_VIEWED,
    );
    expect(mockCreateEventBuilder.mock.calls[1][0]).toBe(
      MetaMetricsEvents.ASSET_VIEWED,
    );
    expect(
      mockCreateEventBuilder.mock.results[0].value.addProperties,
    ).toHaveBeenCalledWith(pageViewedProperties(FeatureId.LIMIT_ORDER));
  });

  it('tracks at most once per hook mount when the source token stays set', () => {
    mockTokens();

    const { rerender } = renderHook(() => useTrackSwapPageViewed(mockLocation));

    rerender(undefined);

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
  });

  it('does not track again when dest token changes on the same tab', () => {
    mockUseSwapsFeatureId.mockReturnValue(FeatureId.LIMIT_ORDER);
    mockTokens();

    const { rerender } = renderHook(() => useTrackSwapPageViewed(mockLocation));
    mockTrackEvent.mockClear();
    mockTokens(sourceToken, { ...destToken, symbol: 'DAI' });

    rerender(undefined);

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('does not track again when source token changes on the same tab', () => {
    mockUseSwapsFeatureId.mockReturnValue(FeatureId.LIMIT_ORDER);
    mockTokens();

    const { rerender } = renderHook(() => useTrackSwapPageViewed(mockLocation));
    mockTrackEvent.mockClear();
    mockTokens({ ...sourceToken, symbol: 'WETH' });

    rerender(undefined);

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('tracks again when featureId changes', () => {
    mockUseSwapsFeatureId.mockReturnValue(FeatureId.LIMIT_ORDER);
    mockTokens();

    const { rerender } = renderHook(() => useTrackSwapPageViewed(mockLocation));
    mockTrackEvent.mockClear();
    mockCreateEventBuilder.mockClear();
    mockUseSwapsFeatureId.mockReturnValue(FeatureId.RECURRING_ORDER);

    rerender(undefined);

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockCreateEventBuilder.mock.calls[0][0]).toBe(
      MetaMetricsEvents.ADVANCED_ORDER_PAGE_VIEWED,
    );
    expect(
      mockCreateEventBuilder.mock.results[0].value.addProperties,
    ).toHaveBeenCalledWith(pageViewedProperties(FeatureId.RECURRING_ORDER));
  });
});
