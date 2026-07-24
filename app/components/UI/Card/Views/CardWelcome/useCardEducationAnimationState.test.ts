import { AccessibilityInfo } from 'react-native';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import Logger from '../../../../../util/Logger';
import { useCardEducationAnimationState } from './useCardEducationAnimationState';
import { selectMoneyCardEducationAnimationEnabledFlag } from '../../../Money/selectors/featureFlags';

const mockUseSelector = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('../../../Money/selectors/featureFlags', () => ({
  selectMoneyCardEducationAnimationEnabledFlag: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('useCardEducationAnimationState', () => {
  const mockRemove = jest.fn();
  let capturedListener: ((enabled: boolean) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedListener = undefined;
    mockUseSelector.mockReturnValue(true);

    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);

    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockImplementation((_event, listener) => {
        capturedListener = listener as unknown as (enabled: boolean) => void;
        return { remove: mockRemove } as never;
      });
  });

  it('reads the card education animation feature flag selector', () => {
    renderHook(() => useCardEducationAnimationState());

    expect(mockUseSelector).toHaveBeenCalledWith(
      selectMoneyCardEducationAnimationEnabledFlag,
    );
  });

  it("returns 'static' when the feature flag is disabled regardless of reduce motion", () => {
    mockUseSelector.mockReturnValue(false);
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useCardEducationAnimationState());

    expect(result.current).toBe('static');
  });

  it("returns 'pending' before the reduce motion check resolves when the flag is enabled", () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useCardEducationAnimationState());

    expect(result.current).toBe('pending');
  });

  it("returns 'animate' once the check reports reduce motion is off", async () => {
    const { result } = renderHook(() => useCardEducationAnimationState());

    await waitFor(() => expect(result.current).toBe('animate'));
  });

  it("returns 'static' once the check reports reduce motion is on", async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);

    const { result } = renderHook(() => useCardEducationAnimationState());

    await waitFor(() => expect(result.current).toBe('static'));
  });

  it("flips from 'animate' to 'static' when the reduceMotionChanged event enables reduce motion", async () => {
    const { result } = renderHook(() => useCardEducationAnimationState());
    await waitFor(() => expect(result.current).toBe('animate'));

    act(() => {
      capturedListener?.(true);
    });

    expect(result.current).toBe('static');
  });

  it("flips from 'static' to 'animate' when the reduceMotionChanged event disables reduce motion", async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);

    const { result } = renderHook(() => useCardEducationAnimationState());
    await waitFor(() => expect(result.current).toBe('static'));

    act(() => {
      capturedListener?.(false);
    });

    expect(result.current).toBe('animate');
  });

  it("returns 'static' and logs when the reduce motion check rejects", async () => {
    const error = new Error('accessibility bridge unavailable');
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockRejectedValue(error);

    const { result } = renderHook(() => useCardEducationAnimationState());

    await waitFor(() => expect(result.current).toBe('static'));
    expect(Logger.error).toHaveBeenCalledWith(
      error,
      '[Card Education Animation] Failed to read reduce motion setting',
    );
  });

  it('removes the reduceMotionChanged listener on unmount', () => {
    const { unmount } = renderHook(() => useCardEducationAnimationState());

    unmount();

    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
