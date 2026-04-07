import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { MessengerClientInitRequest } from '../../types';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import {
  TransactionPayController,
  TransactionPayControllerMessenger,
  TransactionPayControllerOptions,
  TransactionPayStrategy,
} from '@metamask/transaction-pay-controller';
import { TransactionPayControllerInit } from './transaction-pay-controller-init';
import { TransactionPayControllerInitMessenger } from '../../messengers/transaction-pay-controller-messenger';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import Logger from '../../../../util/Logger';
import { getDelegationTransaction } from '../../../../util/transactions/delegation';

jest.mock('@metamask/transaction-pay-controller');
jest.mock('../../../../util/transactions/delegation', () => ({
  getDelegationTransaction: jest.fn(),
}));

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
  const mockGetDelegationTransaction = jest.mocked(getDelegationTransaction);

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

  it('passes getDelegationTransaction through to the controller callback', () => {
    const requestMock = buildInitRequestMock();
    const transactionMeta = {
      id: 'tx-1',
    } as TransactionMeta;
    const delegationTransaction = {
      data: '0x1234',
      to: '0xabc',
      value: '0x0',
    };

    mockGetDelegationTransaction.mockReturnValue(
      delegationTransaction as never,
    );

    TransactionPayControllerInit(requestMock);

    const getDelegationTransactionOption = transactionPayControllerClassMock
      .mock.calls[0][0].getDelegationTransaction as NonNullable<
      TransactionPayControllerOptions['getDelegationTransaction']
    >;

    expect(
      getDelegationTransactionOption({ transaction: transactionMeta }),
    ).toBe(delegationTransaction);
    expect(mockGetDelegationTransaction).toHaveBeenCalledWith(
      requestMock.initMessenger,
      transactionMeta,
    );
  });

  it('passes getStrategies and does not pass getStrategy', () => {
    const controllerMessenger = {
      call: jest.fn().mockReturnValue({
        localOverrides: {},
        remoteFeatureFlags: {
          confirmations_pay: {
            payStrategies: {
              across: { enabled: true },
              relay: { enabled: true },
            },
            routingOverrides: {
              overrides: {
                perpsDeposit: {
                  chains: {
                    '0xa4b1': ['across'],
                  },
                  default: ['relay'],
                },
              },
            },
            strategyOrder: ['relay'],
          },
        },
      }),
    } as unknown as TransactionPayControllerMessenger;

    const getStrategies = testConstructorOption('getStrategies', undefined, {
      controllerMessenger,
    }) as NonNullable<TransactionPayControllerOptions['getStrategies']>;

    expect(getStrategies).toBeDefined();
    expect(
      transactionPayControllerClassMock.mock.calls[0][0].getStrategy,
    ).toBeUndefined();

    expect(
      getStrategies({
        chainId: '0xa4b1',
        txParams: { to: '0xabc' },
        type: TransactionType.perpsDeposit,
      } as unknown as TransactionMeta),
    ).toEqual([TransactionPayStrategy.Across]);
  });

  it('applies local overrides when resolving strategies', () => {
    const controllerMessenger = {
      call: jest.fn().mockReturnValue({
        localOverrides: {
          confirmations_pay: {
            payStrategies: {
              across: { enabled: true },
              relay: { enabled: true },
            },
            routingOverrides: {
              overrides: {
                perpsDeposit: {
                  chains: {
                    '0xa4b1': ['across'],
                  },
                },
              },
            },
            strategyOrder: ['across'],
          },
        },
        remoteFeatureFlags: {
          confirmations_pay: {
            payStrategies: {
              across: { enabled: false },
              relay: { enabled: true },
            },
            routingOverrides: {
              overrides: {
                perpsDeposit: {
                  chains: {
                    '0xa4b1': ['relay'],
                  },
                },
              },
            },
            strategyOrder: ['relay'],
          },
        },
      }),
    } as unknown as TransactionPayControllerMessenger;

    const getStrategies = testConstructorOption('getStrategies', undefined, {
      controllerMessenger,
    }) as NonNullable<TransactionPayControllerOptions['getStrategies']>;

    expect(
      getStrategies({
        chainId: '0xa4b1',
        txParams: { to: '0xabc' },
        type: TransactionType.perpsDeposit,
      } as unknown as TransactionMeta),
    ).toEqual([TransactionPayStrategy.Across]);
  });

  it('logs and rethrows when controller initialization fails', () => {
    const requestMock = buildInitRequestMock();
    const loggerErrorSpy = jest.spyOn(Logger, 'error').mockImplementation();

    transactionPayControllerClassMock.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    expect(() => TransactionPayControllerInit(requestMock)).toThrow('boom');
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to initialize TransactionPayController',
    );
  });

  it('falls back to default routing when feature flag state is unavailable', () => {
    const controllerMessenger = {
      call: jest.fn().mockReturnValue(undefined),
    } as unknown as TransactionPayControllerMessenger;

    const getStrategies = testConstructorOption('getStrategies', undefined, {
      controllerMessenger,
    }) as NonNullable<TransactionPayControllerOptions['getStrategies']>;

    expect(
      getStrategies({
        chainId: '0xa4b1',
        txParams: { to: '0xabc' },
        type: TransactionType.perpsDeposit,
      } as unknown as TransactionMeta),
    ).toEqual([TransactionPayStrategy.Relay]);
  });
});
