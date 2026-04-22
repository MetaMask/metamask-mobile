import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getNftDetectionControllerMessenger } from '../messengers/nft-detection-controller-messenger';
import { ControllerInitRequest } from '../types';
import { nftDetectionControllerInit } from './nft-detection-controller-init';
import {
  NftDetectionController,
  NftDetectionControllerMessenger,
} from '@metamask/assets-controllers';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/assets-controllers');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<NftDetectionControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getNftDetectionControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  // @ts-expect-error: Partial mock.
  requestMock.getController.mockImplementation((name: string) => {
    if (name === 'NftController') {
      return {
        addNfts: jest.fn(),
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
      addNfts: expect.any(Function),
      getNftState: expect.any(Function),
    });
  });
});
