import {
  useCallback,
  useContext,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { RegistryContext, SlotContext } from './context';

function resolveNextState<T>(action: SetStateAction<T>, previous: T): T {
  if (typeof action === 'function') {
    return (action as (value: T) => T)(previous);
  }
  return action;
}

function warnIfNotSerializable(value: unknown) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  if (
    value === undefined ||
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    typeof value === 'bigint'
  ) {
    console.warn('useActivityState values must be JSON-serializable');
    return;
  }
  try {
    JSON.stringify(value);
  } catch {
    console.warn('useActivityState values must be JSON-serializable');
  }
}

export function useActivityState<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const registry = useContext(RegistryContext);
  const slot = useContext(SlotContext);
  const joined = slot?.joined ?? false;
  const slotId = slot?.id;

  const [value, setValue] = useState<T>(() => {
    if (!registry || !joined || slotId === undefined) {
      return initialValue;
    }
    if (!registry.hasSlotState(slotId, key)) {
      return initialValue;
    }
    return registry.getSlotState(slotId, key) as T;
  });

  const setActivityState = useCallback(
    (action: SetStateAction<T>) => {
      setValue((previous) => {
        const next = resolveNextState(action, previous);
        if (registry && joined && slotId !== undefined) {
          warnIfNotSerializable(next);
          registry.setSlotState(slotId, key, next);
        }
        return next;
      });
    },
    [registry, joined, slotId, key],
  );

  if (!registry) {
    throw new Error('useActivityState must be used within ActivityScrollView');
  }
  if (!slot) {
    throw new Error('useActivityState must be used within ActivitySlot');
  }

  return [value, setActivityState];
}
