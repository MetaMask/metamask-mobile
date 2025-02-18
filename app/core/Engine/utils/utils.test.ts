import { accountsControllerInit } from '../controllers/accounts-controller';
import { initModularizedControllers } from './utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import { NetworkController } from '@metamask/network-controller';
import { mockControllerInitFunction } from './test-utils';

describe('initModularizedControllers', () => {
  it('should initialize controllers', () => {
    const controllers = initModularizedControllers({
      existingControllersByName: {},
      controllerInitFunctions: {
        AccountsController: accountsControllerInit,
      },
      persistedState: {},
      baseControllerMessenger: new ExtendedControllerMessenger(),
    });

    expect(controllers.controllersByName.AccountsController).toBeDefined();
  });

  it('should throw when controller is not found', async () => {
    expect(() =>
      initModularizedControllers({
        existingControllersByName: {},
        controllerInitFunctions: {
          AccountsController: mockControllerInitFunction,
        },
        persistedState: {},
        baseControllerMessenger: new ExtendedControllerMessenger(),
      }),
    ).toThrow(
      'Controller requested before it was initialized: NetworkController',
    );
  });

  it('should not throw when when existing controller is found', async () => {
    expect(() =>
      initModularizedControllers({
        existingControllersByName: {
          NetworkController: jest.fn() as unknown as NetworkController,
        },
        controllerInitFunctions: {
          AccountsController: mockControllerInitFunction,
        },
        persistedState: {},
        baseControllerMessenger: new ExtendedControllerMessenger(),
      }),
    ).not.toThrow();
  });
});
