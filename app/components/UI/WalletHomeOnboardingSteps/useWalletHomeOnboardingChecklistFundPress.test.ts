import { renderHook, act } from '@testing-library/react-native';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { ActionLocation } from '../../../util/analytics/actionButtonTracking';
import { useWalletHomeOnboardingChecklistFundPress } from './useWalletHomeOnboardingChecklistFundPress';

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({ event: 'built' });
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockUseRampsButtonClickData = jest.fn();
jest.mock('../Ramp/hooks/useRampsButtonClickData', () => ({
  useRampsButtonClickData: () => mockUseRampsButtonClickData(),
}));

const mockUseRampsUnifiedV1Enabled = jest.fn();
jest.mock('../Ramp/hooks/useRampsUnifiedV1Enabled', () => ({
  __esModule: true,
  default: () => mockUseRampsUnifiedV1Enabled(),
}));

const mockUseRampsUnifiedV2Enabled = jest.fn();
jest.mock('../Ramp/hooks/useRampsUnifiedV2Enabled', () => ({
  __esModule: true,
  default: () => mockUseRampsUnifiedV2Enabled(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector: (...args: unknown[]) => unknown) =>
    selector({} as never),
  ),
}));

jest.mock('../../../reducers/fiatOrders', () => ({
  getDetectedGeolocation: () => 'US',
}));

jest.mock('./walletHomeOnboardingStepsStrings', () => ({
  walletHomeOnboardingPrimaryLabelForStep: jest.fn(() => 'Add funds'),
}));

const defaultButtonClickData = {
  ramp_routing: 'SMART_ROUTING' as const,
  is_authenticated: true,
  preferred_provider: 'test-provider',
  order_count: 2,
};

describe('useWalletHomeOnboardingChecklistFundPress', () => {
  const goToBuy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampsButtonClickData.mockReturnValue(defaultButtonClickData);
    mockUseRampsUnifiedV1Enabled.mockReturnValue(false);
    mockUseRampsUnifiedV2Enabled.mockReturnValue(false);
  });

  it('fires RAMPS_BUTTON_CLICKED with location onboarding_checklist then calls goToBuy', () => {
    const { result } = renderHook(() =>
      useWalletHomeOnboardingChecklistFundPress(goToBuy),
    );

    act(() => {
      result.current();
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.RAMPS_BUTTON_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      button_text: 'Add funds',
      location: ActionLocation.ONBOARDING_CHECKLIST,
      ramp_type: 'BUY',
      region: 'US',
      ramp_routing: 'SMART_ROUTING',
      is_authenticated: true,
      preferred_provider: 'test-provider',
      order_count: 2,
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({ event: 'built' });
    expect(goToBuy).toHaveBeenCalledTimes(1);
  });

  it('uses UNIFIED_BUY_2 ramp_type when V2 unified is enabled', () => {
    mockUseRampsUnifiedV2Enabled.mockReturnValue(true);

    const { result } = renderHook(() =>
      useWalletHomeOnboardingChecklistFundPress(goToBuy),
    );

    act(() => {
      result.current();
    });

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        ramp_type: 'UNIFIED_BUY_2',
      }),
    );
  });
});
