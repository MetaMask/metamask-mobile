import { renderHook, act } from '@testing-library/react-native';
import { useRampsButtonClickedEvent } from './useRampsButtonClickedEvent';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({ event: 'built' });
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockUseRampsButtonClickData = jest.fn();
jest.mock('../../../../../UI/Ramp/hooks/useRampsButtonClickData', () => ({
  useRampsButtonClickData: () => mockUseRampsButtonClickData(),
}));

const mockUseRampsUnifiedV1Enabled = jest.fn();
jest.mock('../../../../../UI/Ramp/hooks/useRampsUnifiedV1Enabled', () => ({
  __esModule: true,
  default: () => mockUseRampsUnifiedV1Enabled(),
}));

const mockUseRampsUnifiedV2Enabled = jest.fn();
jest.mock('../../../../../UI/Ramp/hooks/useRampsUnifiedV2Enabled', () => ({
  __esModule: true,
  default: () => mockUseRampsUnifiedV2Enabled(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector: (...args: unknown[]) => unknown) =>
    selector({} as never),
  ),
}));

jest.mock('../../../../../../reducers/fiatOrders', () => ({
  getDetectedGeolocation: () => 'US',
}));

const defaultButtonClickData = {
  ramp_routing: 'SMART_ROUTING' as const,
  is_authenticated: false,
  preferred_provider: undefined,
  order_count: 0,
};

describe('useRampsButtonClickedEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampsButtonClickData.mockReturnValue(defaultButtonClickData);
    mockUseRampsUnifiedV1Enabled.mockReturnValue(false);
    mockUseRampsUnifiedV2Enabled.mockReturnValue(false);
  });

  it('fires RAMPS_BUTTON_CLICKED with ramp_type BUY when both unified flags are off', () => {
    const { result } = renderHook(() => useRampsButtonClickedEvent());

    act(() => {
      result.current.trackBuyButtonClicked();
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.RAMPS_BUTTON_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      button_text: 'Buy',
      location: 'TokensSection',
      ramp_type: 'BUY',
      region: 'US',
      ramp_routing: 'SMART_ROUTING',
      is_authenticated: false,
      preferred_provider: undefined,
      order_count: 0,
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({ event: 'built' });
  });

  it('fires with ramp_type UNIFIED_BUY when V1 is enabled', () => {
    mockUseRampsUnifiedV1Enabled.mockReturnValue(true);

    const { result } = renderHook(() => useRampsButtonClickedEvent());

    act(() => {
      result.current.trackBuyButtonClicked();
    });

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({ ramp_type: 'UNIFIED_BUY' }),
    );
  });

  it('fires with ramp_type UNIFIED_BUY_2 when V2 is enabled', () => {
    mockUseRampsUnifiedV1Enabled.mockReturnValue(true);
    mockUseRampsUnifiedV2Enabled.mockReturnValue(true);

    const { result } = renderHook(() => useRampsButtonClickedEvent());

    act(() => {
      result.current.trackBuyButtonClicked();
    });

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({ ramp_type: 'UNIFIED_BUY_2' }),
    );
  });

  it('includes authentication and order data from useRampsButtonClickData', () => {
    mockUseRampsButtonClickData.mockReturnValue({
      ramp_routing: undefined,
      is_authenticated: true,
      preferred_provider: 'transak',
      order_count: 3,
    });

    const { result } = renderHook(() => useRampsButtonClickedEvent());

    act(() => {
      result.current.trackBuyButtonClicked();
    });

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        is_authenticated: true,
        preferred_provider: 'transak',
        order_count: 3,
        ramp_routing: undefined,
      }),
    );
  });
});
