import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getNftDetectionControllerMessenger,
  type NftDetectionControllerMessenger,
} from '../messengers/nft-detection-controller-messenger';
import { ControllerInitRequest } from '../types';
import { nftDetectionControllerInit } from './nft-detection-controller-init';
import { NftDetectionController } from '@metamask/assets-controllers';

jest.mock('@metamask/assets-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<NftDetectionControllerMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getNftDetectionControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  // @ts-expect-error: Partial mock.
  requestMock.getController.mockImplementation((name: string) => {
    if (name === 'NftController') {
      return {
        addNft: jest.fn(),
        state: {},
      };
    }

    throw new Error(`Controller "${name}" not found.`);
  });

  return requestMock;
}

describe('NftDetectionControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = nftDetectionControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(NftDetectionController);
  });

  it('passes the proper arguments to the controller', () => {
    nftDetectionControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(NftDetectionController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      disabled: false,
      addNft: expect.any(Function),
      getNftState: expect.any(Function),
    });
  });
});
