import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import {
  getNetworkControllerInitMessenger,
  getNetworkControllerMessenger,
  NetworkControllerInitMessenger,
} from '../messengers/network-controller-messenger';
import { MessengerClientInitRequest } from '../types';
import { networkControllerInit } from './network-controller-init';
import {
  NetworkController,
  NetworkControllerMessenger,
  NetworkControllerRpcEndpointDegradedEvent,
  NetworkControllerRpcEndpointUnavailableEvent,
} from '@metamask/network-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { buildAndTrackEvent } from '../utils/analytics';
import {
  onRpcEndpointUnavailable,
  onRpcEndpointDegraded,
} from './network-controller/messenger-action-handlers';
import type {
  IMetaMetricsEvent,
  ITrackingEvent,
  JsonMap,
} from '../../../core/Analytics/MetaMetrics.types';

jest.mock('@metamask/network-controller');
jest.mock('../utils/analytics');
jest.mock('./network-controller/messenger-action-handlers');

function getInitRequestMock(
  baseMessenger: ExtendedMessenger<
    MockAnyNamespace,
    never,
    never
  > = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  }),
): jest.Mocked<
  MessengerClientInitRequest<
    NetworkControllerMessenger,
    NetworkControllerInitMessenger
  >
> {
  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getNetworkControllerMessenger(baseMessenger),
    initMessenger: getNetworkControllerInitMessenger(baseMessenger),
  };

  baseMessenger.registerActionHandler(
    // @ts-expect-error: Action not allowed.
    'RemoteFeatureFlagController:getState',
    jest.fn().mockReturnValue({
      remoteFeatureFlags: {
        walletFrameworkRpcFailoverEnabled: true,
      },
    }),
  );

  return requestMock;
}

describe('networkControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes the controller', () => {
    const { controller } = networkControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(NetworkController);
  });

  it('passes the proper arguments to the controller', () => {
    networkControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(NetworkController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
      infuraProjectId: 'NON_EMPTY',
      failoverUrls: {
        '0x1': [],
        '0xe708': [],
        '0xa4b1': [],
        '0xa86a': [],
        '0xa': [],
        '0x89': [],
        '0x2105': [],
        '0x38': [],
        '0x531': [],
        '0x8f': [],
        '0x3e7': [],
        '0x13b2': [],
      },
    });
  });

  describe('buildAndTrackEvent integration', () => {
    it('calls buildAndTrackEvent when NetworkController:rpcEndpointUnavailable event is published', () => {
      const baseMessenger = new ExtendedMessenger<
        MockAnyNamespace,
        never,
        NetworkControllerRpcEndpointUnavailableEvent
      >({
        namespace: MOCK_ANY_NAMESPACE,
      });
      const initRequest = getInitRequestMock(baseMessenger);
      let capturedTrackEvent:
        | ((options: {
            event: IMetaMetricsEvent | ITrackingEvent;
            properties: JsonMap;
          }) => void)
        | undefined;

      jest.mocked(onRpcEndpointUnavailable).mockImplementation((args) => {
        capturedTrackEvent = args.trackEvent;
      });

      networkControllerInit(initRequest);

      // @ts-expect-error: Partial mock.
      baseMessenger.publish('NetworkController:rpcEndpointUnavailable', {
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
        initRequest.initMessenger,
        testEvent,
        testProperties,
      );
    });

    it('calls buildAndTrackEvent when NetworkController:rpcEndpointDegraded event is published', () => {
      const baseMessenger = new ExtendedMessenger<
        MockAnyNamespace,
        never,
        NetworkControllerRpcEndpointDegradedEvent
      >({
        namespace: MOCK_ANY_NAMESPACE,
      });
      const initRequest = getInitRequestMock(baseMessenger);
      let capturedTrackEvent:
        | ((options: {
            event: IMetaMetricsEvent | ITrackingEvent;
            properties: JsonMap;
          }) => void)
        | undefined;

      jest.mocked(onRpcEndpointDegraded).mockImplementation((args) => {
        capturedTrackEvent = args.trackEvent;
      });

      networkControllerInit(initRequest);

      // @ts-expect-error: Partial mock.
      baseMessenger.publish('NetworkController:rpcEndpointDegraded', {
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
        initRequest.initMessenger,
        testEvent,
        testProperties,
      );
    });

    it('calls buildAndTrackEvent with empty properties when properties are not provided in rpcEndpointUnavailable', () => {
      const baseMessenger = new ExtendedMessenger<
        MockAnyNamespace,
        never,
        NetworkControllerRpcEndpointUnavailableEvent
      >({
        namespace: MOCK_ANY_NAMESPACE,
      });
      const initRequest = getInitRequestMock(baseMessenger);
      let capturedTrackEvent:
        | ((options: {
            event: IMetaMetricsEvent | ITrackingEvent;
            properties: JsonMap;
          }) => void)
        | undefined;

      jest.mocked(onRpcEndpointUnavailable).mockImplementation((args) => {
        capturedTrackEvent = args.trackEvent;
      });

      networkControllerInit(initRequest);

      // @ts-expect-error: Partial mock.
      baseMessenger.publish('NetworkController:rpcEndpointUnavailable', {
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
        initRequest.initMessenger,
        testEvent,
        testProperties,
      );
    });
  });
});
