import { TextColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { CreatedLimitOrderTransaction } from '../../api/limitOrders/create/schema';
import { MOCK_LIMIT_OPEN_ORDER } from '../../api/limitOrders/getLimitOrders/mock';
import { LimitOrderState } from '../../api/limitOrders/getLimitOrders/types';
import {
  getLimitOrderActivityNetworkFee,
  getLimitOrderActivityStatus,
  getLimitOrderActivityTitle,
  getLimitOrderActivityTransaction,
  getLimitOrderActivityUsdValue,
} from './SwapsLimitOrderActivityPage.utils';

const ETH_FEE_ASSET = {
  assetId: 'eip155:1/slip44:60',
  symbol: 'ETH',
  decimals: 18,
  name: 'Ether',
};

function createTransaction(
  overrides: Partial<CreatedLimitOrderTransaction>,
): CreatedLimitOrderTransaction {
  return {
    status: 'failed',
    src: MOCK_LIMIT_OPEN_ORDER.src,
    dest: MOCK_LIMIT_OPEN_ORDER.dest,
    timingData: { createdAt: '2026-09-01T12:00:00.000Z' },
    ...overrides,
  };
}

describe('getLimitOrderActivityTransaction', () => {
  it('returns the transaction that filled the order over any other attempt', () => {
    const executed = createTransaction({
      status: 'executed',
      txHash: `0x${'11'.repeat(32)}`,
      timingData: { createdAt: '2026-09-01T12:00:00.000Z' },
    });
    const laterReverted = createTransaction({
      txHash: `0x${'22'.repeat(32)}`,
      timingData: { createdAt: '2026-09-02T12:00:00.000Z' },
    });

    const result = getLimitOrderActivityTransaction([laterReverted, executed]);

    expect(result).toBe(executed);
  });

  it('returns the latest attempt that reached the chain when none filled the order', () => {
    const earlier = createTransaction({
      txHash: `0x${'11'.repeat(32)}`,
      timingData: { createdAt: '2026-09-01T12:00:00.000Z' },
    });
    const later = createTransaction({
      txHash: `0x${'22'.repeat(32)}`,
      timingData: { createdAt: '2026-09-02T12:00:00.000Z' },
    });
    const offChain = createTransaction({
      timingData: { createdAt: '2026-09-03T12:00:00.000Z' },
    });

    const result = getLimitOrderActivityTransaction([earlier, offChain, later]);

    expect(result).toBe(later);
  });

  it.each([
    ['no transactions', undefined],
    ['only off-chain attempts', [createTransaction({})]],
  ])('returns undefined for %s', (_, transactions) => {
    const result = getLimitOrderActivityTransaction(transactions);

    expect(result).toBeUndefined();
  });
});

describe('getLimitOrderActivityNetworkFee', () => {
  it('returns the gas fee the fill took from the swap', () => {
    const txFee = {
      amount: '34213562489209',
      asset: ETH_FEE_ASSET,
      usd: '0.09351162962297646',
      maxFeePerGas: '26702076',
      maxPriorityFeePerGas: '1000004',
    };
    const transaction = createTransaction({
      feeData: {
        txFee,
        metabridge: {
          amount: '31818781531961',
          asset: ETH_FEE_ASSET,
          usd: '0.08696627586237457',
        },
      },
    });

    const result = getLimitOrderActivityNetworkFee(transaction);

    expect(result).toStrictEqual(txFee);
  });

  it.each([
    ['no transaction', undefined],
    ['no fee data', createTransaction({})],
    [
      'no gas fee',
      createTransaction({
        feeData: { metabridge: { amount: '1', asset: ETH_FEE_ASSET } },
      }),
    ],
    [
      'a zero gas fee',
      createTransaction({
        feeData: { txFee: { amount: '0', asset: ETH_FEE_ASSET } },
      }),
    ],
    [
      'a malformed gas fee',
      createTransaction({ feeData: { txFee: { amount: '1' } } }),
    ],
  ])('returns undefined for %s', (_, transaction) => {
    const result = getLimitOrderActivityNetworkFee(transaction);

    expect(result).toBeUndefined();
  });
});

describe('getLimitOrderActivityUsdValue', () => {
  it('values a token amount at the USD rate of one token', () => {
    // 9.911848 USDC at $1.0001 per USDC.
    const result = getLimitOrderActivityUsdValue('9911848', 6, 1.0001);

    expect(result).toBeCloseTo(9.91283918, 8);
  });

  it('returns undefined without a rate', () => {
    const result = getLimitOrderActivityUsdValue('9911848', 6, undefined);

    expect(result).toBeUndefined();
  });
});

describe('getLimitOrderActivityStatus', () => {
  it('reads an order that has not closed as in progress', () => {
    const result = getLimitOrderActivityStatus({
      ...MOCK_LIMIT_OPEN_ORDER,
      state: LimitOrderState.Executing,
    });

    expect(result).toStrictEqual({
      label: strings('bridge.limit.in_progress'),
      color: TextColor.WarningDefault,
    });
  });
});

describe('getLimitOrderActivityTitle', () => {
  it('names an order that has not closed by its pair', () => {
    const result = getLimitOrderActivityTitle(
      LimitOrderState.Open,
      'ETH',
      'USDC',
    );

    expect(result).toBe(
      strings('bridge.limit.pair', { source: 'ETH', dest: 'USDC' }),
    );
  });
});
