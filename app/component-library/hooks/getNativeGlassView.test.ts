import {
  getNativeGlassView,
  resetNativeGlassViewCacheForTests,
} from './getNativeGlassView';

const mockGlassView = jest.fn();

jest.mock('expo-glass-effect', () => ({
  GlassView: mockGlassView,
}));

describe('getNativeGlassView', () => {
  beforeEach(() => {
    resetNativeGlassViewCacheForTests();
  });

  it('returns GlassView when the native module loads', () => {
    const NativeGlassView = getNativeGlassView();

    expect(NativeGlassView).toBe(mockGlassView);
  });

  it('reuses the loaded GlassView on later calls', () => {
    getNativeGlassView();

    expect(getNativeGlassView()).toBe(mockGlassView);
  });
});
