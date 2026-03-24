import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { TransactionPayStrategy } from '@metamask/transaction-pay-controller';

import {
  getMetaMaskPayStrategiesForRoute,
  getMetaMaskPayStrategiesForTransaction,
} from './transaction-pay-routing';

describe('transaction pay routing', () => {
  it('normalizes invalid routing flags and drops empty overrides', () => {
    const strategies = getMetaMaskPayStrategiesForRoute(
      {
        chainId: '0xa4b2',
        tokenAddress: '0xdef',
        transactionType: TransactionType.perpsDeposit,
      },
      {
        strategyOrder: [123, 'relay', 'relay'],
        payStrategies: {
          across: { enabled: true },
          relay: { enabled: false },
        },
        routingOverrides: {
          overrides: {
            perpsDeposit: {
              default: [123, 'invalid'],
              chains: {
                '0xa4b1': [123],
                '0xa4b2': ['relay'],
              },
              tokens: {
                '0xa4b1': undefined,
                '0xa4b2': {
                  '0xabc': [123],
                  '0xdef': ['across'],
                },
              },
            },
          },
        },
      },
    );

    expect(strategies).toEqual([TransactionPayStrategy.Across]);
  });

  it('uses destination values for post-quote transactions', () => {
    const transactionMeta = {
      chainId: '0xa4b1',
      destinationChainId: '0x89',
      destinationTokenAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      metamaskPay: {
        isPostQuote: true,
      },
      txParams: {
        to: '0x1234567890abcdef1234567890abcdef12345678',
      },
      type: TransactionType.perpsDeposit,
    } as unknown as TransactionMeta;

    expect(
      getMetaMaskPayStrategiesForTransaction(transactionMeta, {
        payStrategies: {
          across: { enabled: true },
          relay: { enabled: true },
        },
        routingOverrides: {
          overrides: {
            perpsDeposit: {
              chains: {
                '0x89': ['across'],
              },
              default: ['relay'],
            },
          },
        },
        strategyOrder: ['relay'],
      }),
    ).toEqual([TransactionPayStrategy.Across]);
  });

  it('groups perpsDepositAndOrder under the perpsDeposit routing key', () => {
    const transactionMeta = {
      chainId: '0xa4b1',
      txParams: {
        to: '0x1234567890abcdef1234567890abcdef12345678',
      },
      type: TransactionType.perpsDepositAndOrder,
    } as unknown as TransactionMeta;

    expect(
      getMetaMaskPayStrategiesForTransaction(transactionMeta, {
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
      }),
    ).toEqual([TransactionPayStrategy.Across]);
  });

  it('returns an empty strategy list when every fallback strategy is disabled', () => {
    expect(
      getMetaMaskPayStrategiesForRoute(
        {},
        {
          payStrategies: {
            across: { enabled: false },
            relay: { enabled: false },
          },
          routingOverrides: {
            overrides: {},
          },
          strategyOrder: ['relay', 'across'],
        },
      ),
    ).toEqual([]);
  });
});
