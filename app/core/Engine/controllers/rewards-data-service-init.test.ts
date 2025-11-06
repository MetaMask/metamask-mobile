import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getRewardsDataServiceMessenger,
  type RewardsDataServiceMessenger,
} from '../messengers/rewards-data-service-messenger';
import { ControllerInitRequest } from '../types';
import { rewardsDataServiceInit } from './rewards-data-service-init';
import { RewardsDataService } from './rewards-controller/services';

jest.mock('./rewards-controller/services');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<RewardsDataServiceMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getRewardsDataServiceMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('RewardsDataServiceInit', () => {
  it('initializes the controller', () => {
    const { controller } = rewardsDataServiceInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(RewardsDataService);
  });

  it('passes the proper arguments to the controller', () => {
    rewardsDataServiceInit(getInitRequestMock());

    const controllerMock = jest.mocked(RewardsDataService);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      locale: expect.any(String),
      fetch: expect.any(Function),
    });
  });
});
