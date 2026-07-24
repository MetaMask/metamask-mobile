import { selectDeFiPositionsSectionEnabled } from './deFiPositionsSectionEnabled';

describe('selectDeFiPositionsSectionEnabled', () => {
  it('returns true when V2 is disabled and basic functionality is enabled', () => {
    expect(selectDeFiPositionsSectionEnabled.resultFunc(false, true)).toBe(
      true,
    );
  });

  it('returns false when V2 is enabled', () => {
    expect(selectDeFiPositionsSectionEnabled.resultFunc(true, true)).toBe(
      false,
    );
  });

  it('returns false when basic functionality is disabled', () => {
    expect(selectDeFiPositionsSectionEnabled.resultFunc(false, false)).toBe(
      false,
    );
  });
});
