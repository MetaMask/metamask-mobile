import { renderHook } from '@testing-library/react-hooks';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { WALLET_HOME_ONBOARDING_CHECKLIST_INTERACTION_TYPE } from './walletHomeOnboardingChecklistAnalytics';
import { useWalletHomeOnboardingChecklistHomeViewed } from './useWalletHomeOnboardingChecklistHomeViewed';

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn(() => ({ builtEvent: true }));
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
}));

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockUseHomepageScrollContext = jest.fn();

jest.mock('../../Views/Homepage/context/HomepageScrollContext', () => ({
  useHomepageScrollContext: () => mockUseHomepageScrollContext(),
}));

describe('useWalletHomeOnboardingChecklistHomeViewed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHomepageScrollContext.mockReturnValue({
      entryPoint: 'app_opened',
      visitId: 1,
      appSessionId: 'session-abc',
    });
  });

  it('does not fire when visitId is 0', () => {
    mockUseHomepageScrollContext.mockReturnValue({
      entryPoint: 'app_opened',
      visitId: 0,
      appSessionId: 'session-abc',
    });

    renderHook(() =>
      useWalletHomeOnboardingChecklistHomeViewed({
        isAwaitingBalance: false,
        stepIndex: 0,
        isFocused: true,
      }),
    );

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('does not fire when screen is not focused', () => {
    renderHook(() =>
      useWalletHomeOnboardingChecklistHomeViewed({
        isAwaitingBalance: false,
        stepIndex: 0,
        isFocused: false,
      }),
    );

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('fires HOME_VIEWED with onboarding_checklist and on_ramp for fund step', () => {
    renderHook(() =>
      useWalletHomeOnboardingChecklistHomeViewed({
        isAwaitingBalance: false,
        stepIndex: 0,
        isFocused: true,
      }),
    );

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.HOME_VIEWED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      interaction_type: WALLET_HOME_ONBOARDING_CHECKLIST_INTERACTION_TYPE,
      location: 'home',
      section_name: 'on_ramp',
      section_index: 0,
      total_sections_loaded: 3,
      is_empty: false,
      item_count: 1,
      entry_point: 'app_opened',
      app_session_id: 'session-abc',
      visit_number: 1,
    });
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('fires section_name first_trade when stepIndex is trade', () => {
    renderHook(() =>
      useWalletHomeOnboardingChecklistHomeViewed({
        isAwaitingBalance: false,
        stepIndex: 1,
        isFocused: true,
      }),
    );

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        section_name: 'first_trade',
        section_index: 1,
      }),
    );
  });

  it('fires section_name notifications on last step', () => {
    renderHook(() =>
      useWalletHomeOnboardingChecklistHomeViewed({
        isAwaitingBalance: false,
        stepIndex: 2,
        isFocused: true,
      }),
    );

    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        section_name: 'notifications',
        section_index: 2,
      }),
    );
  });

  it('refires when visitId increments', () => {
    const { rerender } = renderHook(() =>
      useWalletHomeOnboardingChecklistHomeViewed({
        isAwaitingBalance: false,
        stepIndex: 0,
        isFocused: true,
      }),
    );

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    mockUseHomepageScrollContext.mockReturnValue({
      entryPoint: 'home_tab',
      visitId: 2,
      appSessionId: 'session-abc',
    });

    rerender();

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockAddProperties).toHaveBeenLastCalledWith(
      expect.objectContaining({
        visit_number: 2,
        entry_point: 'home_tab',
      }),
    );
  });

  it('does not duplicate fire for the same visit and step', () => {
    const { rerender } = renderHook(
      ({ stepIndex }) =>
        useWalletHomeOnboardingChecklistHomeViewed({
          isAwaitingBalance: false,
          stepIndex,
          isFocused: true,
        }),
      { initialProps: { stepIndex: 0 } },
    );

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    rerender({ stepIndex: 0 });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });
});
