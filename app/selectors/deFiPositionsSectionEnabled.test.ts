import { selectDeFiPositionsSectionEnabled } from './deFiPositionsSectionEnabled';

describe('selectDeFiPositionsSectionEnabled', () => {
  it('returns true when assets DeFi is enabled, V2 is disabled, and basic functionality is enabled', () => {
    expect(
      selectDeFiPositionsSectionEnabled.resultFunc(true, false, true),
    ).toBe(true);
  });

  it('returns false when V2 is enabled', () => {
    expect(selectDeFiPositionsSectionEnabled.resultFunc(true, true, true)).toBe(
      false,
    );
  });

  it('returns false when basic functionality is disabled', () => {
    expect(
      selectDeFiPositionsSectionEnabled.resultFunc(true, false, false),
    ).toBe(false);
  });

  it('returns false when assets DeFi positions is disabled', () => {
    expect(
      selectDeFiPositionsSectionEnabled.resultFunc(false, false, true),
    ).toBe(false);
  });
});
