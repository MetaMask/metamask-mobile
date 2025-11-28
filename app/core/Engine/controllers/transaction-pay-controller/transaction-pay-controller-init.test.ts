import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { ControllerInitRequest } from '../../types';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import {
  TransactionPayController,
  TransactionPayControllerMessenger,
  TransactionPayControllerOptions,
} from '@metamask/transaction-pay-controller';
import { TransactionPayControllerInit } from './transaction-pay-controller-init';
import { TransactionPayControllerInitMessenger } from '../../messengers/transaction-pay-controller-messenger';

jest.mock('@metamask/transaction-pay-controller');

function buildInitRequestMock(
  initRequestProperties: Record<string, unknown> = {},
): jest.Mocked<
  ControllerInitRequest<
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
    ...buildControllerInitRequestMock(baseControllerMessenger),
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
});
