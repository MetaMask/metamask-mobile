import { trackEvent } from './analytics-utils';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import Logger from '../../../util/Logger';
import type { ControllerMessenger } from '../types';
import type { AnalyticsEventProperties } from '@metamask/analytics-controller';
import type {
  IMetaMetricsEvent,
  ITrackingEvent,
} from '../../../core/Analytics/MetaMetrics.types';

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
    it('tracks event with string event name', () => {
      trackEvent(mockInitMessenger, 'test-event');

      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        'test-event',
      );
      expect(mockCall).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        expect.objectContaining({
          name: 'test-event',
        }),
      );
    });

    it('tracks event with string event name and properties', () => {
      const properties: AnalyticsEventProperties = {
        testProperty: 'test-value',
        anotherProperty: 123,
      };

      trackEvent(mockInitMessenger, 'test-event', properties);

      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        'test-event',
      );
      const mockBuilder = (
        AnalyticsEventBuilder.createEventBuilder as jest.Mock
      ).mock.results[0].value;
      expect(mockBuilder.addProperties).toHaveBeenCalledWith(properties);
      expect(mockCall).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        expect.objectContaining({
          name: 'test-event',
        }),
      );
    });

    it('tracks event with IMetaMetricsEvent', () => {
      const event: IMetaMetricsEvent = {
        category: 'test-category',
        properties: {
          existingProperty: 'value',
        },
      };

      trackEvent(mockInitMessenger, event);

      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        event,
      );
      expect(mockCall).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        expect.objectContaining({
          name: 'test-event',
        }),
      );
    });

    it('tracks event with ITrackingEvent', () => {
      const event: ITrackingEvent = {
        name: 'tracking-event',
        properties: {},
        sensitiveProperties: {},
        saveDataRecording: true,
        get isAnonymous(): boolean {
          return false;
        },
        get hasProperties(): boolean {
          return false;
        },
      };

      trackEvent(mockInitMessenger, event);

      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        event,
      );
      expect(mockCall).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        expect.objectContaining({
          name: 'test-event',
        }),
      );
    });

    it('does not add properties when properties parameter is undefined', () => {
      trackEvent(mockInitMessenger, 'test-event', undefined);

      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        'test-event',
      );
      const mockBuilder = (
        AnalyticsEventBuilder.createEventBuilder as jest.Mock
      ).mock.results[0].value;
      expect(mockBuilder.addProperties).not.toHaveBeenCalled();
      expect(mockCall).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        expect.objectContaining({
          name: 'test-event',
        }),
      );
    });
  });

  describe('error handling', () => {
    it('logs error and does not throw when AnalyticsEventBuilder.createEventBuilder fails', () => {
      const error = new Error('Event builder failed');
      (
        AnalyticsEventBuilder.createEventBuilder as jest.Mock
      ).mockImplementation(() => {
        throw error;
      });

      expect(() => {
        trackEvent(mockInitMessenger, 'test-event');
      }).not.toThrow();

      expect(Logger.log).toHaveBeenCalledWith(
        'Error tracking analytics event',
        error,
      );
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('logs error and does not throw when eventBuilder.addProperties fails', () => {
      const error = new Error('Add properties failed');
      const mockBuilder = {
        addProperties: jest.fn().mockImplementation(() => {
          throw error;
        }),
        build: jest.fn(),
      };
      (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue(
        mockBuilder,
      );

      expect(() => {
        trackEvent(mockInitMessenger, 'test-event', { test: 'value' });
      }).not.toThrow();

      expect(Logger.log).toHaveBeenCalledWith(
        'Error tracking analytics event',
        error,
      );
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('logs error and does not throw when eventBuilder.build fails', () => {
      const error = new Error('Build failed');
      const mockBuilder = {
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockImplementation(() => {
          throw error;
        }),
      };
      (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue(
        mockBuilder,
      );

      expect(() => {
        trackEvent(mockInitMessenger, 'test-event');
      }).not.toThrow();

      expect(Logger.log).toHaveBeenCalledWith(
        'Error tracking analytics event',
        error,
      );
      expect(mockCall).not.toHaveBeenCalled();
    });

    it('logs error and does not throw when initMessenger.call fails', () => {
      const error = new Error('Messenger call failed');
      mockCall.mockImplementation(() => {
        throw error;
      });

      expect(() => {
        trackEvent(mockInitMessenger, 'test-event');
      }).not.toThrow();

      expect(Logger.log).toHaveBeenCalledWith(
        'Error tracking analytics event',
        error,
      );
      expect(mockCall).toHaveBeenCalled();
    });
  });
});
