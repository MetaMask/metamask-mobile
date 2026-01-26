import { Platform } from 'react-native';
import { getSafeAreaEdges } from './getSafeAreaEdges';

describe('getSafeAreaEdges', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('includes bottom edge on Android', () => {
    Platform.OS = 'android';
    const edges = getSafeAreaEdges();
    expect(edges).toEqual(['left', 'right', 'bottom']);
  });

  it('excludes bottom edge on iOS', () => {
    Platform.OS = 'ios';
    const edges = getSafeAreaEdges();
    expect(edges).toEqual(['left', 'right']);
  });
});
