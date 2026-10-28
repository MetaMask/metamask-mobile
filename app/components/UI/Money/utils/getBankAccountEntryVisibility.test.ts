import { getBankAccountEntryVisibility } from './getBankAccountEntryVisibility';

describe('getBankAccountEntryVisibility', () => {
  it.each([
    [false, false, false, false, 'coming-soon'],
    [false, true, false, false, 'coming-soon'],
    [false, false, true, false, 'coming-soon'],
    [true, true, false, false, 'enabled'],
    [true, false, false, false, 'coming-soon'],
    [true, false, true, false, 'hidden'],
    [false, false, false, true, 'enabled'],
    [true, false, true, true, 'enabled'],
  ] as const)(
    'flag %s, eligible %s, loading %s, usable autoramp %s returns %s',
    (isFlagEnabled, isEligible, isLoading, hasUsableAutoramp, expected) => {
      expect(
        getBankAccountEntryVisibility({
          isFlagEnabled,
          isEligible,
          isLoading,
          hasUsableAutoramp,
        }),
      ).toBe(expected);
    },
  );
});
