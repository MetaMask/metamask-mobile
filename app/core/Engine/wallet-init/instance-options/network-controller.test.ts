import {
  MOCK_ANY_NAMESPACE,
  MockAnyNamespace,
  Messenger,
} from '@metamask/messenger';
import {
  NetworkControllerRpcEndpointDegradedEvent,
  NetworkControllerRpcEndpointUnavailableEvent,
} from '@metamask/network-controller';
import { setupRpcEndpointMetrics } from './network-controller';
import {
  onRpcEndpointUnavailable,
  onRpcEndpointDegraded,
} from '../../controllers/network-controller/messenger-action-handlers';
import { buildAndTrackEvent } from '../../utils';
import type {
  IMetaMetricsEvent,
  ITrackingEvent,
  JsonMap,
} from '../../../Analytics/MetaMetrics.types';
import { AnalyticsControllerGetStateAction } from '@metamask/analytics-controller';

jest.mock('../../controllers/network-controller/messenger-action-handlers');
jest.mock('../../utils');

describe('setupRpcEndpointMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls buildAndTrackEvent when NetworkController:rpcEndpointUnavailable event is published', () => {
    const messenger = new Messenger<
      MockAnyNamespace,
      AnalyticsControllerGetStateAction,
      NetworkControllerRpcEndpointUnavailableEvent
    >({
      namespace: MOCK_ANY_NAMESPACE,
    });
    messenger.registerActionHandler(
      'AnalyticsController:getState',
      jest.fn().mockReturnValue({ analyticsId: 'test-analytics-id' }),
    );

    let capturedTrackEvent:
      | ((options: {
          event: IMetaMetricsEvent | ITrackingEvent;
          properties: JsonMap;
        }) => void)
      | undefined;

    jest.mocked(onRpcEndpointUnavailable).mockImplementation((args) => {
      capturedTrackEvent = args.trackEvent;
    });

    setupRpcEndpointMetrics(messenger);

    // @ts-expect-error: Partial mock.
    messenger.publish('NetworkController:rpcEndpointUnavailable', {
      chainId: '0x1',
      endpointUrl: 'https://example.com',
      error: new Error('Test error'),
    });

    expect(onRpcEndpointUnavailable).toHaveBeenCalled();
    expect(capturedTrackEvent).toBeDefined();

    // Call the captured trackEvent function to verify it calls buildAndTrackEvent
    const testEvent = {
      category: 'Test Event',
    };
    const testProperties = { testProperty: 'test-value' };
    capturedTrackEvent?.({ event: testEvent, properties: testProperties });

    expect(buildAndTrackEvent).toHaveBeenCalledWith(
      messenger,
      testEvent,
      testProperties,
    );
  });

  it('calls buildAndTrackEvent when NetworkController:rpcEndpointDegraded event is published', () => {
    const messenger = new Messenger<
      MockAnyNamespace,
      AnalyticsControllerGetStateAction,
      NetworkControllerRpcEndpointDegradedEvent
    >({
      namespace: MOCK_ANY_NAMESPACE,
    });
    messenger.registerActionHandler(
      'AnalyticsController:getState',
      jest.fn().mockReturnValue({ analyticsId: 'test-analytics-id' }),
    );

    let capturedTrackEvent:
      | ((options: {
          event: IMetaMetricsEvent | ITrackingEvent;
          properties: JsonMap;
        }) => void)
      | undefined;

    jest.mocked(onRpcEndpointDegraded).mockImplementation((args) => {
      capturedTrackEvent = args.trackEvent;
    });

    setupRpcEndpointMetrics(messenger);

    // @ts-expect-error: Partial mock.
    messenger.publish('NetworkController:rpcEndpointDegraded', {
      chainId: '0x1',
      endpointUrl: 'https://example.com',
      error: new Error('Test error'),
    });

    expect(onRpcEndpointDegraded).toHaveBeenCalled();
    expect(capturedTrackEvent).toBeDefined();

    // Call the captured trackEvent function to verify it calls buildAndTrackEvent
    const testEvent = {
      category: 'Test Event',
    };
    const testProperties = { testProperty: 'test-value' };
    capturedTrackEvent?.({ event: testEvent, properties: testProperties });

    expect(buildAndTrackEvent).toHaveBeenCalledWith(
      messenger,
      testEvent,
      testProperties,
    );
  });

  it('calls buildAndTrackEvent with empty properties when properties are not provided in rpcEndpointUnavailable', () => {
    const messenger = new Messenger<
      MockAnyNamespace,
      AnalyticsControllerGetStateAction,
      NetworkControllerRpcEndpointUnavailableEvent
    >({
      namespace: MOCK_ANY_NAMESPACE,
    });

    messenger.registerActionHandler(
      'AnalyticsController:getState',
      jest.fn().mockReturnValue({ analyticsId: 'test-analytics-id' }),
    );
    let capturedTrackEvent:
      | ((options: {
          event: IMetaMetricsEvent | ITrackingEvent;
          properties: JsonMap;
        }) => void)
      | undefined;

    jest.mocked(onRpcEndpointUnavailable).mockImplementation((args) => {
      capturedTrackEvent = args.trackEvent;
    });

    setupRpcEndpointMetrics(messenger);

    // @ts-expect-error: Partial mock.
    messenger.publish('NetworkController:rpcEndpointUnavailable', {
      chainId: '0x1',
      endpointUrl: 'https://example.com',
      error: new Error('Test error'),
    });

    // Call the captured trackEvent function with empty properties
    const testEvent = {
      category: 'Test Event',
    };
    const testProperties = {};
    capturedTrackEvent?.({ event: testEvent, properties: testProperties });

    expect(buildAndTrackEvent).toHaveBeenCalledWith(
      messenger,
      testEvent,
      testProperties,
    );
  });
});
