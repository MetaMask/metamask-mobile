import { act, renderHook } from '@testing-library/react-native';
import type { RiveRef } from 'rive-react-native';
import {
  RIVE_REVEAL_FALLBACK_DELAY_MS,
  useRiveRevealTrigger,
} from './useRiveRevealTrigger';

const TRIGGER_NAME = 'startAnimation';

interface HookProps {
  artboardName: string;
  enabled: boolean;
  log: (message: string) => void;
}

const setUp = ({
  viewTag = 1 as number | null,
  artboardName = 'Artboard A',
  enabled = true,
  delayMs,
  attachRef = true,
}: {
  viewTag?: number | null;
  artboardName?: string;
  enabled?: boolean;
  delayMs?: number;
  attachRef?: boolean;
} = {}) => {
  const trigger = jest.fn();
  const log = jest.fn();
  const riveRef = {
    current: attachRef
      ? ({ trigger, viewTag: () => viewTag } as unknown as RiveRef)
      : null,
  };
  const props: HookProps = { artboardName, enabled, log };

  const { result, rerender, unmount } = renderHook(
    (currentProps: HookProps) =>
      useRiveRevealTrigger({
        riveRef,
        triggerName: TRIGGER_NAME,
        enabled: currentProps.enabled,
        artboardName: currentProps.artboardName,
        delayMs,
        log: currentProps.log,
      }),
    { initialProps: props },
  );

  return { trigger, log, riveRef, props, result, rerender, unmount };
};

const advanceBy = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

describe('useRiveRevealTrigger', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('dispatches the trigger on the load signal', () => {
    const { trigger, result } = setUp();

    act(() => result.current());

    expect(trigger).toHaveBeenCalledWith(TRIGGER_NAME);
  });

  it('does not dispatch again however often the view reports playing', () => {
    const { trigger, result } = setUp();

    act(() => result.current());
    act(() => result.current());
    act(() => result.current());

    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('dispatches from the fallback when the load signal never arrives', () => {
    const { trigger } = setUp();

    advanceBy(RIVE_REVEAL_FALLBACK_DELAY_MS);

    expect(trigger).toHaveBeenCalledWith(TRIGGER_NAME);
  });

  it('dispatches again on the load signal after an unconfirmed fallback attempt', () => {
    const { trigger, result } = setUp();

    // The fallback fires before the file is known to be loaded, so the runtime
    // may have dropped it silently; the load signal must still get its dispatch.
    advanceBy(RIVE_REVEAL_FALLBACK_DELAY_MS);
    act(() => result.current());

    expect(trigger).toHaveBeenCalledTimes(2);
  });

  it('does not dispatch from the fallback once the load signal has revealed', () => {
    const { trigger, result } = setUp();

    act(() => result.current());
    advanceBy(RIVE_REVEAL_FALLBACK_DELAY_MS);

    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('does not attempt the fallback twice when its timer is re-armed', () => {
    const { trigger, props, rerender } = setUp();

    advanceBy(RIVE_REVEAL_FALLBACK_DELAY_MS);
    // A fresh `log` re-creates the callback the fallback effect depends on,
    // which re-arms its timer against the same native view.
    rerender({ ...props, log: jest.fn() });
    advanceBy(RIVE_REVEAL_FALLBACK_DELAY_MS);

    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('does not fire while disabled', () => {
    const { trigger, result } = setUp({ enabled: false });

    act(() => result.current());
    advanceBy(RIVE_REVEAL_FALLBACK_DELAY_MS);

    expect(trigger).not.toHaveBeenCalled();
  });

  it('does not dispatch when there is no Rive ref', () => {
    const { trigger, result } = setUp({ attachRef: false });

    expect(() => act(() => result.current())).not.toThrow();
    expect(trigger).not.toHaveBeenCalled();
  });

  it('does not dispatch while the native view is detached', () => {
    const { trigger, log, result } = setUp({ viewTag: null });

    act(() => result.current());

    expect(trigger).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('reveal skipped: native view detached');
  });

  it('waits the requested delay before dispatching', () => {
    const { trigger, result } = setUp({ delayMs: 60 });

    act(() => result.current());
    expect(trigger).not.toHaveBeenCalled();

    advanceBy(60);

    expect(trigger).toHaveBeenCalledWith(TRIGGER_NAME);
  });

  it('replaces a delayed dispatch still pending from the fallback attempt', () => {
    const { trigger, result } = setUp({ delayMs: 60 });

    advanceBy(RIVE_REVEAL_FALLBACK_DELAY_MS);
    advanceBy(30);
    act(() => result.current());
    advanceBy(60);

    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('re-arms for the fresh native view mounted by an artboard swap', () => {
    const { trigger, props, result, rerender } = setUp();

    act(() => result.current());
    rerender({ ...props, artboardName: 'Artboard B' });
    act(() => result.current());

    expect(trigger).toHaveBeenCalledTimes(2);
  });

  it('re-arms for the fresh native view mounted when the reveal is re-enabled', () => {
    const { trigger, props, result, rerender } = setUp();

    act(() => result.current());
    rerender({ ...props, enabled: false });
    rerender({ ...props, enabled: true });
    act(() => result.current());

    expect(trigger).toHaveBeenCalledTimes(2);
  });

  it('drops the pending fallback when the hook unmounts', () => {
    const { trigger, unmount } = setUp();

    unmount();
    advanceBy(RIVE_REVEAL_FALLBACK_DELAY_MS);

    expect(trigger).not.toHaveBeenCalled();
  });

  it('drops the pending delayed dispatch when the hook unmounts', () => {
    const { trigger, result, unmount } = setUp({ delayMs: 60 });

    act(() => result.current());
    unmount();
    advanceBy(60);

    expect(trigger).not.toHaveBeenCalled();
  });
});
