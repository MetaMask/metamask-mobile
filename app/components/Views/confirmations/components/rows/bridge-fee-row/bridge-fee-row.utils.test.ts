import { splitProviderFee } from './bridge-fee-row.utils';

describe('splitProviderFee', () => {
  it('splits a positive on-ramp fee out of the combined provider fee', () => {
    const { onRampFee, remainingProviderFee } = splitProviderFee(
      '1.00',
      '0.40',
    );

    expect(onRampFee?.toString()).toBe('0.4');
    expect(remainingProviderFee.toString()).toBe('0.6');
  });

  it('keeps the two portions summing to the combined provider fee', () => {
    // The itemised tooltip must agree with the single transaction-fee total
    // shown on the first screen, so the split cannot create or lose value.
    const { onRampFee, remainingProviderFee } = splitProviderFee(
      '1.23',
      '0.45',
    );

    expect(remainingProviderFee.plus(onRampFee ?? 0).toString()).toBe('1.23');
  });

  it.each([
    ['absent', undefined],
    ['zero', '0'],
    ['negative', '-1'],
    ['non-numeric', 'invalid'],
  ])(
    'reports no on-ramp fee and the full provider fee when the value is %s',
    (_label, providerFiatFeeUsd) => {
      const { onRampFee, remainingProviderFee } = splitProviderFee(
        '1.00',
        providerFiatFeeUsd,
      );

      expect(onRampFee).toBeUndefined();
      expect(remainingProviderFee.toString()).toBe('1');
    },
  );

  it('caps an excessive on-ramp fee so the provider fee cannot go negative', () => {
    const { onRampFee, remainingProviderFee } = splitProviderFee(
      '1.00',
      '2.00',
    );

    expect(onRampFee?.toString()).toBe('1');
    expect(remainingProviderFee.toString()).toBe('0');
  });

  it.each([
    ['negative', '-5'],
    ['non-numeric', 'invalid'],
  ])('treats a %s combined provider fee as zero', (_label, providerFeeUsd) => {
    const { onRampFee, remainingProviderFee } = splitProviderFee(
      providerFeeUsd,
      '0.40',
    );

    expect(onRampFee).toBeUndefined();
    expect(remainingProviderFee.toString()).toBe('0');
  });
});
