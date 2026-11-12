import type { IndexedPayment } from '../../services/clients/CollectiblesApiClient';
import { saleReceiptUsd } from './saleReceipt';

const receipt = (amountUsd: string | null): IndexedPayment => ({
  occurredAt: '2026-10-14T00:00:00Z',
  transactionId: 'confirmed-sale',
  amount: '11050000',
  amountUsd,
  token: { id: 'USDC', decimals: 6 },
});

describe('saleReceiptUsd', () => {
  it('uses the actual receipt amount with its cents', () => {
    expect(saleReceiptUsd({ buyback: receipt('11.05') })).toBe(11.05);
  });

  it('preserves a reported zero instead of falling back to appraisal', () => {
    expect(saleReceiptUsd({ buyback: receipt('0') })).toBe(0);
  });

  it.each([null, '', '  ', 'NaN', 'Infinity', '-1'])(
    'omits an unusable USD receipt (%s)',
    (value) => {
      expect(saleReceiptUsd({ buyback: receipt(value) })).toBeNull();
    },
  );

  it('does not invent a price when the receipt is absent', () => {
    expect(saleReceiptUsd({ buyback: null })).toBeNull();
  });
});
