import { resolveABTestAssignment } from './abTest';

describe('resolveABTestAssignment', () => {
  const validVariants = ['control', 'treatment'] as const;
  const flagKey = 'test-flag';

  it('returns an active assignment for a valid string flag', () => {
    expect(
      resolveABTestAssignment(
        { [flagKey]: 'treatment' },
        flagKey,
        validVariants,
      ),
    ).toEqual({
      variantName: 'treatment',
      isActive: true,
    });
  });

  it('returns an active assignment for a valid controller object flag', () => {
    expect(
      resolveABTestAssignment(
        { [flagKey]: { name: 'control' } },
        flagKey,
        validVariants,
      ),
    ).toEqual({
      variantName: 'control',
      isActive: true,
    });
  });

  it('falls back to control when the flag is missing', () => {
    expect(resolveABTestAssignment({}, flagKey, validVariants)).toEqual({
      variantName: 'control',
      isActive: false,
    });
  });

  it('falls back to control when the flag value is invalid', () => {
    expect(
      resolveABTestAssignment(
        { [flagKey]: 'unexpected' },
        flagKey,
        validVariants,
      ),
    ).toEqual({
      variantName: 'control',
      isActive: false,
    });
  });

  it('falls back to control when feature flags are nullish', () => {
    expect(resolveABTestAssignment(null, flagKey, validVariants)).toEqual({
      variantName: 'control',
      isActive: false,
    });

    expect(resolveABTestAssignment(undefined, flagKey, validVariants)).toEqual({
      variantName: 'control',
      isActive: false,
    });
  });

  it('falls back to control when the controller object name is invalid', () => {
    expect(
      resolveABTestAssignment(
        { [flagKey]: { name: 'unexpected' } },
        flagKey,
        validVariants,
      ),
    ).toEqual({
      variantName: 'control',
      isActive: false,
    });
  });
});
