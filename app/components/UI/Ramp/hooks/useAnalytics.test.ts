// Mock Engine to prevent cascade loading (analytics.ts imports Engine)
jest.mock('../../../../core/Engine/Engine', () => ({
  __esModule: true,
  default: {
    context: {},
    controllerMessenger: null,
    state: {},
  },
}));

// Mock analytics module to avoid circular dependency (it imports Engine)
// This must be before any imports that use analytics
const mockTrackEvent = jest.fn();
jest.mock('../../../../core/Analytics/analytics', () => ({
  __esModule: true,
  analytics: {
    get trackEvent() {
      return mockTrackEvent;
    },
    trackView: jest.fn(),
    identify: jest.fn(),
    optInForRegularAccount: jest.fn(),
    optOutForRegularAccount: jest.fn(),
    optInForSocialAccount: jest.fn(),
    optOutForSocialAccount: jest.fn(),
    getAnalyticsId: jest.fn().mockResolvedValue(''),
    isEnabled: jest.fn().mockReturnValue(false),
    isOptedInForRegularAccount: jest.fn().mockResolvedValue(false),
    isOptedInForSocialAccount: jest.fn().mockResolvedValue(false),
    generateDefaults: jest.fn().mockResolvedValue({
      analyticsId: '',
      optedInForRegularAccount: false,
      optedInForSocialAccount: false,
    }),
  },
}));

import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useAnalytics from './useAnalytics';
import { AnalyticsEventBuilder } from '../../../../core/Analytics/AnalyticsEventBuilder';
import { EVENT_NAME } from '../../../../core/Analytics';

jest.mock('react-native/Libraries/Interaction/InteractionManager', () => ({
  runAfterInteractions: jest.fn((cb) => cb()),
}));

describe('useAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls trackEvent for non-anonymous params', () => {
    const { result } = renderHookWithProvider(() => useAnalytics());

    const testEvent = 'BUY_BUTTON_CLICKED';
    const testEventParams = {
      location: 'Amount to Buy Screen',
      text: 'Buy',
    } as const;

    result.current(testEvent, testEventParams);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      AnalyticsEventBuilder.createEventBuilder(EVENT_NAME[testEvent])
        .addProperties(testEventParams)
        .build(),
    );
  });
});
