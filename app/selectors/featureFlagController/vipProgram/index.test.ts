import { selectVipProgramEnabled } from './index';

describe('selectVipProgramEnabled', () => {
  it('returns true when vipProgramEnabled is true', () => {
    const result = selectVipProgramEnabled.resultFunc({
      vipProgramEnabled: true,
    });
    expect(result).toBe(true);
  });

  it('returns false when vipProgramEnabled is false', () => {
    const result = selectVipProgramEnabled.resultFunc({
      vipProgramEnabled: false,
    });
    expect(result).toBe(false);
  });

  it('returns false when vipProgramEnabled is undefined', () => {
    const result = selectVipProgramEnabled.resultFunc({});
    expect(result).toBe(false);
  });

  it('returns false when vipProgramEnabled is a non-boolean value', () => {
    const result = selectVipProgramEnabled.resultFunc({
      vipProgramEnabled: 'true',
    });
    expect(result).toBe(false);
  });

  it('returns false when remote feature flags are empty', () => {
    const result = selectVipProgramEnabled.resultFunc({});
    expect(result).toBe(false);
  });
});
