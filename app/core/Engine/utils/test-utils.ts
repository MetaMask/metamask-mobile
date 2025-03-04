import { ControllerInitFunction } from '../types';
import {
  AccountsController,
  AccountsControllerMessenger,
} from '@metamask/accounts-controller';

/**
 * Build a mock for the ControllerInitRequest.
 *
 * @returns A mocked ControllerInitRequest.
 */
export function buildControllerInitRequestMock() {
  return {
    getController: jest.fn(),
    persistedState: {},
    getCurrentChainId: jest.fn(),
    getRootState: jest.fn(),
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
