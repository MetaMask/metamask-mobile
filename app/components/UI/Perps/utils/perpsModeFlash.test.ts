import { renderHook, act } from '@testing-library/react-native';
import { PerpsMode } from '@metamask/perps-controller';
import {
  hidePerpsModeFlash,
  showPerpsModeFlash,
  usePerpsModeFlash,
} from './perpsModeFlash';

describe('perpsModeFlash store', () => {
  afterEach(() => {
    hidePerpsModeFlash();
  });

  it('starts with no flashing mode', () => {
    // Act
    const { result } = renderHook(() => usePerpsModeFlash());

    // Assert
    expect(result.current).toBeNull();
  });

  it('surfaces the mode passed to showPerpsModeFlash', () => {
    // Arrange
    const { result } = renderHook(() => usePerpsModeFlash());

    // Act
    act(() => showPerpsModeFlash(PerpsMode.Pro));

    // Assert
    expect(result.current).toBe(PerpsMode.Pro);
  });

  it('clears the mode on hidePerpsModeFlash', () => {
    // Arrange
    const { result } = renderHook(() => usePerpsModeFlash());
    act(() => showPerpsModeFlash(PerpsMode.Lite));

    // Act
    act(() => hidePerpsModeFlash());

    // Assert
    expect(result.current).toBeNull();
  });

  it('notifies all subscribers when the mode changes', () => {
    // Arrange
    const a = renderHook(() => usePerpsModeFlash());
    const b = renderHook(() => usePerpsModeFlash());

    // Act
    act(() => showPerpsModeFlash(PerpsMode.Pro));

    // Assert
    expect(a.result.current).toBe(PerpsMode.Pro);
    expect(b.result.current).toBe(PerpsMode.Pro);
  });
});
