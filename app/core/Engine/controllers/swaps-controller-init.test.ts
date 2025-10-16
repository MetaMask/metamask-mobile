import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getSwapsControllerMessenger,
  type SwapsControllerMessenger,
} from '../messengers/swaps-controller-messenger';
import { ControllerInitRequest } from '../types';
import { swapsControllerInit } from './swaps-controller-init';
import SwapsController from '@metamask/swaps-controller';

jest.mock('@metamask/swaps-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<SwapsControllerMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getSwapsControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('SwapsControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = swapsControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(SwapsController);
  });

  it('passes the proper arguments to the controller', () => {
    swapsControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(SwapsController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      clientId: 'mobile',
      fetchAggregatorMetadataThreshold: expect.any(Number),
      fetchTokensThreshold: expect.any(Number),
      fetchTopAssetsThreshold: expect.any(Number),
      supportedChainIds: expect.any(Array),
      pollCountLimit: expect.any(Number),
      fetchGasFeeEstimates: expect.any(Function),
      fetchEstimatedMultiLayerL1Fee: expect.any(Function),
    });
  });
});
