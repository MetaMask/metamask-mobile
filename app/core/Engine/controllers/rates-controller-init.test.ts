import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import {
  getRatesControllerInitMessenger,
  getRatesControllerMessenger,
  RatesControllerInitMessenger,
} from '../messengers/rates-controller-messenger';
import { ControllerInitRequest } from '../types';
import { ratesControllerInit } from './rates-controller-init';
import {
  RatesController,
  RatesControllerMessenger,
} from '@metamask/assets-controllers';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/assets-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<RatesControllerMessenger, RatesControllerInitMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getRatesControllerMessenger(baseMessenger),
    initMessenger: getRatesControllerInitMessenger(baseMessenger),
  };

  return requestMock;
}

describe('RatesControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = ratesControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(RatesController);
  });

  it('passes the proper arguments to the controller', () => {
    ratesControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(RatesController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: {},
      includeUsdRate: true,
    });
  });
});
