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
                request: {
                  targetTokenAddress: '0x123',
                },
                strategy: TransactionPayStrategy.Relay,
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

  it('derives baseline properties if perps_deposit without metamaskPay', () => {
    request.transactionMeta.type = TransactionType.perpsDeposit;

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: {
        mm_pay: true,
        mm_pay_payment_method_selected: 'crypto',
        mm_pay_use_case: 'perps_deposit',
      },
      sensitiveProperties: {},
    });
  });

  it('derives baseline properties if predict_withdraw without metamaskPay', () => {
    request.transactionMeta.type = TransactionType.predictWithdraw;

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: {
        mm_pay: true,
        mm_pay_payment_method_selected: 'crypto',
        mm_pay_use_case: 'predict_withdraw',
      },
      sensitiveProperties: {},
    });
  });

  it.each([
    [TransactionType.moneyAccountDeposit, 'money_account_deposit'],
    [TransactionType.moneyAccountWithdraw, 'money_account_withdraw'],
  ])(
    'derives baseline properties if %s without metamaskPay',
    (type, expectedUseCase) => {
      request.transactionMeta.type = type;

      const result = getMetaMaskPayProperties(request);

      expect(result).toStrictEqual({
        properties: {
          mm_pay: true,
          mm_pay_payment_method_selected: 'crypto',
          mm_pay_use_case: expectedUseCase,
        },
        sensitiveProperties: {},
      });
    },
  );

  it('includes chain_selected in baseline when metamaskPay has chainId but no tokenAddress', () => {
    request.transactionMeta.type = TransactionType.moneyAccountDeposit;
    request.transactionMeta.metamaskPay = { chainId: '0x1' } as never;

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: {
        mm_pay: true,
        mm_pay_chain_selected: '0x1',
        mm_pay_payment_method_selected: 'crypto',
        mm_pay_use_case: 'money_account_deposit',
      },
      sensitiveProperties: {},
    });
  });

  it('includes token_selected in baseline when controller state has paymentToken', () => {
    request.transactionMeta.type = TransactionType.moneyAccountDeposit;

    getStateMock.mockReturnValue({
      engine: {
        backgroundState: {
          TransactionPayController: {
            transactionData: {
              'child-1': {
                paymentToken: { symbol: 'USDC', chainId: '0x1' },
              },
            },
          },
        },
      },
    } as never);

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: {
        mm_pay: true,
        mm_pay_payment_method_selected: 'crypto',
        mm_pay_token_selected: 'USDC',
        mm_pay_use_case: 'money_account_deposit',
        mm_pay_transaction_step_total: 1,
        mm_pay_transaction_step: 1,
      },
      sensitiveProperties: {},
    });
  });

  it('derives fiat payment method in baseline from controller state', () => {
    request.transactionMeta.type = TransactionType.moneyAccountDeposit;

    getStateMock.mockReturnValue({
      engine: {
        backgroundState: {
          TransactionPayController: {
            transactionData: {
              'child-1': {
                fiatPayment: {
                  selectedPaymentMethodId: '/payments/debit-credit-card',
                },
              },
            },
          },
        },
      },
    } as never);

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: {
        mm_pay: true,
        mm_pay_payment_method_selected: 'debit_credit_card',
        mm_pay_use_case: 'money_account_deposit',
        mm_pay_transaction_step_total: 1,
        mm_pay_transaction_step: 1,
      },
      sensitiveProperties: {},
    });
  });

  it('does not derive baseline for non-PAY_TYPE without metamaskPay', () => {
    request.transactionMeta.type = TransactionType.simpleSend;

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: {},
      sensitiveProperties: {},
    });
  });

  it('does not derive baseline for non-PAY_TYPE with only chainId in metamaskPay', () => {
    request.transactionMeta.type = TransactionType.simpleSend;
    request.transactionMeta.metamaskPay = { chainId: '0x1' } as never;

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: {},
      sensitiveProperties: {},
    });
  });

  it('does not derive baseline for non-PAY_TYPE with only tokenAddress in metamaskPay', () => {
    request.transactionMeta.type = TransactionType.simpleSend;
    request.transactionMeta.metamaskPay = { tokenAddress: '0x123' } as never;

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: {},
      sensitiveProperties: {},
    });
  });

  it.each([
    [TransactionType.moneyAccountDeposit, 'money_account_deposit'],
    [TransactionType.moneyAccountWithdraw, 'money_account_withdraw'],
  ])(
    'derives mm_pay_use_case=%s for %s parent',
    (parentType, expectedUseCase) => {
      getStateMock.mockReturnValue({
        engine: {
          backgroundState: {
            TokensController: { allTokens: {} },
            TransactionPayController: {
              transactionData: {
                'parent-1': {
                  paymentToken: { symbol: 'USDC', chainId: '0x1' },
                  quotes: [{ strategy: TransactionPayStrategy.Relay }],
                  tokens: [{ skipIfBalance: false, amountUsd: '50' }],
                  totals: {
                    targetAmount: { usd: '49.5', fiat: '49.5' },
                    fees: {
                      metaMask: { usd: '0', fiat: '0' },
                      provider: { usd: '0.2', fiat: '0.2' },
                      sourceNetwork: { estimate: { usd: '0.1', fiat: '0.1' } },
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
          type: parentType,
          metamaskPay: { chainId: '0x1', tokenAddress: '0xA0b8' },
          requiredTransactionIds: ['child-1'],
        } as unknown as TransactionMeta,
      ];

      const result = getMetaMaskPayProperties(request);

      expect(result).toStrictEqual({
        properties: expect.objectContaining({
          mm_pay: true,
          mm_pay_use_case: expectedUseCase,
          mm_pay_token_selected: 'USDC',
          mm_pay_chain_selected: '0x1',
        }),
        sensitiveProperties: {},
      });
    },
  );

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
                      strategy: TransactionPayStrategy.Relay,
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
        mm_pay: true,
        mm_pay_payment_method_selected: 'crypto',
        mm_pay_use_case: 'predict_deposit',
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
        mm_pay: true,
        mm_pay_payment_method_selected: 'crypto',
        mm_pay_use_case: 'predict_deposit',
        polymarket_account_created: false,
      },
      sensitiveProperties: {},
    });
  });

  it('sets polymarket_account_created as true for PWAT deposit-and-order with matching nested transaction', () => {
    request.transactionMeta.nestedTransactions = [
      { type: TransactionType.predictDepositAndOrder },
      { data: '0xa1884d2c1234' },
    ];

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: {
        mm_pay: true,
        mm_pay_payment_method_selected: 'crypto',
        mm_pay_use_case: 'predict_deposit_and_order',
        polymarket_account_created: true,
      },
      sensitiveProperties: {},
    });
  });

  it('sets polymarket_account_created as false for PWAT deposit-and-order with no matching nested transaction', () => {
    request.transactionMeta.nestedTransactions = [
      { type: TransactionType.predictDepositAndOrder },
      { data: '0xa1884d2d' },
    ];

    const result = getMetaMaskPayProperties(request);

    expect(result).toStrictEqual({
      properties: {
        mm_pay: true,
        mm_pay_payment_method_selected: 'crypto',
        mm_pay_use_case: 'predict_deposit_and_order',
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

    const result = getMetaMaskPayProperties(request) as TransactionMetrics;

    expect(result.properties).toEqual(
      expect.objectContaining({
        mm_pay: true,
        mm_pay_chain_selected: '0x3',
      }),
    );
    expect(result.properties).not.toHaveProperty('mm_pay_token_selected');
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

  it('derives mm_pay and mm_pay_use_case for PWAT batch with nested predictDepositAndOrder', () => {
    request.transactionMeta.type = TransactionType.batch;
    request.transactionMeta.nestedTransactions = [
      { type: TransactionType.predictDepositAndOrder },
    ];
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
        mm_pay: true,
        mm_pay_use_case: 'predict_deposit_and_order',
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

  it('ignores no-op quotes and sets mm_pay_quote_skipped', () => {
    request.transactionMeta.type = TransactionType.predictWithdraw;
    request.transactionMeta.metamaskPay = {
      chainId: '0x89',
      tokenAddress: '0x0000000000000000000000000000000000000000',
    };

    getStateMock.mockReturnValue({
      engine: {
        backgroundState: {
          TokensController: { allTokens: {} },
          TransactionPayController: {
            transactionData: {
              'child-1': {
                paymentToken: { symbol: 'USDC', chainId: '0x89' },
                quotes: [{ strategy: TransactionPayStrategy.None }],
                tokens: [{ skipIfBalance: false, amountUsd: '5' }],
              },
            },
          },
        },
      },
    } as never);

    const result = getMetaMaskPayProperties(request) as TransactionMetrics;

    expect(result.properties).toStrictEqual(
      expect.objectContaining({
        mm_pay: true,
        mm_pay_quote_skipped: true,
        mm_pay_transaction_step_total: 1,
        mm_pay_transaction_step: 1,
      }),
    );
    expect(result.properties.mm_pay_strategy).toBeUndefined();
  });

  it('sets mm_pay_quote_skipped as false when only executable quotes are present', () => {
    request.transactionMeta.type = TransactionType.predictWithdraw;
    request.transactionMeta.metamaskPay = {
      chainId: '0x89',
      tokenAddress: '0x0000000000000000000000000000000000000000',
    };

    getStateMock.mockReturnValue({
      engine: {
        backgroundState: {
          TokensController: { allTokens: {} },
          TransactionPayController: {
            transactionData: {
              'child-1': {
                paymentToken: { symbol: 'USDC', chainId: '0x89' },
                quotes: [{ strategy: TransactionPayStrategy.Relay }],
                tokens: [{ skipIfBalance: false, amountUsd: '5' }],
              },
            },
          },
        },
      },
    } as never);

    const result = getMetaMaskPayProperties(request) as TransactionMetrics;

    expect(result.properties).toStrictEqual(
      expect.objectContaining({
        mm_pay_quote_skipped: false,
        mm_pay_strategy: 'relay',
        mm_pay_transaction_step_total: 2,
        mm_pay_transaction_step: 2,
      }),
    );
  });

  describe('mm_pay_payment_method_selected', () => {
    it('defaults to crypto when no fiat method is selected', () => {
      request.transactionMeta.type = TransactionType.perpsDeposit;
      request.transactionMeta.metamaskPay = {
        chainId: '0x1',
        tokenAddress: '0xA0b8',
      };

      getStateMock.mockReturnValue({
        engine: {
          backgroundState: {
            TokensController: { allTokens: {} },
            TransactionPayController: {
              transactionData: {
                'child-1': {
                  paymentToken: { symbol: 'ETH', chainId: '0x1' },
                  quotes: [{ strategy: TransactionPayStrategy.Relay }],
                  tokens: [],
                  totals: {
                    targetAmount: { usd: '0', fiat: '0' },
                    fees: {
                      metaMask: { usd: '0', fiat: '0' },
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

      const result = getMetaMaskPayProperties(request);

      expect(result).toStrictEqual({
        properties: expect.objectContaining({
          mm_pay_payment_method_selected: 'crypto',
        }),
        sensitiveProperties: {},
      });
    });

    it('is set to normalized fiat type when a fiat method is selected', () => {
      request.transactionMeta.type = TransactionType.perpsDeposit;
      request.transactionMeta.metamaskPay = {
        chainId: '0x1',
        tokenAddress: '0xA0b8',
      };

      getStateMock.mockReturnValue({
        engine: {
          backgroundState: {
            TokensController: { allTokens: {} },
            TransactionPayController: {
              transactionData: {
                'child-1': {
                  paymentToken: { symbol: 'ETH', chainId: '0x1' },
                  quotes: [{ strategy: TransactionPayStrategy.Fiat }],
                  tokens: [],
                  totals: {
                    targetAmount: { usd: '0', fiat: '0' },
                    fees: {
                      metaMask: { usd: '0', fiat: '0' },
                      provider: { usd: '0', fiat: '0' },
                      sourceNetwork: { estimate: { usd: '0', fiat: '0' } },
                      targetNetwork: { usd: '0', fiat: '0' },
                    },
                  },
                  fiatPayment: {
                    selectedPaymentMethodId: '/payments/debit-credit-card',
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
          mm_pay_payment_method_selected: 'debit_credit_card',
          mm_pay_strategy: 'fiat',
        }),
        sensitiveProperties: {},
      });
    });

    it.each([
      ['/payments/debit-credit-card', 'debit_credit_card'],
      ['/payments/bank-transfer', 'bank_transfer'],
      ['/payments/sepa-bank-transfer', 'bank_transfer'],
      ['/payments/instant-bank-transfer', 'bank_transfer'],
      ['/payments/apple-pay', 'apple_pay'],
      ['/payments/google-pay', 'google_pay'],
      ['/payments/revolut-pay', 'rev_pay'],
      ['/payments/rev-pay', 'rev_pay'],
      ['debit-credit-card', 'debit_credit_card'],
    ])('normalizes %s to %s', (paymentMethodId, expected) => {
      request.transactionMeta.type = TransactionType.moneyAccountDeposit;
      request.transactionMeta.metamaskPay = {
        chainId: '0x1',
        tokenAddress: '0xA0b8',
      };

      getStateMock.mockReturnValue({
        engine: {
          backgroundState: {
            TokensController: { allTokens: {} },
            TransactionPayController: {
              transactionData: {
                'child-1': {
                  paymentToken: { symbol: 'ETH', chainId: '0x1' },
                  quotes: [],
                  tokens: [],
                  totals: {
                    targetAmount: { usd: '0', fiat: '0' },
                    fees: {
                      metaMask: { usd: '0', fiat: '0' },
                      provider: { usd: '0', fiat: '0' },
                      sourceNetwork: { estimate: { usd: '0', fiat: '0' } },
                      targetNetwork: { usd: '0', fiat: '0' },
                    },
                  },
                  fiatPayment: { selectedPaymentMethodId: paymentMethodId },
                },
              },
            },
          },
        },
      } as never);

      const result = getMetaMaskPayProperties(request);

      expect(result).toStrictEqual({
        properties: expect.objectContaining({
          mm_pay_payment_method_selected: expected,
        }),
        sensitiveProperties: {},
      });
    });
  });

  describe('mm_pay_fiat_provider / mm_pay_fiat_token_target / mm_pay_fiat_chain_target', () => {
    const FIAT_TXDATA = {
      paymentToken: { symbol: 'ETH', chainId: '0x1' },
      quotes: [],
      tokens: [],
      totals: {
        targetAmount: { usd: '0', fiat: '0' },
        fees: {
          metaMask: { usd: '0', fiat: '0' },
          provider: { usd: '0', fiat: '0' },
          sourceNetwork: { estimate: { usd: '0', fiat: '0' } },
          targetNetwork: { usd: '0', fiat: '0' },
        },
      },
      fiatPayment: {
        selectedPaymentMethodId: '/payments/debit-credit-card',
        rampsQuote: {
          provider: '/providers/transak-native',
          quote: {
            amountIn: 100,
            amountOut: 95,
            paymentMethod: '/payments/debit-credit-card',
            cryptoTranslation: {
              symbol: 'USDC',
              chainId: '0x1',
            },
          },
        },
        caipAssetId:
          'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      },
    };

    beforeEach(() => {
      request.transactionMeta.type = TransactionType.moneyAccountDeposit;
      request.transactionMeta.metamaskPay = {
        chainId: '0x1',
        tokenAddress: '0xA0b8',
      };

      getStateMock.mockReturnValue({
        engine: {
          backgroundState: {
            TokensController: { allTokens: {} },
            TransactionPayController: {
              transactionData: { 'child-1': FIAT_TXDATA },
            },
          },
        },
      } as never);
    });

    it('extracts mm_pay_fiat_provider from rampsQuote.provider path', () => {
      const result = getMetaMaskPayProperties(request);

      expect(result).toStrictEqual({
        properties: expect.objectContaining({
          mm_pay_fiat_provider: 'transak-native',
        }),
        sensitiveProperties: {},
      });
    });

    it('extracts mm_pay_fiat_provider from bare provider code', () => {
      getStateMock.mockReturnValue({
        engine: {
          backgroundState: {
            TokensController: { allTokens: {} },
            TransactionPayController: {
              transactionData: {
                'child-1': merge({}, FIAT_TXDATA, {
                  fiatPayment: {
                    rampsQuote: { provider: 'moonpay' },
                  },
                }),
              },
            },
          },
        },
      } as never);

      const result = getMetaMaskPayProperties(request);

      expect(result).toStrictEqual({
        properties: expect.objectContaining({
          mm_pay_fiat_provider: 'moonpay',
        }),
        sensitiveProperties: {},
      });
    });

    it('extracts mm_pay_fiat_token_target from cryptoTranslation.symbol', () => {
      const result = getMetaMaskPayProperties(request);

      expect(result).toStrictEqual({
        properties: expect.objectContaining({
          mm_pay_fiat_token_target: 'USDC',
        }),
        sensitiveProperties: {},
      });
    });

    it('extracts mm_pay_fiat_chain_target from cryptoTranslation.chainId', () => {
      const result = getMetaMaskPayProperties(request);

      expect(result).toStrictEqual({
        properties: expect.objectContaining({
          mm_pay_fiat_chain_target: '0x1',
        }),
        sensitiveProperties: {},
      });
    });

    it('falls back to mm_pay_fiat_chain_target from caipAssetId', () => {
      getStateMock.mockReturnValue({
        engine: {
          backgroundState: {
            TokensController: { allTokens: {} },
            TransactionPayController: {
              transactionData: {
                'child-1': merge({}, FIAT_TXDATA, {
                  fiatPayment: {
                    rampsQuote: {
                      quote: {
                        cryptoTranslation: null,
                      },
                    },
                    caipAssetId:
                      'eip155:137/erc20:0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
                  },
                }),
              },
            },
          },
        },
      } as never);

      const result = getMetaMaskPayProperties(request);

      expect(result).toStrictEqual({
        properties: expect.objectContaining({
          mm_pay_fiat_chain_target: '0x89',
        }),
        sensitiveProperties: {},
      });
    });

    it('omits fiat properties when no fiat method is selected', () => {
      request.transactionMeta.metamaskPay = {
        chainId: '0x1',
        tokenAddress: '0xA0b8',
      };

      getStateMock.mockReturnValue({
        engine: {
          backgroundState: {
            TokensController: { allTokens: {} },
            TransactionPayController: {
              transactionData: {
                'child-1': {
                  paymentToken: { symbol: 'ETH', chainId: '0x1' },
                  quotes: [],
                  tokens: [],
                  totals: {
                    targetAmount: { usd: '0', fiat: '0' },
                    fees: {
                      metaMask: { usd: '0', fiat: '0' },
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

      const result = getMetaMaskPayProperties(request) as TransactionMetrics;

      expect(result.properties.mm_pay_fiat_provider).toBeUndefined();
      expect(result.properties.mm_pay_fiat_token_target).toBeUndefined();
      expect(result.properties.mm_pay_fiat_chain_target).toBeUndefined();
    });

    it('propagates fiat properties from parent to non-PAY child transaction', () => {
      // bridge/swap are non-PAY types, so the code takes the parent path
      request.transactionMeta.type = TransactionType.bridge;
      request.transactionMeta.metamaskPay = undefined;

      request.allTransactions = [
        {
          id: 'parent-1',
          type: TransactionType.moneyAccountDeposit,
          metamaskPay: { chainId: '0x1', tokenAddress: '0xA0b8' },
          requiredTransactionIds: ['child-1'],
        } as unknown as TransactionMeta,
        request.transactionMeta,
      ];

      getStateMock.mockReturnValue({
        engine: {
          backgroundState: {
            TokensController: { allTokens: {} },
            TransactionPayController: {
              transactionData: { 'parent-1': FIAT_TXDATA },
            },
          },
        },
      } as never);

      const result = getMetaMaskPayProperties(request);

      expect(result).toStrictEqual({
        properties: expect.objectContaining({
          mm_pay_payment_method_selected: 'debit_credit_card',
          mm_pay_fiat_provider: 'transak-native',
          mm_pay_fiat_token_target: 'USDC',
          mm_pay_fiat_chain_target: '0x1',
        }),
        sensitiveProperties: {},
      });
    });

    it('propagates parent UI payment method metrics to non-PAY child transaction', () => {
      request.transactionMeta.type = TransactionType.bridge;
      request.transactionMeta.metamaskPay = undefined;

      request.allTransactions = [
        {
          id: 'parent-1',
          type: TransactionType.moneyAccountDeposit,
          metamaskPay: { chainId: '0x1', tokenAddress: '0xA0b8' },
          requiredTransactionIds: ['child-1'],
        } as unknown as TransactionMeta,
        request.transactionMeta,
      ];

      request.getUIMetrics = jest.fn().mockReturnValue({
        properties: {
          mm_pay_payment_method_available: ['crypto', 'debit_credit_card'],
          mm_pay_payment_method_presented: 'debit_credit_card',
        },
        sensitiveProperties: {},
      });

      getStateMock.mockReturnValue({
        engine: {
          backgroundState: {
            TokensController: { allTokens: {} },
            TransactionPayController: {
              transactionData: { 'parent-1': FIAT_TXDATA },
            },
          },
        },
      } as never);

      const result = getMetaMaskPayProperties(request);

      expect(result).toStrictEqual({
        properties: expect.objectContaining({
          mm_pay_payment_method_available: ['crypto', 'debit_credit_card'],
          mm_pay_payment_method_presented: 'debit_credit_card',
          mm_pay_payment_method_selected: 'debit_credit_card',
        }),
        sensitiveProperties: {},
      });
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
