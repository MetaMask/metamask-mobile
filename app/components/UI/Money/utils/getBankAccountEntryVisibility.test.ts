import { getBankAccountEntryVisibility } from './getBankAccountEntryVisibility';

describe('getBankAccountEntryVisibility', () => {
  it('keeps the coming-soon row when the flag is off', () => {
    expect(
      getBankAccountEntryVisibility({
        isFlagEnabled: false,
        isEligible: false,
      }),
    ).toBe('coming-soon');
  });

  it('keeps the coming-soon row when the flag is off even if eligibility is reported true', () => {
    expect(
      getBankAccountEntryVisibility({ isFlagEnabled: false, isEligible: true }),
    ).toBe('coming-soon');
  });

  it('enables the row when the flag is on and the user is eligible', () => {
    expect(
      getBankAccountEntryVisibility({ isFlagEnabled: true, isEligible: true }),
    ).toBe('enabled');
  });

  it('hides the row when the flag is on and the user is not eligible', () => {
    expect(
      getBankAccountEntryVisibility({ isFlagEnabled: true, isEligible: false }),
    ).toBe('hidden');
  });
});
