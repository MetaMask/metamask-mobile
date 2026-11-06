import { getBankAccountEntryVisibility } from './getBankAccountEntryVisibility';

describe('getBankAccountEntryVisibility', () => {
  it.each([
    [false, false, false, 'coming-soon'],
    [false, true, false, 'coming-soon'],
    [true, true, false, 'enabled'],
    [true, false, false, 'hidden'],
    [false, false, true, 'enabled'],
    [true, false, true, 'enabled'],
  ] as const)(
    'flag %s, eligible %s, usable autoramp %s returns %s',
    (isFlagEnabled, isEligible, hasUsableAutoramp, expected) => {
      expect(
        getBankAccountEntryVisibility({
          isFlagEnabled,
          isEligible,
          hasUsableAutoramp,
        }),
      ).toBe(expected);
    },
  );
});
