import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { MessengerClientInitRequest } from '../../types';
import {
  MoneyAccountMigrationController,
  defaultMoneyAccountMigrationControllerState,
} from './MoneyAccountMigrationController';
import type {
  MoneyAccountMigrationControllerMessenger,
  MoneyAccountMigrationControllerState,
} from './types';
import { moneyAccountMigrationControllerInit } from '.';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('./MoneyAccountMigrationController', () => {
  const actual = jest.requireActual('./MoneyAccountMigrationController');
  return {
    ...actual,
    MoneyAccountMigrationController: jest.fn((...args: unknown[]) => {
      const Actual = actual.MoneyAccountMigrationController;
      return new Actual(...args);
    }),
  };
});

describe('moneyAccountMigrationControllerInit', () => {
  const controllerClassMock = jest.mocked(MoneyAccountMigrationController);
  let initRequestMock: jest.Mocked<
    MessengerClientInitRequest<MoneyAccountMigrationControllerMessenger>
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    initRequestMock = buildMessengerClientInitRequestMock(
      baseControllerMessenger,
    );
  });

  it('returns a controller instance', () => {
    const result = moneyAccountMigrationControllerInit(initRequestMock);

    expect(result.controller).toBeInstanceOf(
      jest.requireActual('./MoneyAccountMigrationController')
        .MoneyAccountMigrationController,
    );
  });

  it('uses default state when no persisted state is provided', () => {
    initRequestMock.persistedState = {};

    moneyAccountMigrationControllerInit(initRequestMock);

    const constructorArgs = controllerClassMock.mock.calls[0][0];
    expect(constructorArgs.state).toStrictEqual(
      defaultMoneyAccountMigrationControllerState,
    );
  });

  it('uses persisted state when provided', () => {
    const persistedState: MoneyAccountMigrationControllerState = {
      ...defaultMoneyAccountMigrationControllerState,
      status: 'INVENTORIED',
      destination: '0x2222222222222222222222222222222222222222',
    };

    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      MoneyAccountMigrationController: persistedState,
    };

    moneyAccountMigrationControllerInit(initRequestMock);

    const constructorArgs = controllerClassMock.mock.calls[0][0];
    expect(constructorArgs.state).toStrictEqual(persistedState);
  });
});
