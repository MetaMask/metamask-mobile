jest.mock('expo-glass-effect', () => {
  throw new Error("Cannot find native module 'ExpoGlassEffect'");
});

import {
  getNativeGlassView,
  resetNativeGlassViewCacheForTests,
} from './getNativeGlassView';

describe('getNativeGlassView when ExpoGlassEffect is missing', () => {
  beforeEach(() => {
    resetNativeGlassViewCacheForTests();
  });

  it('returns null when loading GlassView throws', () => {
    expect(getNativeGlassView()).toBeNull();
  });
});
