import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getTokenDetectionControllerInitMessenger,
  getTokenDetectionControllerMessenger,
  TokenDetectionControllerInitMessenger,
  type TokenDetectionControllerMessenger,
} from '../messengers/token-detection-controller-messenger';
import { ControllerInitRequest } from '../types';
import { tokenDetectionControllerInit } from './token-detection-controller-init';
import { TokenDetectionController } from '@metamask/assets-controllers';

jest.mock('@metamask/assets-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<
    TokenDetectionControllerMessenger,
    TokenDetectionControllerInitMessenger
  >
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
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
      platform: 'mobile',
      useAccountsAPI: true,
      disabled: false,
      getBalancesInSingleCall: expect.any(Function),
      useTokenDetection: expect.any(Function),
      useExternalServices: expect.any(Function),
      trackMetaMetricsEvent: expect.any(Function),
    });
  });
});
