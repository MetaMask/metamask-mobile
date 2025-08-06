import { CronjobController } from '@metamask/snaps-controllers';
import { ControllerInitRequest } from '../../types';
import {
  CronjobControllerMessenger,
  getCronjobControllerMessenger,
} from '../../messengers/snaps';
import { cronjobControllerInit } from './cronjob-controller-init';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import ReduxService, { ReduxStore } from '../../../redux';

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<CronjobControllerMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getCronjobControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('CronjobControllerInit', () => {
  beforeEach(() => {
    ReduxService.store = {
      dispatch: jest.fn(),
      getState: jest.fn(() => ({
        // Mock the initial state for CronjobController
        cronjobController: { storage: undefined },
      })),
      subscribe: jest.fn(),
      replaceReducer: jest.fn(),
    } as unknown as ReduxStore;
  });

  it('initializes the controller', () => {
    const { controller } = cronjobControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(CronjobController);
  });
});
