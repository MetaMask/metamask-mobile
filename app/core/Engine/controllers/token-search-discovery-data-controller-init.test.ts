import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getTokenSearchDiscoveryDataControllerMessenger,
  type TokenSearchDiscoveryDataControllerMessenger,
} from '../messengers/token-search-discovery-data-controller-messenger';
import { ControllerInitRequest } from '../types';
import { tokenSearchDiscoveryDataControllerInit } from './token-search-discovery-data-controller-init';
import { TokenSearchDiscoveryDataController } from '@metamask/assets-controllers';

jest.mock('@metamask/assets-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<TokenSearchDiscoveryDataControllerMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger:
      getTokenSearchDiscoveryDataControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('TokenSearchDiscoveryDataControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = tokenSearchDiscoveryDataControllerInit(
      getInitRequestMock(),
    );
    expect(controller).toBeInstanceOf(TokenSearchDiscoveryDataController);
  });

  it('passes the proper arguments to the controller', () => {
    tokenSearchDiscoveryDataControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(TokenSearchDiscoveryDataController);
    expect(controllerMock).toHaveBeenCalledWith({
      fetchSwapsTokensThresholdMs: expect.any(Number),
      fetchTokens: expect.any(Function),
      messenger: expect.any(Object),
      swapsSupportedChainIds: expect.any(Array),
      tokenPricesService: expect.any(Function),
    });
  });
});
