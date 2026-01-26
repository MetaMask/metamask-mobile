import { Platform } from 'react-native';

describe('SAFE_AREA_EDGES', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
    jest.resetModules();
  });

  it('includes bottom edge on Android', async () => {
    Platform.OS = 'android';
    jest.resetModules();
    const module = await import('./getSafeAreaEdges');
    expect(module.SAFE_AREA_EDGES).toEqual(['left', 'right', 'bottom']);
  });

  it('excludes bottom edge on iOS', async () => {
    Platform.OS = 'ios';
    jest.resetModules();
    const module = await import('./getSafeAreaEdges');
    expect(module.SAFE_AREA_EDGES).toEqual(['left', 'right']);
  });
});
