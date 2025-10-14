import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getNftControllerMessenger,
  type NftControllerMessenger,
} from '../messengers/nft-controller-messenger';
import { ControllerInitRequest } from '../types';
import { nftControllerInit } from './nft-controller-init';
import { NftController } from '@metamask/assets-controllers';

jest.mock('@metamask/assets-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<NftControllerMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

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
    });
  });
});
