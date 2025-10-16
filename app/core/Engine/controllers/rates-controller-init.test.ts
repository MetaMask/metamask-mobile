import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getRatesControllerInitMessenger,
  getRatesControllerMessenger,
  RatesControllerInitMessenger,
  type RatesControllerMessenger,
} from '../messengers/rates-controller-messenger';
import { ControllerInitRequest } from '../types';
import { ratesControllerInit } from './rates-controller-init';
import { RatesController } from '@metamask/assets-controllers';

jest.mock('@metamask/assets-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<RatesControllerMessenger, RatesControllerInitMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

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
