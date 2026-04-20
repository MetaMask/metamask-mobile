import { renderHook, act } from '@testing-library/react-hooks';
import {
  notificationAsync,
  NotificationFeedbackType,
  impactAsync,
  ImpactFeedbackStyle,
  selectionAsync,
} from 'expo-haptics';
import { useSelector } from 'react-redux';
import { ImpactMoment } from '../catalog';
import { useHaptics } from '../useHaptics';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('useHaptics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setupSelectors(hapticsEnabled: boolean, killSwitchActive: boolean) {
    const values = [hapticsEnabled, killSwitchActive];
    mockUseSelector.mockImplementation((_selector) => {
      // useHaptics calls useSelector twice: first for hapticsEnabled, then killSwitch.
      // Return matching value based on call order within each render.
      const idx = mockUseSelector.mock.calls.length - 1;
      return values[idx % 2];
    });
  }

  it('returns stable function references across re-renders', () => {
    setupSelectors(true, false);
    const { result, rerender } = renderHook(() => useHaptics());
    const first = result.current;
    rerender();
    const second = result.current;

    expect(first.playSuccessNotification).toBe(second.playSuccessNotification);
    expect(first.playErrorNotification).toBe(second.playErrorNotification);
    expect(first.playImpact).toBe(second.playImpact);
    expect(first.playSelection).toBe(second.playSelection);
  });

  it('plays success notification when enabled', async () => {
    setupSelectors(true, false);
    const { result } = renderHook(() => useHaptics());

    await act(async () => {
      await result.current.playSuccessNotification();
    });

    expect(notificationAsync).toHaveBeenCalledWith(
      NotificationFeedbackType.Success,
    );
  });

  it('plays error notification when enabled', async () => {
    setupSelectors(true, false);
    const { result } = renderHook(() => useHaptics());

    await act(async () => {
      await result.current.playErrorNotification();
    });

    expect(notificationAsync).toHaveBeenCalledWith(
      NotificationFeedbackType.Error,
    );
  });

  it('plays impact when enabled', async () => {
    setupSelectors(true, false);
    const { result } = renderHook(() => useHaptics());

    await act(async () => {
      await result.current.playImpact(ImpactMoment.TabChange);
    });

    expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Medium);
  });

  it('plays selection when enabled', async () => {
    setupSelectors(true, false);
    const { result } = renderHook(() => useHaptics());

    await act(async () => {
      await result.current.playSelection();
    });

    expect(selectionAsync).toHaveBeenCalled();
  });

  it('does not play when haptics disabled', async () => {
    setupSelectors(false, false);
    const { result } = renderHook(() => useHaptics());

    await act(async () => {
      await result.current.playSuccessNotification();
    });

    expect(notificationAsync).not.toHaveBeenCalled();
  });

  it('does not play when kill switch is active', async () => {
    setupSelectors(true, true);
    const { result } = renderHook(() => useHaptics());

    await act(async () => {
      await result.current.playSuccessNotification();
    });

    expect(notificationAsync).not.toHaveBeenCalled();
  });
});
