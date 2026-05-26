import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { MessengerClientInitRequest } from '../../types';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import {
  TransactionPayController,
  TransactionPayControllerMessenger,
  TransactionPayControllerOptions,
} from '@metamask/transaction-pay-controller';
import { TransactionPayControllerInit } from './transaction-pay-controller-init';
import { TransactionPayControllerInitMessenger } from '../../messengers/transaction-pay-controller-messenger';
import { createPaymentOverrideCallback } from './paymentoverride-callback';
import { createPolymarketCallbacks } from './polymarket-callbacks';

jest.mock('@metamask/transaction-pay-controller');
jest.mock('./paymentoverride-callback');
jest.mock('./polymarket-callbacks');

function buildInitRequestMock(
  initRequestProperties: Record<string, unknown> = {},
): jest.Mocked<
  MessengerClientInitRequest<
    TransactionPayControllerMessenger,
    TransactionPayControllerInitMessenger
  >
> {
  const initMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildMessengerClientInitRequestMock(baseControllerMessenger),
    initMessenger:
      initMessenger as unknown as TransactionPayControllerInitMessenger,
    controllerMessenger:
      baseControllerMessenger as unknown as TransactionPayControllerMessenger,
    ...initRequestProperties,
  };

  return requestMock;
}

describe('Transaction Pay Controller Init', () => {
  const transactionPayControllerClassMock = jest.mocked(
    TransactionPayController,
  );

  /**
   * Extract a constructor option passed to the controller.
   *
   * @param option - The option to extract.
   * @param dependencyProperties - Any properties required on the controller dependencies.
   * @returns The extracted option.
   */
  function testConstructorOption<
    T extends keyof TransactionPayControllerOptions,
  >(
    option: T,
    _dependencyProperties: Record<string, unknown> = {},
    initRequestProperties: Record<string, unknown> = {},
  ): TransactionPayControllerOptions[T] {
    const requestMock = buildInitRequestMock(initRequestProperties);

    TransactionPayControllerInit(requestMock);

    return transactionPayControllerClassMock.mock.calls[0][0][option];
  }

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns controller instance', () => {
    const requestMock = buildInitRequestMock();

    expect(TransactionPayControllerInit(requestMock).controller).toBeInstanceOf(
      TransactionPayController,
    );
  });

  it('initialize with correct state', () => {
    const MOCK_TRANSACTION_PAY_CONTROLLER_STATE = {
      transactionData: {},
    };

    const state = testConstructorOption('state', undefined, {
      persistedState: {
        TransactionPayController: MOCK_TRANSACTION_PAY_CONTROLLER_STATE,
      },
    });

    expect(state).toBe(MOCK_TRANSACTION_PAY_CONTROLLER_STATE);
  });

  it('does not override strategy selection in mobile init', () => {
    const getStrategy = testConstructorOption('getStrategy');
    const getStrategies = testConstructorOption('getStrategies');

    expect(getStrategy).toBeUndefined();
    expect(getStrategies).toBeUndefined();
  });

  it('wires createPaymentOverrideCallback into the controller', () => {
    const callbackMock = jest.fn();
    jest
      .mocked(createPaymentOverrideCallback)
      .mockReturnValue(callbackMock as never);

    const getPaymentOverrideData = testConstructorOption(
      'getPaymentOverrideData',
    );

    expect(createPaymentOverrideCallback).toHaveBeenCalledTimes(1);
    expect(getPaymentOverrideData).toBe(callbackMock);
  });

  it('wires Polymarket callbacks into the controller', () => {
    const polymarketCallbacksMock = { __polymarketCallbacks: true };
    jest
      .mocked(createPolymarketCallbacks)
      .mockReturnValue(
        polymarketCallbacksMock as unknown as ReturnType<
          typeof createPolymarketCallbacks
        >,
      );

    const polymarket = testConstructorOption('polymarket');

    expect(createPolymarketCallbacks).toHaveBeenCalledTimes(1);
    expect(polymarket).toBe(polymarketCallbacksMock);
  });
});
