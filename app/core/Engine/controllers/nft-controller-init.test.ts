import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getNftControllerMessenger } from '../messengers/nft-controller-messenger';
import { ControllerInitRequest } from '../types';
import { nftControllerInit } from './nft-controller-init';
import {
  NftController,
  NftControllerMessenger,
} from '@metamask/assets-controllers';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/assets-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<NftControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getNftControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('NftControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = nftControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(NftController);
  });

  it('passes the proper arguments to the controller', () => {
    nftControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(NftController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
      useIpfsSubdomains: false,
      ipfsGateway: 'dweb.link',
    });
  });
});
