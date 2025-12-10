import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getRewardsDataServiceMessenger } from '../messengers/rewards-data-service-messenger';
import { ControllerInitRequest } from '../types';
import { rewardsDataServiceInit } from './rewards-data-service-init';
import {
  RewardsDataService,
  RewardsDataServiceMessenger,
} from './rewards-controller/services';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('./rewards-controller/services');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<RewardsDataServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

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
