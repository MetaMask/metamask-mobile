/**
 * A partial `@react-navigation/native` mock that only stubs `useNavigation`
 * leaves `NavigationContext` undefined. `useContext(undefined)` throws.
 * This file keeps that mock shape. The other hook test covers a real navigator.
 */
import { renderHook, act } from '@testing-library/react-native';
import {
  SCREEN_TRANSITION_FALLBACK_MS,
  useScreenTransitionComplete,
} from './useScreenTransitionComplete';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    addListener: jest.fn(),
    isFocused: () => true,
  }),
}));

describe('useScreenTransitionComplete without NavigationContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses the fallback timer when NavigationContext is not exported', () => {
    const { result } = renderHook(() => useScreenTransitionComplete());

    expect(result.current).toBe(false);

    act(() => {
      jest.advanceTimersByTime(SCREEN_TRANSITION_FALLBACK_MS);
    });

    expect(result.current).toBe(true);
  });
});
