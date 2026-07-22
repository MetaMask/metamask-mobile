import { renderHook } from '@testing-library/react-native';
import { usePerpsProModeEnabled } from './usePerpsProModeEnabled';

describe('usePerpsProModeEnabled', () => {
  it('returns false by default while Pro mode is not yet reachable (TAT-3551)', () => {
    const { result } = renderHook(() => usePerpsProModeEnabled());

    expect(result.current).toBe(false);
  });
});
