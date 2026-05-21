import { shouldDeferUnifiedAccountSetup } from './hyperLiquidAbstraction';

describe('shouldDeferUnifiedAccountSetup', () => {
  it.each(['dexAbstraction', 'default', 'disabled'] as const)(
    'defers %s setup when signing is not allowed',
    (currentMode) => {
      expect(shouldDeferUnifiedAccountSetup(currentMode, false)).toBe(true);
    },
  );

  it.each(['dexAbstraction', 'default', 'disabled'] as const)(
    'allows %s setup when signing is allowed',
    (currentMode) => {
      expect(shouldDeferUnifiedAccountSetup(currentMode, true)).toBe(false);
    },
  );

  it.each(['unifiedAccount', 'portfolioMargin', undefined] as const)(
    'does not defer %s because no migration is required',
    (currentMode) => {
      expect(shouldDeferUnifiedAccountSetup(currentMode, false)).toBe(false);
    },
  );
});
