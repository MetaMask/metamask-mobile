import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getTokenRatesControllerMessenger } from '../messengers/token-rates-controller-messenger';
import { ControllerInitRequest } from '../types';
import { tokenRatesControllerInit } from './token-rates-controller-init';
import {
  TokenRatesController,
  TokenRatesControllerMessenger,
} from '@metamask/assets-controllers';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/assets-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<TokenRatesControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

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
