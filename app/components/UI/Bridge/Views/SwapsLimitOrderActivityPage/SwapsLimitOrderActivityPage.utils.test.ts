import { TextColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { CreatedLimitOrderTransaction } from '../../api/limitOrders/create/schema';
import { MOCK_LIMIT_OPEN_ORDER } from '../../api/limitOrders/getLimitOrders/mock';
import { LimitOrderState } from '../../api/limitOrders/getLimitOrders/types';
import {
  getLimitOrderActivityStatus,
  getLimitOrderActivityTitle,
  getLimitOrderActivityTransaction,
} from './SwapsLimitOrderActivityPage.utils';

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
