import { renderHook, act } from '@testing-library/react-hooks';
import { useNowOnScreenFocus } from './useNowOnScreenFocus';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, import-x/no-commonjs
const { useFocusEffect } = require('@react-navigation/native') as {
  useFocusEffect: jest.Mock;
};

describe('useNowOnScreenFocus', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the current time at mount', () => {
    const mountTime = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(mountTime);

    const { result } = renderHook(() => useNowOnScreenFocus());

    expect(result.current).toBe(mountTime);
  });

  it('refreshes the returned time when the screen regains focus', () => {
    const mountTime = 1_700_000_000_000;
    const focusTime = mountTime + 45 * 24 * 60 * 60 * 1000;
    jest.spyOn(Date, 'now').mockReturnValue(mountTime);

    const { result } = renderHook(() => useNowOnScreenFocus());
    expect(result.current).toBe(mountTime);

    jest.spyOn(Date, 'now').mockReturnValue(focusTime);
    const focusCallback = useFocusEffect.mock.calls[0][0];
    act(() => {
      focusCallback();
    });

    expect(result.current).toBe(focusTime);
  });

  it('does not change the returned time without a focus event', () => {
    const mountTime = 1_700_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(mountTime);

    const { result, rerender } = renderHook(() => useNowOnScreenFocus());
    expect(result.current).toBe(mountTime);

    jest.spyOn(Date, 'now').mockReturnValue(mountTime + 60 * 60 * 1000);
    rerender();

    expect(result.current).toBe(mountTime);
  });
});
