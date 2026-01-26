import { Platform } from 'react-native';

describe('SAFE_AREA_EDGES', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
    jest.resetModules();
  });

  it('includes bottom edge on Android', () => {
    Platform.OS = 'android';
    jest.resetModules();
    const { SAFE_AREA_EDGES } = require('./getSafeAreaEdges');
    expect(SAFE_AREA_EDGES).toEqual(['left', 'right', 'bottom']);
  });

  it('excludes bottom edge on iOS', () => {
    Platform.OS = 'ios';
    jest.resetModules();
    const { SAFE_AREA_EDGES } = require('./getSafeAreaEdges');
    expect(SAFE_AREA_EDGES).toEqual(['left', 'right']);
  });
});
