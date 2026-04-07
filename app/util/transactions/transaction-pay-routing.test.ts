import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { TransactionPayStrategy } from '@metamask/transaction-pay-controller';

import {
  getTransactionPayRouteContext,
  normalizeMetaMaskPayRoutingFlags,
  resolveMetaMaskPayStrategies,
} from './transaction-pay-routing';

describe('transaction pay routing', () => {
  it('normalizes invalid routing flags and drops empty overrides', () => {
    const routingFlags = normalizeMetaMaskPayRoutingFlags({
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
    });

    expect(routingFlags.strategyOrder).toEqual([TransactionPayStrategy.Relay]);
    expect(
      routingFlags.routingOverrides.overrides.perpsDeposit.default,
    ).toBeUndefined();
    expect(routingFlags.routingOverrides.overrides.perpsDeposit.chains).toEqual(
      {
        '0xa4b2': [TransactionPayStrategy.Relay],
      },
    );
    expect(routingFlags.routingOverrides.overrides.perpsDeposit.tokens).toEqual(
      {
        '0xa4b2': {
          '0xdef': [TransactionPayStrategy.Across],
        },
      },
    );
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

    const routeContext = getTransactionPayRouteContext(transactionMeta);

    expect(routeContext).toEqual({
      chainId: '0x89',
      tokenAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      transactionType: TransactionType.perpsDeposit,
    });
  });

  it('groups perpsDepositAndOrder under the perpsDeposit routing key', () => {
    const transactionMeta = {
      chainId: '0xa4b1',
      txParams: {
        to: '0x1234567890abcdef1234567890abcdef12345678',
      },
      type: TransactionType.perpsDepositAndOrder,
    } as unknown as TransactionMeta;

    const routeContext = getTransactionPayRouteContext(transactionMeta);

    expect(routeContext.transactionType).toBe(TransactionType.perpsDeposit);

    const routingFlags = normalizeMetaMaskPayRoutingFlags({
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
    });

    expect(resolveMetaMaskPayStrategies(routeContext, routingFlags)).toEqual([
      TransactionPayStrategy.Across,
    ]);
  });

  it('returns an empty strategy list when the route context cannot resolve', () => {
    const routingFlags = {
      payStrategies: {
        across: { enabled: true },
        relay: { enabled: true },
      },
      routingOverrides: {
        overrides: {},
      },
      strategyOrder: ['bridge' as unknown as TransactionPayStrategy],
    };

    expect(resolveMetaMaskPayStrategies({}, routingFlags)).toEqual([]);
  });
});
