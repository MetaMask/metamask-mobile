import { selectDeFiPositionsSectionEnabled } from './deFiPositionsSectionEnabled';

describe('selectDeFiPositionsSectionEnabled', () => {
  it('returns true only when remote flag and basic functionality are true', () => {
    expect(selectDeFiPositionsSectionEnabled.resultFunc(true, true)).toBe(true);
    expect(selectDeFiPositionsSectionEnabled.resultFunc(true, false)).toBe(
      false,
    );
    expect(selectDeFiPositionsSectionEnabled.resultFunc(false, true)).toBe(
      false,
    );
    expect(selectDeFiPositionsSectionEnabled.resultFunc(false, false)).toBe(
      false,
    );
  });
});
