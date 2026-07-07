import { AppState } from 'react-native';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getMoneyAccountBalanceServiceMessenger } from '../messengers/money-account-balance-service-messenger';
import { MessengerClientInitRequest } from '../types';
import { moneyAccountBalanceServiceInit } from './money-account-balance-service-init';
import {
  MoneyAccountBalanceService,
  MoneyAccountBalanceServiceMessenger,
} from '@metamask/money-account-balance-service';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { trace } from '../../../util/trace';

jest.mock('@metamask/money-account-balance-service', () => ({
  ...jest.requireActual('@metamask/money-account-balance-service'),
  MoneyAccountBalanceService: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
  })),
}));

jest.mock('../../../util/trace', () => ({
  ...jest.requireActual('../../../util/trace'),
  trace: jest.fn(),
}));

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<MoneyAccountBalanceServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getMoneyAccountBalanceServiceMessenger(baseMessenger),
    initMessenger: undefined,
  };
}

describe('moneyAccountBalanceServiceInit', () => {
  it('returns a MoneyAccountBalanceService instance', () => {
    const { controller } = moneyAccountBalanceServiceInit(getInitRequestMock());

    expect(controller).toBeDefined();
  });

  it('passes messenger to the service', () => {
    moneyAccountBalanceServiceInit(getInitRequestMock());

    const serviceMock = jest.mocked(MoneyAccountBalanceService);
    expect(serviceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger: expect.any(Object),
      }),
    );
  });

  it('calls init on the service', () => {
    moneyAccountBalanceServiceInit(getInitRequestMock());

    const serviceMock = jest.mocked(MoneyAccountBalanceService);
    expect(serviceMock.mock.results[0].value.init).toHaveBeenCalled();
  });
});

describe('trace tagging', () => {
  type TracedFn = (
    request: { name: string; data?: Record<string, unknown> },
    fn?: (...args: unknown[]) => unknown,
  ) => unknown;

  const getTracedFn = (): TracedFn => {
    const serviceMock = jest.mocked(MoneyAccountBalanceService);
    const passedOptions = serviceMock.mock.calls[0][0];
    return passedOptions.trace as unknown as TracedFn;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(AppState, 'currentState', {
      value: 'active',
      configurable: true,
    });
  });

  it('tags trace requests with the current app state', () => {
    Object.defineProperty(AppState, 'currentState', {
      value: 'background',
      configurable: true,
    });
    moneyAccountBalanceServiceInit(getInitRequestMock());
    const tracedFn = getTracedFn();

    tracedFn({ name: 'test-op' });

    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ app_state: 'background' }),
      }),
      undefined,
    );
  });

  it('tags trace requests with unknown app state when currentState is unset', () => {
    Object.defineProperty(AppState, 'currentState', {
      value: undefined,
      configurable: true,
    });
    moneyAccountBalanceServiceInit(getInitRequestMock());
    const tracedFn = getTracedFn();

    tracedFn({ name: 'test-op' });

    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ app_state: 'unknown' }),
      }),
      undefined,
    );
  });

  it('preserves data already provided by the caller', () => {
    Object.defineProperty(AppState, 'currentState', {
      value: 'active',
      configurable: true,
    });
    moneyAccountBalanceServiceInit(getInitRequestMock());
    const tracedFn = getTracedFn();

    tracedFn({ name: 'test-op', data: { address: '0x123' } });

    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'test-op',
        data: expect.objectContaining({
          address: '0x123',
          app_state: 'active',
        }),
      }),
      undefined,
    );
  });

  it('forwards the callback function to trace', () => {
    Object.defineProperty(AppState, 'currentState', {
      value: 'active',
      configurable: true,
    });
    moneyAccountBalanceServiceInit(getInitRequestMock());
    const tracedFn = getTracedFn();
    const callback = jest.fn();

    tracedFn({ name: 'test-op' }, callback);

    expect(trace).toHaveBeenCalledWith(expect.anything(), callback);
  });
});
