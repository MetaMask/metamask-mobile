import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useStickyFooterTracking } from './useStickyFooterTracking';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import { selectTokenDetailsTechnicalIndicatorsEnabled } from '../../../../selectors/featureFlagController/tokenDetailsTechnicalIndicators';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics');

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('useStickyFooterTracking', () => {
  let mockTrackEvent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const analyticsHook = createMockUseAnalyticsHook({
      createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
    });
    mockTrackEvent = analyticsHook.trackEvent as jest.Mock;
    jest.mocked(useAnalytics).mockReturnValue(analyticsHook);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectTokenDetailsTechnicalIndicatorsEnabled) {
        return false;
      }
      return undefined;
    });
  });

  it('tracks token details CTA without indicators_active when flag is OFF', () => {
    const { result } = renderHook(() => useStickyFooterTracking());

    act(() => {
      result.current({
        ctaType: 'buy',
        balanceFiatUsd: 150,
        tokenAddress: '0xabc',
        chainId: '0x1',
        indicatorsActive: ['RSI'],
      });
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Token Details CTA Clicked',
        properties: expect.objectContaining({
          cta_type: 'buy',
          token_address: '0xabc',
          chain_id: '0x1',
        }),
      }),
    );
    expect(mockTrackEvent.mock.calls[0][0].properties).not.toHaveProperty(
      'indicators_active',
    );
  });

  it('includes indicators_active when technical indicators flag is ON', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectTokenDetailsTechnicalIndicatorsEnabled) {
        return true;
      }
      return undefined;
    });

    const { result } = renderHook(() => useStickyFooterTracking());

    act(() => {
      result.current({
        ctaType: 'swap',
        balanceFiatUsd: 50,
        tokenAddress: '0xdef',
        chainId: '0x89',
        indicatorsActive: ['RSI', 'MACD'],
      });
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Token Details CTA Clicked',
        properties: expect.objectContaining({
          cta_type: 'swap',
          indicators_active: ['RSI', 'MACD'],
        }),
      }),
    );
  });

  it('defaults indicators_active to an empty array when flag is ON and value is omitted', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectTokenDetailsTechnicalIndicatorsEnabled) {
        return true;
      }
      return undefined;
    });

    const { result } = renderHook(() => useStickyFooterTracking());

    act(() => {
      result.current({
        ctaType: 'quick_buy',
        balanceFiatUsd: undefined,
        tokenAddress: '0xabc',
        chainId: '0x1',
      });
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          indicators_active: [],
        }),
      }),
    );
  });
});
