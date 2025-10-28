import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getTokenRatesControllerMessenger,
  type TokenRatesControllerMessenger,
} from '../messengers/token-rates-controller-messenger';
import { ControllerInitRequest } from '../types';
import { tokenRatesControllerInit } from './token-rates-controller-init';
import { TokenRatesController } from '@metamask/assets-controllers';

jest.mock('@metamask/assets-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<TokenRatesControllerMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getTokenRatesControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('TokenRatesControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = tokenRatesControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(TokenRatesController);
  });

  it('passes the proper arguments to the controller', () => {
    tokenRatesControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(TokenRatesController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: { marketData: {} },
      interval: 1_800_000,
      tokenPricesService: expect.any(Function),
    });
  });
});
