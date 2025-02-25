import { accountsControllerInit } from '../controllers/accounts-controller';
import { getControllerOrThrow, initModularizedControllers } from './utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import { NetworkController } from '@metamask/network-controller';
import { mockControllerInitFunction } from './test-utils';
import { AccountsController } from '@metamask/accounts-controller';
import { ControllerInitFunctionByControllerName } from '../types';

describe('initModularizedControllers', () => {
  it('should initialize controllers', () => {
    const controllers = initModularizedControllers({
      existingControllersByName: {},
      controllerInitFunctions: {
        AccountsController: accountsControllerInit,
      } as ControllerInitFunctionByControllerName,
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
        } as ControllerInitFunctionByControllerName,
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
        } as ControllerInitFunctionByControllerName,
        persistedState: {},
        baseControllerMessenger: new ExtendedControllerMessenger(),
      }),
    ).not.toThrow();
  });
});

describe('getControllerOrThrow', () => {
  it('should throw when controller is not found', () => {
    expect(() =>
      getControllerOrThrow({
        controller: undefined,
        name: 'AccountsController',
      }),
    ).toThrow();
  });

  it('should not throw when controller is found', () => {
    expect(() =>
      getControllerOrThrow({
        controller: jest.fn() as unknown as AccountsController,
        name: 'AccountsController',
      }),
    ).not.toThrow();
  });
});
