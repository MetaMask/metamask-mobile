import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useLiquidGlass } from '../../component-library/hooks/useLiquidGlass';
import { useIsGlassSurfaceEnabled } from './useIsGlassSurfaceEnabled';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../component-library/hooks/useLiquidGlass', () => ({
  useLiquidGlass: jest.fn(),
}));

const selectFlag = jest.fn();

const setUp = (isFlagEnabled: unknown, isGlassEnabled: boolean) => {
  jest.mocked(useSelector).mockReturnValue(isFlagEnabled);
  jest.mocked(useLiquidGlass).mockReturnValue({
    isGlassEnabled,
    glassColorScheme: 'dark',
    isBlurEnabled: false,
    blurTint: 'systemChromeMaterialDark',
  });
};

describe('useIsGlassSurfaceEnabled', () => {
  it('reads the given flag selector', () => {
    setUp(true, true);

    renderHook(() => useIsGlassSurfaceEnabled(selectFlag));

    expect(useSelector).toHaveBeenCalledWith(selectFlag);
  });

  it.each([
    [true, true, true],
    [true, false, false],
    [false, true, false],
    [false, false, false],
  ])(
    'with the flag %s and glass available %s returns %s',
    (isFlagEnabled, isGlassEnabled, expected) => {
      setUp(isFlagEnabled, isGlassEnabled);

      const { result } = renderHook(() => useIsGlassSurfaceEnabled(selectFlag));

      expect(result.current).toBe(expected);
    },
  );

  it('ignores non-boolean selector stubs', () => {
    setUp({}, true);

    const { result } = renderHook(() => useIsGlassSurfaceEnabled(selectFlag));

    expect(result.current).toBe(false);
  });
});
