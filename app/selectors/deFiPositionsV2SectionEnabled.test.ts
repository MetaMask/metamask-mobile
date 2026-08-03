import { selectDeFiPositionsV2SectionEnabled } from './deFiPositionsV2SectionEnabled';

describe('selectDeFiPositionsV2SectionEnabled', () => {
  it('returns true when both the V2 flag and basic functionality are enabled', () => {
    expect(selectDeFiPositionsV2SectionEnabled.resultFunc(true, true)).toBe(
      true,
    );
  });

  it('returns false when the V2 flag is disabled', () => {
    expect(selectDeFiPositionsV2SectionEnabled.resultFunc(false, true)).toBe(
      false,
    );
  });

  it('returns false when basic functionality is disabled', () => {
    expect(selectDeFiPositionsV2SectionEnabled.resultFunc(true, false)).toBe(
      false,
    );
  });
});
