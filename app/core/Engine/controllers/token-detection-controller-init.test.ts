import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import {
  getTokenDetectionControllerInitMessenger,
  getTokenDetectionControllerMessenger,
  TokenDetectionControllerInitMessenger,
} from '../messengers/token-detection-controller-messenger';
import { MessengerClientInitRequest } from '../types';
import { tokenDetectionControllerInit } from './token-detection-controller-init';
import {
  TokenDetectionController,
  TokenDetectionControllerMessenger,
} from '@metamask/assets-controllers';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { getDecimalChainId } from '../../../util/networks';
import { getGlobalChainId } from '../../../util/networks/global-network';

jest.mock('@metamask/assets-controllers');
jest.mock('../../../util/analytics/AnalyticsEventBuilder');
jest.mock('../../../util/networks', () => ({
  getDecimalChainId: jest.fn(),
}));
jest.mock('../../../util/networks/global-network', () => ({
  getGlobalChainId: jest.fn(),
}));

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<
    TokenDetectionControllerMessenger,
    TokenDetectionControllerInitMessenger
  >
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getTokenDetectionControllerMessenger(baseMessenger),
    initMessenger: getTokenDetectionControllerInitMessenger(baseMessenger),
  };

  return requestMock;
}

describe('TokenDetectionControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = tokenDetectionControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(TokenDetectionController);
  });

  it('passes the proper arguments to the controller', () => {
    tokenDetectionControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(TokenDetectionController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      disabled: false,
      getBalancesInSingleCall: expect.any(Function),
      tokenListService: expect.any(Object),
      useTokenDetection: expect.any(Function),
      useExternalServices: expect.any(Function),
      trackMetaMetricsEvent: expect.any(Function),
    });
  });

  describe('trackMetaMetricsEvent', () => {
    it('calls AnalyticsController:trackEvent via initMessenger', () => {
      jest.clearAllMocks();
      jest.mocked(getGlobalChainId).mockReturnValue('0x1');
      jest.mocked(getDecimalChainId).mockReturnValue(1);
      (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue({
        addProperties: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue({
          name: 'Token Detected',
          properties: {
            token_standard: 'ERC20',
            asset_type: 'token',
            chain_id: 1,
          },
        }),
      });

      const request = getInitRequestMock();
      const initCallSpy = jest.spyOn(request.initMessenger, 'call');

      tokenDetectionControllerInit(request);

      const controllerMock = jest.mocked(TokenDetectionController);
      const trackMetaMetricsEvent = controllerMock.mock.calls[0][0]
        .trackMetaMetricsEvent as (() => void) | undefined;

      trackMetaMetricsEvent?.();

      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalled();
      expect(initCallSpy).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        expect.objectContaining({
          name: 'Token Detected',
          properties: {
            token_standard: 'ERC20',
            asset_type: 'token',
            chain_id: 1,
          },
        }),
      );
    });
  });
});
