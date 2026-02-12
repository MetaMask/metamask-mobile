import { renderHook, act } from '@testing-library/react-native';
import { useOnboardingChecklist, UI_MODE, STEP3_VARIATION } from './useOnboardingChecklist';

describe('useOnboardingChecklist', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useOnboardingChecklist());

    expect(result.current.uiMode).toBe(UI_MODE.BANNER);
    expect(result.current.step3Variation).toBe(STEP3_VARIATION.MULTI);
    expect(result.current.isDismissed).toBe(false);
    expect(result.current.steps).toEqual({
      step1: false,
      step2: false,
      step3: false,
    });
  });

  it('should toggle UI mode', () => {
    const { result } = renderHook(() => useOnboardingChecklist());

    act(() => {
      result.current.toggleUiMode();
    });

    expect(result.current.uiMode).toBe(UI_MODE.FLOATING);

    act(() => {
      result.current.toggleUiMode();
    });

    expect(result.current.uiMode).toBe(UI_MODE.BANNER);
  });

  it('should toggle step3 variation', () => {
    const { result } = renderHook(() => useOnboardingChecklist());

    act(() => {
      result.current.toggleStep3Variation();
    });

    expect(result.current.step3Variation).toBe(STEP3_VARIATION.SINGLE);

    act(() => {
      result.current.toggleStep3Variation();
    });

    expect(result.current.step3Variation).toBe(STEP3_VARIATION.MULTI);
  });

  it('should dismiss the checklist', () => {
    const { result } = renderHook(() => useOnboardingChecklist());

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.isDismissed).toBe(true);
  });

  it('should reset the state', () => {
    const { result } = renderHook(() => useOnboardingChecklist());

    act(() => {
      result.current.dismiss();
      result.current.toggleUiMode();
    });

    expect(result.current.isDismissed).toBe(true);
    expect(result.current.uiMode).toBe(UI_MODE.FLOATING);

    act(() => {
      result.current.reset();
    });

    expect(result.current.isDismissed).toBe(false);
    expect(result.current.uiMode).toBe(UI_MODE.BANNER);
    expect(result.current.steps.step1).toBe(false);
  });
});
