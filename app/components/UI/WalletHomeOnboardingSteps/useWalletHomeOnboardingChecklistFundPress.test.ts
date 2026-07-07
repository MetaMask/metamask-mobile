import { renderHook, act } from '@testing-library/react-native';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { ActionLocation } from '../../../util/analytics/actionButtonTracking';
import { useWalletHomeOnboardingChecklistFundPress } from './useWalletHomeOnboardingChecklistFundPress';
import { MAINNET_MUSD_RAMP_ASSET_ID } from './fundRampPriorityAssets';

const mockUseWalletHomeOnboardingFundRampIntent = jest.fn();
jest.mock('./useWalletHomeOnboardingFundRampIntent', () => ({
  useWalletHomeOnboardingFundRampIntent: () =>
    mockUseWalletHomeOnboardingFundRampIntent(),
}));

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
  is_authenticated: true,
  preferred_provider: 'test-provider',
  order_count: 2,
};

describe('useWalletHomeOnboardingChecklistFundPress', () => {
  const goToBuy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampsButtonClickData.mockReturnValue(defaultButtonClickData);
    mockUseWalletHomeOnboardingFundRampIntent.mockReturnValue({
      rampIntent: undefined,
      isLoading: false,
    });
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
      ramp_type: 'UNIFIED_BUY_2',
      region: 'US',
      is_authenticated: true,
      preferred_provider: 'test-provider',
      order_count: 2,
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({ event: 'built' });
    expect(goToBuy).toHaveBeenCalledWith(undefined);
  });

  it('passes resolved ramp intent to goToBuy when available', () => {
    mockUseWalletHomeOnboardingFundRampIntent.mockReturnValue({
      rampIntent: { assetId: MAINNET_MUSD_RAMP_ASSET_ID },
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useWalletHomeOnboardingChecklistFundPress(goToBuy),
    );

    act(() => {
      result.current();
    });

    expect(goToBuy).toHaveBeenCalledWith({
      assetId: MAINNET_MUSD_RAMP_ASSET_ID,
    });
  });
});
