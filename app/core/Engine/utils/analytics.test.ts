import { trackEvent } from './analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import Logger from '../../../util/Logger';
import type { ControllerMessenger } from '../types';
import type { AnalyticsTrackingEvent } from '@metamask/analytics-controller';

jest.mock('../../../util/analytics/AnalyticsEventBuilder');
jest.mock('../../../util/Logger');

describe('trackEvent', () => {
  let mockInitMessenger: ControllerMessenger;
  let mockCall: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCall = jest.fn();
    mockInitMessenger = {
      call: mockCall,
    } as unknown as ControllerMessenger;

    (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({
        name: 'test-event',
        properties: {},
        sensitiveProperties: {},
        saveDataRecording: false,
        get isAnonymous(): boolean {
          return false;
        },
        get hasProperties(): boolean {
          return false;
        },
      }),
    });
  });

  describe('successful tracking', () => {
    it('tracks event with AnalyticsTrackingEvent', () => {
      const event = {
        name: 'test-event',
        properties: {},
        sensitiveProperties: {},
        saveDataRecording: false,
      } as AnalyticsTrackingEvent;

      trackEvent(mockInitMessenger, event);

      expect(mockCall).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        event,
      );
    });

    it('tracks event with AnalyticsTrackingEvent containing properties', () => {
      const event = {
        name: 'test-event',
        properties: {
          testProperty: 'test-value',
          anotherProperty: 123,
        },
        sensitiveProperties: {},
        saveDataRecording: false,
      } as unknown as AnalyticsTrackingEvent;

      trackEvent(mockInitMessenger, event);

      expect(mockCall).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        event,
      );
    });
  });

  describe('error handling', () => {
    it('logs error and does not throw when initMessenger.call fails', () => {
      const error = new Error('Messenger call failed');
      mockCall.mockImplementation(() => {
        throw error;
      });

      const event = {
        name: 'test-event',
        properties: {},
        sensitiveProperties: {},
        saveDataRecording: false,
      } as AnalyticsTrackingEvent;

      expect(() => {
        trackEvent(mockInitMessenger, event);
      }).not.toThrow();

      expect(Logger.log).toHaveBeenCalledWith(
        'Error tracking analytics event',
        error,
      );
      expect(mockCall).toHaveBeenCalled();
    });
  });
});
