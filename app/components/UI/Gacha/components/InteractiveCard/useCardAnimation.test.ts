import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, AppState, type AppStateStatus } from 'react-native';
import {
  cancelAnimation,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useCardAnimation } from './useCardAnimation';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    ...actual,
    withTiming: jest.fn((value: number) => value),
    withSequence: jest.fn(() => 0),
    withDelay: jest.fn(() => 0),
    withRepeat: jest.fn(() => 0),
    cancelAnimation: jest.fn(actual.cancelAnimation),
  };
});

const OPTIONS = {
  isActive: true,
  canFlip: true,
  width: 260,
  resetKey: 'card-1',
};
const INITIAL_APP_STATE = AppState.currentState;

describe('useCardAnimation', () => {
  let changeAppState: (state: AppStateStatus) => void;
  let changeReduceMotion: (value: boolean) => void;
  const removeAppListener = jest.fn();
  const removeMotionListener = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    AppState.currentState = 'active';
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_, listener) => {
        changeAppState = listener;
        return { remove: removeAppListener };
      });
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockImplementation((_, listener) => {
        changeReduceMotion = listener as unknown as (value: boolean) => void;
        return { remove: removeMotionListener } as unknown as ReturnType<
          typeof AccessibilityInfo.addEventListener
        >;
      });
  });

  afterEach(() => {
    AppState.currentState = INITIAL_APP_STATE;
    jest.restoreAllMocks();
  });

  it('keeps reduced-motion users free of decorative loops and flips instantly', async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockResolvedValue(true);
    const { result } = renderHook(() => useCardAnimation(OPTIONS));

    await act(async () => result.current.flipCard());

    expect(result.current.isFlipped).toBe(true);
    expect(withRepeat).not.toHaveBeenCalled();
    expect(withTiming).toHaveBeenLastCalledWith(
      180,
      expect.objectContaining({ duration: 0 }),
    );
  });

  it('stops its active loops when reduced motion is enabled', async () => {
    renderHook(() => useCardAnimation(OPTIONS));
    await waitFor(() => expect(withRepeat).toHaveBeenCalled());
    jest.mocked(cancelAnimation).mockClear();
    jest.mocked(withRepeat).mockClear();

    act(() => changeReduceMotion(true));

    expect(cancelAnimation).toHaveBeenCalled();
    expect(withRepeat).not.toHaveBeenCalled();
  });

  it('cancels motion in the background and releases listeners on unmount', async () => {
    const { unmount } = renderHook(() => useCardAnimation(OPTIONS));
    await waitFor(() => expect(withRepeat).toHaveBeenCalled());
    jest.mocked(cancelAnimation).mockClear();
    jest.mocked(withRepeat).mockClear();

    act(() => changeAppState('background'));

    expect(cancelAnimation).toHaveBeenCalled();
    expect(withRepeat).not.toHaveBeenCalled();

    act(() => changeAppState('active'));
    expect(withRepeat).toHaveBeenCalled();
    jest.mocked(cancelAnimation).mockClear();
    unmount();
    expect(cancelAnimation).toHaveBeenCalled();
    expect(removeAppListener).toHaveBeenCalledTimes(1);
    expect(removeMotionListener).toHaveBeenCalledTimes(1);
  });
});
