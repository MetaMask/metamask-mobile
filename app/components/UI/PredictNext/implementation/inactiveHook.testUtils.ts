import type { ComponentType, ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react-native';

interface InactiveHookExpectation {
  /** Calls the inactive implementation's hook with `enabled: false`. */
  useInactiveHook: () => unknown;
  /** Mocks for every side effect the hook runs while enabled. */
  sideEffects: readonly jest.MockInstance<unknown, never[]>[];
  wrapper?: ComponentType<{ children: ReactNode }>;
}

/**
 * Asserts the projection hook pattern: the inactive implementation's hook
 * mounts, re-renders, settles, and unmounts without running a side effect.
 */
export const expectInactiveHookHasNoSideEffects = async ({
  useInactiveHook,
  sideEffects,
  wrapper,
}: InactiveHookExpectation) => {
  const { rerender, unmount } = renderHook(useInactiveHook, { wrapper });
  rerender(undefined);
  await act(async () => {
    await Promise.resolve();
  });
  unmount();

  for (const sideEffect of sideEffects) {
    expect(sideEffect).not.toHaveBeenCalled();
  }
};
