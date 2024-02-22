import { trackEvent } from './useAnalytics';
import { ScreenLocation } from '../types'; // Adjust the import path as necessary

jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: jest.fn((callback) => callback()),
  },
}));

const mockTrackEvent = jest.fn();
const mockTrackAnonymousEvent = jest.fn();
jest.mock('../../../../core/Analytics', () => {
  const actual = jest.requireActual('../../../../core/Analytics');

  return {
    ...actual, // Spread all actual exports
    MetaMetrics: {
      getInstance: jest.fn().mockImplementation(() => ({
        trackEvent: mockTrackEvent,
        trackAnonymousEvent: mockTrackAnonymousEvent,
      })),
    },
  };
});

describe('trackEvent', () => {
  beforeEach(() => {
    mockTrackEvent.mockClear();
    mockTrackAnonymousEvent.mockClear();
  });

  it('calls trackAnonymousEvent for an anonymous event', () => {
    // Event from the AnonymousEvents list
    const event = 'RAMP_REGION_SELECTED';
    const params = {
      country_id: '/regions/cl',
      is_unsupported_onramp: false,
      is_unsupported_offramp: false,
      location: 'Region Screen' as ScreenLocation,
      state_id: '/regions/cl',
    };

    trackEvent(event, params);

    expect(mockTrackAnonymousEvent).toHaveBeenCalledWith(event, params);
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
