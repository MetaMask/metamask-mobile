import { trackEvent, buildAndTrackEvent } from './analytics';
import Logger from '../../../util/Logger';
import type { ControllerMessenger } from '../types';
import type { AnalyticsTrackingEvent } from '@metamask/analytics-controller';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';

jest.mock('../../../util/Logger');
jest.mock('../../../util/analytics/AnalyticsEventBuilder');

describe('trackEvent', () => {
  let mockInitMessenger: ControllerMessenger;
  let mockCall: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCall = jest.fn();
    mockInitMessenger = {
      call: mockCall,
    } as unknown as ControllerMessenger;
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

  describe('buildAndTrackEvent', () => {
    let buildAndTrackEventInitMessenger: ControllerMessenger;
    let buildAndTrackEventCall: jest.Mock;
    let mockBuilder: {
      addProperties: jest.Mock;
      build: jest.Mock;
    };

    beforeEach(() => {
      jest.clearAllMocks();

      buildAndTrackEventCall = jest.fn();
      buildAndTrackEventInitMessenger = {
        call: buildAndTrackEventCall,
      } as unknown as ControllerMessenger;

      mockBuilder = {
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn(),
      };
      (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue(
        mockBuilder,
      );
    });

    describe('successful building and tracking', () => {
      it('builds and tracks event with string event name and properties', () => {
        const mockEvent = {
          name: 'test-event',
          properties: { prop1: 'value1' },
          sensitiveProperties: {},
          saveDataRecording: false,
          get isAnonymous(): boolean {
            return false;
          },
          get hasProperties(): boolean {
            return true;
          },
        } as AnalyticsTrackingEvent;

        mockBuilder.build.mockReturnValue(mockEvent);

        buildAndTrackEvent(buildAndTrackEventInitMessenger, 'test-event', {
          prop1: 'value1',
        });

        expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
          'test-event',
        );
        expect(mockBuilder.addProperties).toHaveBeenCalledWith({
          prop1: 'value1',
        });
        expect(mockBuilder.build).toHaveBeenCalled();
        expect(buildAndTrackEventCall).toHaveBeenCalledWith(
          'AnalyticsController:trackEvent',
          mockEvent,
        );
      });

      it('builds and tracks event with empty properties when properties are not provided', () => {
        const mockEvent = {
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
        } as AnalyticsTrackingEvent;

        mockBuilder.build.mockReturnValue(mockEvent);

        buildAndTrackEvent(buildAndTrackEventInitMessenger, 'test-event');

        expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
          'test-event',
        );
        expect(mockBuilder.addProperties).toHaveBeenCalledWith({});
        expect(mockBuilder.build).toHaveBeenCalled();
        expect(buildAndTrackEventCall).toHaveBeenCalledWith(
          'AnalyticsController:trackEvent',
          mockEvent,
        );
      });

      it('builds and tracks event with null properties treated as empty object', () => {
        const mockEvent = {
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
        } as AnalyticsTrackingEvent;

        mockBuilder.build.mockReturnValue(mockEvent);

        buildAndTrackEvent(buildAndTrackEventInitMessenger, 'test-event', null);

        expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
          'test-event',
        );
        expect(mockBuilder.addProperties).toHaveBeenCalledWith({});
        expect(mockBuilder.build).toHaveBeenCalled();
        expect(buildAndTrackEventCall).toHaveBeenCalledWith(
          'AnalyticsController:trackEvent',
          mockEvent,
        );
      });
    });

    describe('error handling', () => {
      it('logs error and does not throw when event building fails', () => {
        const error = new Error('Event building failed');
        (
          AnalyticsEventBuilder.createEventBuilder as jest.Mock
        ).mockImplementation(() => {
          throw error;
        });

        expect(() => {
          buildAndTrackEvent(buildAndTrackEventInitMessenger, 'test-event', {
            prop1: 'value1',
          });
        }).not.toThrow();

        expect(Logger.log).toHaveBeenCalledWith(
          'Error building or tracking analytics event',
          error,
        );
        expect(buildAndTrackEventCall).not.toHaveBeenCalled();
      });

      it('logs error and does not throw when addProperties fails', () => {
        const error = new Error('Add properties failed');
        mockBuilder.addProperties.mockImplementation(() => {
          throw error;
        });

        expect(() => {
          buildAndTrackEvent(buildAndTrackEventInitMessenger, 'test-event', {
            prop1: 'value1',
          });
        }).not.toThrow();

        expect(Logger.log).toHaveBeenCalledWith(
          'Error building or tracking analytics event',
          error,
        );
        expect(buildAndTrackEventCall).not.toHaveBeenCalled();
      });

      it('logs error and does not throw when build fails', () => {
        const error = new Error('Build failed');
        mockBuilder.build.mockImplementation(() => {
          throw error;
        });

        expect(() => {
          buildAndTrackEvent(buildAndTrackEventInitMessenger, 'test-event', {
            prop1: 'value1',
          });
        }).not.toThrow();

        expect(Logger.log).toHaveBeenCalledWith(
          'Error building or tracking analytics event',
          error,
        );
        expect(buildAndTrackEventCall).not.toHaveBeenCalled();
      });

      it('logs error and does not throw when trackEvent fails', () => {
        const error = new Error('Track event failed');
        buildAndTrackEventCall.mockImplementation(() => {
          throw error;
        });

        const mockEvent = {
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
        } as AnalyticsTrackingEvent;

        mockBuilder.build.mockReturnValue(mockEvent);

        expect(() => {
          buildAndTrackEvent(buildAndTrackEventInitMessenger, 'test-event');
        }).not.toThrow();

        // trackEvent catches errors internally and logs them, so buildAndTrackEvent's
        // catch block never executes. Verify trackEvent's error handling works.
        expect(Logger.log).toHaveBeenCalledWith(
          'Error tracking analytics event',
          error,
        );
        expect(buildAndTrackEventCall).toHaveBeenCalled();
      });
    });
  });
});
