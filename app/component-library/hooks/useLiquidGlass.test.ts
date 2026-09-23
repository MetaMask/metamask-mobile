import { renderHook } from '@testing-library/react-native';

import { useLiquidGlass } from './useLiquidGlass';

const mockIsLiquidGlassAvailable = jest.fn();
jest.mock('expo-glass-effect', () => ({
  isLiquidGlassAvailable: () => mockIsLiquidGlassAvailable(),
}));

const mockUseBlurMaterial = jest.fn();
jest.mock('./useBlurMaterial', () => ({
  useBlurMaterial: () => mockUseBlurMaterial(),
}));

describe('useLiquidGlass', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLiquidGlassAvailable.mockReturnValue(true);
    mockUseBlurMaterial.mockReturnValue({
      isBlurAvailable: true,
      colorScheme: 'dark',
      tint: 'systemChromeMaterialDark',
    });
  });

  it('enables glass when the OS supports it and transparency is allowed', () => {
    const { result } = renderHook(() => useLiquidGlass());

    expect(result.current.isGlassEnabled).toBe(true);
  });

  it('disables glass when the OS cannot draw it', () => {
    mockIsLiquidGlassAvailable.mockReturnValue(false);

    const { result } = renderHook(() => useLiquidGlass());

    expect(result.current.isGlassEnabled).toBe(false);
  });

  it('disables glass when Reduce Transparency is on', () => {
    mockUseBlurMaterial.mockReturnValue({
      isBlurAvailable: false,
      colorScheme: 'dark',
      tint: 'systemChromeMaterialDark',
    });

    const { result } = renderHook(() => useLiquidGlass());

    expect(result.current.isGlassEnabled).toBe(false);
  });

  it('follows the app theme rather than the system appearance', () => {
    mockUseBlurMaterial.mockReturnValue({
      isBlurAvailable: true,
      colorScheme: 'light',
      tint: 'systemChromeMaterialLight',
    });

    const { result } = renderHook(() => useLiquidGlass());

    expect(result.current.glassColorScheme).toBe('light');
  });
});
