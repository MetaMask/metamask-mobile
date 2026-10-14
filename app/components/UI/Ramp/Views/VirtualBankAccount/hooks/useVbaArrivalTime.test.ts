import type { PaymentMethod } from '@metamask/ramps-controller';
import { getVbaArrivalTimeframe } from './useVbaArrivalTime';

const buildMethod = ({
  id = '/payments/bank-transfer',
  paymentType = 'bank-transfer',
  isManualBankTransfer,
  delay,
}: {
  id?: string;
  paymentType?: string;
  isManualBankTransfer?: boolean;
  delay?: number[];
}) =>
  ({
    id,
    paymentType,
    ...(isManualBankTransfer !== undefined && { isManualBankTransfer }),
    ...(delay !== undefined && { delay }),
  }) as unknown as PaymentMethod;

describe('getVbaArrivalTimeframe', () => {
  it('formats the manual bank transfer delay range as a timeframe', () => {
    const methods = [
      buildMethod({
        id: '/payments/debit-credit-card',
        paymentType: 'debit-credit-card',
        delay: [5, 10],
      }),
      buildMethod({ isManualBankTransfer: true, delay: [2880, 4320] }),
    ];

    expect(getVbaArrivalTimeframe(methods)).toBe('2 - 3 business days');
  });

  it('falls back to a bank-transfer payment type when no method is flagged manual', () => {
    const methods = [
      buildMethod({
        id: '/payments/debit-credit-card',
        paymentType: 'debit-credit-card',
        delay: [5, 10],
      }),
      buildMethod({ delay: [120, 240] }),
    ];

    expect(getVbaArrivalTimeframe(methods)).toBe('2 - 4 hours');
  });

  it('prefers the manual bank transfer over a later bank-transfer payment type', () => {
    const methods = [
      buildMethod({
        id: '/payments/instant-transfer',
        paymentType: 'bank-transfer',
        delay: [1, 5],
      }),
      buildMethod({ isManualBankTransfer: true, delay: [2880, 4320] }),
    ];

    expect(getVbaArrivalTimeframe(methods)).toBe('2 - 3 business days');
  });

  it.each([
    [
      'no bank-transfer method at all',
      [
        buildMethod({
          id: '/payments/debit-credit-card',
          paymentType: 'debit-credit-card',
          delay: [5, 10],
        }),
      ],
    ],
    ['no delay field on the method', [buildMethod({})]],
    ['a single-value delay', [buildMethod({ delay: [60] })]],
    ['an empty method list', []],
  ])('is undefined with %s', (_label, methods) => {
    expect(getVbaArrivalTimeframe(methods as PaymentMethod[])).toBeUndefined();
  });
});
