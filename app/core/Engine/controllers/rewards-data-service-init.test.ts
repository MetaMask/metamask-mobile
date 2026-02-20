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

  it('restores persisted UAT backend preference when useUatBackend is true', () => {
    // Arrange
    const requestMock = getInitRequestMock();
    requestMock.persistedState = {
      RewardsController: { useUatBackend: true },
    } as typeof requestMock.persistedState;

    // Act
    const { controller } = rewardsDataServiceInit(requestMock);

    // Assert
    expect(controller.setUseUatBackend).toHaveBeenCalledWith(true);
  });

  it('does not call setUseUatBackend when useUatBackend is false', () => {
    // Arrange
    const requestMock = getInitRequestMock();
    requestMock.persistedState = {
      RewardsController: { useUatBackend: false },
    } as typeof requestMock.persistedState;

    // Act
    const { controller } = rewardsDataServiceInit(requestMock);

    // Assert
    expect(controller.setUseUatBackend).not.toHaveBeenCalled();
  });

  it('does not call setUseUatBackend when RewardsController state is missing', () => {
    // Arrange
    const requestMock = getInitRequestMock();
    requestMock.persistedState = {} as typeof requestMock.persistedState;

    // Act
    const { controller } = rewardsDataServiceInit(requestMock);

    // Assert
    expect(controller.setUseUatBackend).not.toHaveBeenCalled();
  });
});
