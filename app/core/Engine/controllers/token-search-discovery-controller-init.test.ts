import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getTokenSearchDiscoveryControllerMessenger,
  type TokenSearchDiscoveryControllerMessenger,
} from '../messengers/token-search-discovery-controller-messenger';
import { ControllerInitRequest } from '../types';
import { tokenSearchDiscoveryControllerInit } from './token-search-discovery-controller-init';
import {
  TokenSearchDiscoveryController,
  TokenDiscoveryApiService,
  TokenSearchApiService,
} from '@metamask/token-search-discovery-controller';

jest.mock('@metamask/token-search-discovery-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<TokenSearchDiscoveryControllerMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger:
      getTokenSearchDiscoveryControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('TokenSearchDiscoveryControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } =
      tokenSearchDiscoveryControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(TokenSearchDiscoveryController);
  });

  it('passes the proper arguments to the controller', () => {
    tokenSearchDiscoveryControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(TokenSearchDiscoveryController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
      tokenSearchService: expect.any(TokenSearchApiService),
      tokenDiscoveryService: expect.any(TokenDiscoveryApiService),
    });
  });
});
