import { renderHook, act } from '@testing-library/react-native';
import type { RiveViewRef, ViewModelInstance } from '@rive-app/react-native';
import { useRiveRevealTrigger } from './useRiveRevealTrigger';

const mockTrigger = jest.fn();
const mockTriggerProperty = jest.fn(() => ({ trigger: mockTrigger }));
const mockPlayIfNeeded = jest.fn();
const mockLog = jest.fn();

const makeInstance = (): ViewModelInstance =>
  ({ triggerProperty: mockTriggerProperty }) as unknown as ViewModelInstance;

const makeViewRef = (): RiveViewRef =>
  ({ playIfNeeded: mockPlayIfNeeded }) as unknown as RiveViewRef;

interface HookProps {
  instance: ViewModelInstance | null;
  riveViewRef: RiveViewRef | null | undefined;
  enabled: boolean;
  artboardName: string;
  delayMs?: number;
}

const renderRevealTrigger = (overrides: Partial<HookProps> = {}) =>
  renderHook(
    (props: HookProps) =>
      useRiveRevealTrigger({
        triggerName: 'startAnimation',
        log: mockLog,
        ...props,
      }),
    {
      initialProps: {
        instance: makeInstance(),
        riveViewRef: makeViewRef(),
        enabled: true,
        artboardName: 'CardTiltDigital',
        ...overrides,
      },
    },
  );

describe('useRiveRevealTrigger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTriggerProperty.mockImplementation(() => ({ trigger: mockTrigger }));
  });

  it('fires the trigger and wakes the state machine once both readiness signals are up', () => {
    renderRevealTrigger();

    expect(mockTriggerProperty).toHaveBeenCalledWith('startAnimation');
    expect(mockTrigger).toHaveBeenCalledTimes(1);
    expect(mockPlayIfNeeded).toHaveBeenCalledTimes(1);
  });

  it('fires only once across re-renders', () => {
    const { rerender } = renderRevealTrigger();

    rerender({
      instance: makeInstance(),
      riveViewRef: makeViewRef(),
      enabled: true,
      artboardName: 'CardTiltDigital',
    });

    expect(mockTrigger).toHaveBeenCalledTimes(1);
  });

  it('does not fire while disabled', () => {
    renderRevealTrigger({ enabled: false });

    expect(mockTrigger).not.toHaveBeenCalled();
  });

  it('defers the reveal until the view model instance resolves', () => {
    const { rerender } = renderRevealTrigger({ instance: null });

    expect(mockTrigger).not.toHaveBeenCalled();

    rerender({
      instance: makeInstance(),
      riveViewRef: makeViewRef(),
      enabled: true,
      artboardName: 'CardTiltDigital',
    });

    expect(mockTrigger).toHaveBeenCalledTimes(1);
  });

  it('defers the reveal until the native view becomes ready', () => {
    const { rerender } = renderRevealTrigger({ riveViewRef: null });

    expect(mockTrigger).not.toHaveBeenCalled();

    rerender({
      instance: makeInstance(),
      riveViewRef: makeViewRef(),
      enabled: true,
      artboardName: 'CardTiltDigital',
    });

    expect(mockTrigger).toHaveBeenCalledTimes(1);
  });

  it('logs and skips when the trigger property is not authored', () => {
    mockTriggerProperty.mockImplementation(
      () => null as unknown as { trigger: jest.Mock },
    );

    renderRevealTrigger();

    expect(mockLog).toHaveBeenCalledWith(
      'reveal skipped: trigger property not found',
    );
    expect(mockTrigger).not.toHaveBeenCalled();
    expect(mockPlayIfNeeded).not.toHaveBeenCalled();
  });

  it('fires again when the artboard changes', () => {
    const { rerender } = renderRevealTrigger();

    rerender({
      instance: makeInstance(),
      riveViewRef: makeViewRef(),
      enabled: true,
      artboardName: 'CardTiltMetal',
    });

    expect(mockTrigger).toHaveBeenCalledTimes(2);
  });

  it('fires again after being disabled and re-enabled', () => {
    const { rerender } = renderRevealTrigger();

    rerender({
      instance: makeInstance(),
      riveViewRef: makeViewRef(),
      enabled: false,
      artboardName: 'CardTiltDigital',
    });
    rerender({
      instance: makeInstance(),
      riveViewRef: makeViewRef(),
      enabled: true,
      artboardName: 'CardTiltDigital',
    });

    expect(mockTrigger).toHaveBeenCalledTimes(2);
  });

  describe('delayMs', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('waits the requested delay before firing', () => {
      renderRevealTrigger({ delayMs: 60 });

      expect(mockTrigger).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(60);
      });

      expect(mockTrigger).toHaveBeenCalledTimes(1);
      expect(mockPlayIfNeeded).toHaveBeenCalledTimes(1);
    });

    it('cancels a pending delayed reveal on unmount without consuming it', () => {
      const { unmount } = renderRevealTrigger({ delayMs: 60 });

      unmount();
      act(() => {
        jest.advanceTimersByTime(60);
      });

      expect(mockTrigger).not.toHaveBeenCalled();
    });
  });
});
