import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { getMetaMaskPayProperties } from './metamask-pay';
import { TransactionMetrics, TransactionMetricsBuilder } from '../types';
import { RootState } from '../../../../../reducers';
import { TransactionPayStrategy } from '@metamask/transaction-pay-controller';
import { merge } from 'lodash';
import { NATIVE_TOKEN_ADDRESS } from '../../../../../components/Views/confirmations/constants/tokens';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';

const PAY_CONTROLLER_STATE_MOCK = {
  engine: {
    backgroundState: {
      TransactionPayController: {
        transactionData: {
          'parent-1': {
            quotes: [
              { dust: { usd: '0', fiat: '0' } },
              {
                dust: { usd: '0', fiat: '0' },
                original: {
                  metrics: { attempts: 3, buffer: 0.123, latency: 1234 },
                  quote: { bridgeId: 'testBridge' },
                },
                request: {
                  targetTokenAddress: '0x123',
                },
                strategy: TransactionPayStrategy.Bridge,
              },
            ],
          },
        },
      },
    },
  },
} as unknown as RootState;

describe('Metamask Pay Metrics', () => {
  const getStateMock: jest.MockedFn<
    Parameters<TransactionMetricsBuilder>[0]['getState']
  > = jest.fn();

  let request: Parameters<TransactionMetricsBuilder>[0];

  beforeEach(() => {
    jest.resetAllMocks();

    request = {
      eventType: TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
      transactionMeta: {
        id: 'child-1',
        txParams: { nonce: '0x1' },
      } as TransactionMeta,
      allTransactions: [],
      getUIMetrics: jest.fn(),
      getState: getStateMock,
      initMessenger: {} as never,
      smartTransactionsController: {} as never,
    };
  });

  it('returns nothing if perps_deposit', () => {
    request.transactionMeta.type = TransactionType.perpsDeposit;

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: {},
      sensitiveProperties: {},
    });
  });

  it('returns nothing if predict_withdraw', () => {
    request.transactionMeta.type = TransactionType.predictWithdraw;

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: {},
      sensitiveProperties: {},
    });
  });

  it('derives parent mm_pay_* properties for child transaction from controller state', () => {
    getStateMock.mockReturnValue({
      engine: {
        backgroundState: {
          TokensController: { allTokens: {} },
          TransactionPayController: {
            transactionData: {
              'parent-1': {
                paymentToken: { symbol: 'USDC', chainId: '0x1' },
                quotes: [{ strategy: TransactionPayStrategy.Relay }],
                tokens: [{ skipIfBalance: false, amountUsd: '100' }],
                totals: {
                  targetAmount: { usd: '99', fiat: '99' },
                  fees: {
                    metaMask: { usd: '0.5', fiat: '0.5' },
                    provider: { usd: '0.3', fiat: '0.3' },
                    sourceNetwork: { estimate: { usd: '0.1', fiat: '0.1' } },
                    targetNetwork: { usd: '0.05', fiat: '0.05' },
                  },
                },
              },
            },
          },
        },
      },
    } as never);

    request.allTransactions = [
      {
        id: 'parent-1',
        type: TransactionType.perpsDeposit,
        metamaskPay: { chainId: '0x1', tokenAddress: '0xA0b8' },
        requiredTransactionIds: ['child-1'],
      } as unknown as TransactionMeta,
    ];

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay: true,
        mm_pay_use_case: 'perps_deposit',
        mm_pay_token_selected: 'USDC',
        mm_pay_chain_selected: '0x1',
        mm_pay_sending_value_usd: 100,
        mm_pay_receiving_value_usd: 99,
        mm_pay_metamask_fee_usd: 0.5,
        mm_pay_strategy: 'relay',
        mm_pay_transaction_step: 1,
        mm_pay_transaction_step_total: 2,
      }),
      sensitiveProperties: {},
    });
  });

  it('derives parent mm_pay_* properties for predictWithdraw child transaction', () => {
    getStateMock.mockReturnValue({
      engine: {
        backgroundState: {
          TokensController: { allTokens: {} },
          TransactionPayController: {
            transactionData: {
              'parent-1': {
                paymentToken: { symbol: 'BNB', chainId: '0x38' },
                quotes: [{ strategy: TransactionPayStrategy.Relay }],
                tokens: [{ skipIfBalance: false, amountUsd: '1500.50' }],
                totals: {
                  targetAmount: { usd: '1495.25', fiat: '1495.25' },
                  fees: {
                    metaMask: { usd: '0.00435', fiat: '0.00435' },
                    provider: { usd: '0', fiat: '0' },
                    sourceNetwork: { estimate: { usd: '0', fiat: '0' } },
                    targetNetwork: { usd: '0', fiat: '0' },
                  },
                },
              },
            },
          },
        },
      },
    } as never);

    request.allTransactions = [
      {
        id: 'parent-1',
        type: TransactionType.predictWithdraw,
        metamaskPay: { chainId: '0x38', tokenAddress: '0x000' },
        requiredTransactionIds: ['child-1'],
      } as unknown as TransactionMeta,
    ];

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay: true,
        mm_pay_use_case: 'predict_withdraw',
        mm_pay_sending_value_usd: 1500.5,
        mm_pay_receiving_value_usd: 1495.25,
        mm_pay_metamask_fee_usd: 0.00435,
      }),
      sensitiveProperties: {},
    });
  });

  it('adds step property if bridge', () => {
    request.allTransactions = [
      {
        id: 'parent-1',
        type: TransactionType.perpsDeposit,
        requiredTransactionIds: ['child-0', 'child-1'],
      } as TransactionMeta,
    ];

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay_transaction_step: 2,
      }),
      sensitiveProperties: {},
    });
  });

  it('adds step property if swap', () => {
    request.allTransactions = [
      {
        id: 'parent-1',
        type: TransactionType.perpsDeposit,
        requiredTransactionIds: ['child-0', 'child-1'],
      } as TransactionMeta,
    ];

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay_transaction_step: 2,
      }),
      sensitiveProperties: {},
    });
  });

  it('adds quote properties if bridge', () => {
    request.transactionMeta.type = TransactionType.bridge;

    request.allTransactions = [
      {
        id: 'child-0',
        type: TransactionType.bridge,
      } as TransactionMeta,
      {
        id: 'parent-1',
        type: TransactionType.perpsDeposit,
        requiredTransactionIds: ['child-0', 'child-1'],
      } as TransactionMeta,
      request.transactionMeta,
    ];

    getStateMock.mockReturnValue(PAY_CONTROLLER_STATE_MOCK);

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay_bridge_provider: 'testBridge',
        mm_pay_quotes_attempts: 3,
        mm_pay_quotes_buffer_size: 0.123,
        mm_pay_quotes_latency: 1234,
      }),
      sensitiveProperties: {},
    });
  });

  it('adds quote properties if swap', () => {
    request.transactionMeta.type = TransactionType.swap;

    request.allTransactions = [
      {
        id: 'child-0',
        type: TransactionType.swap,
      } as TransactionMeta,
      {
        id: 'parent-1',
        type: TransactionType.perpsDeposit,
        requiredTransactionIds: ['child-0', 'child-1'],
      } as TransactionMeta,
      request.transactionMeta,
    ];

    getStateMock.mockReturnValue(PAY_CONTROLLER_STATE_MOCK);

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay_bridge_provider: 'testBridge',
        mm_pay_quotes_attempts: 3,
        mm_pay_quotes_buffer_size: 0.123,
        mm_pay_quotes_latency: 1234,
      }),
      sensitiveProperties: {},
    });
  });

  it('adds dust property from quote', () => {
    request.transactionMeta.type = TransactionType.bridge;

    request.allTransactions = [
      {
        id: 'child-0',
        type: TransactionType.bridge,
      } as TransactionMeta,
      {
        id: 'parent-1',
        type: TransactionType.perpsDeposit,
        requiredTransactionIds: ['child-0', 'child-1'],
      } as TransactionMeta,
      request.transactionMeta,
    ];

    getStateMock.mockReturnValue(
      merge({}, PAY_CONTROLLER_STATE_MOCK, {
        engine: {
          backgroundState: {
            TransactionPayController: {
              transactionData: {
                'parent-1': {
                  quotes: [
                    {},
                    {
                      dust: { usd: '1.23', fiat: '1.23' },
                      request: { targetTokenAddress: '0x123' },
                      strategy: TransactionPayStrategy.Bridge,
                    },
                  ],
                },
              },
            },
          },
        },
      }) as unknown as RootState,
    );

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay_dust_usd: '1.23',
      }),
      sensitiveProperties: {},
    });
  });

  it('does not add dust property if native bridge', () => {
    request.transactionMeta.type = TransactionType.bridge;

    request.allTransactions = [
      {
        id: 'child-0',
        type: TransactionType.bridge,
      } as TransactionMeta,
      {
        id: 'parent-1',
        type: TransactionType.perpsDeposit,
        requiredTransactionIds: ['child-0', 'child-1'],
      } as TransactionMeta,
      request.transactionMeta,
    ];

    getStateMock.mockReturnValue(
      merge({}, PAY_CONTROLLER_STATE_MOCK, {
        engine: {
          backgroundState: {
            TransactionPayController: {
              transactionData: {
                'parent-1': {
                  quotes: [
                    {},
                    {
                      request: {
                        targetTokenAddress: NATIVE_TOKEN_ADDRESS,
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      }) as unknown as RootState,
    );

    const result = getMetaMaskPayProperties(request) as TransactionMetrics;

    expect(result.properties.mm_pay_dust_usd).toBeUndefined();
  });

  it('sets polymarket_account_created as true if predict deposit and matching nested transaction', () => {
    request.transactionMeta.nestedTransactions = [
      { type: TransactionType.predictDeposit },
      { data: '0xa1884d2c1234' },
    ];

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: {
        polymarket_account_created: true,
      },
      sensitiveProperties: {},
    });
  });

  it('sets polymarket_account_created as false if predict deposit with no matching nested transaction', () => {
    request.transactionMeta.nestedTransactions = [
      { type: TransactionType.predictDeposit },
      { data: '0xa1884d2d' },
    ];

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: {
        polymarket_account_created: false,
      },
      sensitiveProperties: {},
    });
  });

  it('derives base properties from metamaskPay metadata', () => {
    request.transactionMeta.metamaskPay = {
      chainId: '0x3',
      tokenAddress: '0x123',
    };

    getStateMock.mockReturnValue({
      engine: {
        backgroundState: {
          TokensController: {
            allTokens: {
              '0x3': {
                '0x123': [
                  {
                    address: '0x123',
                    symbol: 'USDC',
                    decimals: 18,
                  },
                ],
              },
            },
          },
        },
      },
    } as never);

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay: true,
        mm_pay_chain_selected: '0x3',
        mm_pay_token_selected: 'USDC',
      }),
      sensitiveProperties: {},
    });
  });

  it('prefers paymentToken.symbol over token selector lookup', () => {
    request.transactionMeta.metamaskPay = {
      chainId: '0x38',
      tokenAddress: '0x0000000000000000000000000000000000000000',
    };

    getStateMock.mockReturnValue({
      engine: {
        backgroundState: {
          TokensController: { allTokens: {} },
          TransactionPayController: {
            transactionData: {
              'child-1': {
                paymentToken: { symbol: 'BNB', chainId: '0x38' },
                tokens: [],
              },
            },
          },
        },
      },
    } as never);

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay: true,
        mm_pay_chain_selected: '0x38',
        mm_pay_token_selected: 'BNB',
      }),
      sensitiveProperties: {},
    });
  });

  it('falls back to token selector when paymentToken is unavailable', () => {
    request.transactionMeta.metamaskPay = {
      chainId: '0x3',
      tokenAddress: '0x123',
    };

    getStateMock.mockReturnValue({
      engine: {
        backgroundState: {
          TokensController: {
            allTokens: {
              '0x3': {
                '0x123': [
                  {
                    address: '0x123',
                    symbol: 'USDC',
                    decimals: 18,
                  },
                ],
              },
            },
          },
        },
      },
    } as never);

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay_token_selected: 'USDC',
      }),
      sensitiveProperties: {},
    });
  });

  it('does not include token symbol if neither source has it', () => {
    request.transactionMeta.metamaskPay = {
      chainId: '0x3',
      tokenAddress: '0x123',
    };

    getStateMock.mockReturnValue({
      engine: {
        backgroundState: {
          TokensController: {
            allTokens: {},
          },
        },
      },
    } as never);

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay: true,
        mm_pay_chain_selected: '0x3',
        mm_pay_token_selected: undefined,
      }),
      sensitiveProperties: {},
    });
  });

  it('derives mm_pay_use_case from transaction type', () => {
    request.transactionMeta.type = TransactionType.predictWithdraw;
    request.transactionMeta.metamaskPay = {
      chainId: '0x89',
      tokenAddress: '0x123',
    };

    getStateMock.mockReturnValue({
      engine: {
        backgroundState: {
          TokensController: { allTokens: {} },
        },
      },
    } as never);

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay_use_case: 'predict_withdraw',
      }),
      sensitiveProperties: {},
    });
  });

  it('derives fee and value properties from TransactionPayController state', () => {
    request.transactionMeta.type = TransactionType.predictWithdraw;
    request.transactionMeta.metamaskPay = {
      chainId: '0x38',
      tokenAddress: '0x0000000000000000000000000000000000000000',
    };

    getStateMock.mockReturnValue({
      engine: {
        backgroundState: {
          TokensController: { allTokens: {} },
          TransactionPayController: {
            transactionData: {
              'child-1': {
                paymentToken: { symbol: 'BNB', chainId: '0x38' },
                quotes: [{ strategy: TransactionPayStrategy.Relay }],
                tokens: [
                  { skipIfBalance: false, amountUsd: '0.30' },
                  { skipIfBalance: true, amountUsd: '0.10' },
                ],
                totals: {
                  targetAmount: { usd: '0.26', fiat: '0.26' },
                  fees: {
                    metaMask: { usd: '0.003', fiat: '0.003' },
                    provider: { usd: '0.04', fiat: '0.04' },
                    sourceNetwork: {
                      estimate: { usd: '0.005', fiat: '0.005' },
                    },
                    targetNetwork: { usd: '0.001', fiat: '0.001' },
                  },
                },
              },
            },
          },
        },
      },
    } as never);

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: expect.objectContaining({
        mm_pay: true,
        mm_pay_chain_selected: '0x38',
        mm_pay_token_selected: 'BNB',
        mm_pay_use_case: 'predict_withdraw',
        mm_pay_sending_value_usd: 0.3,
        mm_pay_receiving_value_usd: 0.26,
        mm_pay_metamask_fee_usd: 0.003,
        mm_pay_provider_fee_usd: '0.04',
        mm_pay_network_fee_usd: '0.006',
        mm_pay_strategy: 'relay',
        mm_pay_transaction_step_total: 2,
        mm_pay_transaction_step: 2,
      }),
      sensitiveProperties: {},
    });
  });

  describe('mm_pay_time_to_complete_s', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('adds mm_pay_time_to_complete_s for finalized parent MM Pay transaction using latest child submittedTime via requiredTransactionIds', () => {
      jest.spyOn(Date, 'now').mockReturnValue(1060500);

      request.transactionMeta.type = TransactionType.perpsDeposit;
      request.transactionMeta.requiredTransactionIds = ['child-a', 'child-b'];

      request.allTransactions = [
        {
          id: 'child-a',
          submittedTime: 900000,
          txParams: {},
        } as TransactionMeta,
        {
          id: 'child-b',
          submittedTime: 1000000,
          txParams: {},
        } as TransactionMeta,
      ];

      const result = getMetaMaskPayProperties(request) as TransactionMetrics;

      expect(result.properties).toStrictEqual(
        expect.objectContaining({
          mm_pay_time_to_complete_s: 60.5,
        }),
      );
    });

    it('does not add mm_pay_time_to_complete_s for finalized child transaction with parent', () => {
      jest.spyOn(Date, 'now').mockReturnValue(2045123);

      request.allTransactions = [
        {
          id: 'parent-1',
          type: TransactionType.perpsDeposit,
          requiredTransactionIds: ['child-1'],
          submittedTime: 2000000,
        } as TransactionMeta,
      ];

      const result = getMetaMaskPayProperties(request) as TransactionMetrics;

      expect(result.properties).not.toHaveProperty('mm_pay_time_to_complete_s');
    });

    it('does not add mm_pay_time_to_complete_s for non-finalized events', () => {
      request.eventType = TRANSACTION_EVENTS.TRANSACTION_SUBMITTED;
      request.transactionMeta.type = TransactionType.perpsDeposit;
      request.transactionMeta.submittedTime = 1000000;

      const result = getMetaMaskPayProperties(request) as TransactionMetrics;

      expect(result.properties).not.toHaveProperty('mm_pay_time_to_complete_s');
    });

    it('falls back to parent submittedTime when no children have submittedTime', () => {
      jest.spyOn(Date, 'now').mockReturnValue(1060500);

      request.transactionMeta.type = TransactionType.perpsWithdraw;
      request.transactionMeta.submittedTime = 1000000;
      request.transactionMeta.requiredTransactionIds = [];

      const result = getMetaMaskPayProperties(request) as TransactionMetrics;

      expect(result.properties).toStrictEqual(
        expect.objectContaining({
          mm_pay_time_to_complete_s: 60.5,
        }),
      );
    });

    it('does not add mm_pay_time_to_complete_s when submittedTime is undefined', () => {
      request.transactionMeta.type = TransactionType.perpsDeposit;

      const result = getMetaMaskPayProperties(request) as TransactionMetrics;

      expect(result.properties).not.toHaveProperty('mm_pay_time_to_complete_s');
    });

    it('does not add mm_pay_time_to_complete_s for non-MM-Pay transactions', () => {
      jest.spyOn(Date, 'now').mockReturnValue(1060000);

      request.transactionMeta.type = TransactionType.contractInteraction;
      request.transactionMeta.submittedTime = 1000000;

      const result = getMetaMaskPayProperties(request) as TransactionMetrics;

      expect(result.properties).not.toHaveProperty('mm_pay_time_to_complete_s');
    });
  });
});
