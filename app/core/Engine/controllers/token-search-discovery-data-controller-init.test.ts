import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getTokenSearchDiscoveryDataControllerMessenger } from '../messengers/token-search-discovery-data-controller-messenger';
import { ControllerInitRequest } from '../types';
import { tokenSearchDiscoveryDataControllerInit } from './token-search-discovery-data-controller-init';
import {
  TokenSearchDiscoveryDataController,
  type TokenSearchDiscoveryDataControllerMessenger,
} from '@metamask/assets-controllers';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/assets-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<TokenSearchDiscoveryDataControllerMessenger>
> {
  const rootMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(rootMessenger),
    controllerMessenger:
      getTokenSearchDiscoveryDataControllerMessenger(rootMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('TokenSearchDiscoveryDataControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } =
      tokenSearchDiscoveryDataControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(TokenSearchDiscoveryDataController);
  });

  it('passes the proper arguments to the controller', () => {
    tokenSearchDiscoveryDataControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(TokenSearchDiscoveryDataController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      tokenPricesService: expect.any(Function),
    });
  });
});
