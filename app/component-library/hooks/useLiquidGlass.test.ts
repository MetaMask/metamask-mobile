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

  it('falls back to blur on iOS without Liquid Glass', () => {
    mockIsLiquidGlassAvailable.mockReturnValue(false);

    const { result } = renderHook(() => useLiquidGlass());

    expect(result.current.isBlurEnabled).toBe(true);
    expect(result.current.blurTint).toBe('systemChromeMaterialDark');
  });

  it('does not blur where glass is drawn', () => {
    const { result } = renderHook(() => useLiquidGlass());

    expect(result.current.isBlurEnabled).toBe(false);
  });

  it('does not blur when the blur material is unavailable', () => {
    mockIsLiquidGlassAvailable.mockReturnValue(false);
    mockUseBlurMaterial.mockReturnValue({
      isBlurAvailable: false,
      colorScheme: 'dark',
      tint: 'systemChromeMaterialDark',
    });

    const { result } = renderHook(() => useLiquidGlass());

    expect(result.current.isBlurEnabled).toBe(false);
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
