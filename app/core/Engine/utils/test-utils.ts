import {
  AccountsController,
  AccountsControllerMessenger,
} from '@metamask/accounts-controller';

import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import { ControllerInitFunction } from '../types';

/**
 * Build a mock for the ControllerInitRequest.
 *
 * @returns A mocked ControllerInitRequest.
 */
export function buildControllerInitRequestMock<ControllerMessenger>() {
  const messenger = new ExtendedControllerMessenger();
  return {
    controllerMessenger: messenger as unknown as ControllerMessenger,
    getController: jest.fn(),
    persistedState: {},
    getGlobalChainId: jest.fn(),
    getUIState: jest.fn(),
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
