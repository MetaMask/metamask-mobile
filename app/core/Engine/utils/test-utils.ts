import {
  BaseRestrictedControllerMessenger,
  ControllerInitRequest,
  BaseControllerMessenger,
  ControllerInitFunction,
} from '../types';
import {
  AccountsController,
  AccountsControllerMessenger,
} from '@metamask/accounts-controller';

/**
 * Build a mock for the ControllerInitRequest.
 *
 * @returns A mocked ControllerInitRequest.
 */
export function buildControllerInitRequestMock(
  controllerMessenger: BaseControllerMessenger,
): jest.Mocked<ControllerInitRequest<BaseRestrictedControllerMessenger>> {
  return {
    getController: jest.fn(),
    persistedState: {},
    controllerMessenger:
      controllerMessenger as unknown as BaseRestrictedControllerMessenger,
    getCurrentChainId: jest.fn(),
    getRootState: jest.fn(),
    initMessenger: jest.fn() as unknown as void,
  };
}

export const mockControllerInitFunction: ControllerInitFunction<
  AccountsController,
  AccountsControllerMessenger
> = (request) => {
  const { getController } = request;

  getController('NetworkController');

  return {
    controller: jest.fn() as unknown as AccountsController,
  };
};
