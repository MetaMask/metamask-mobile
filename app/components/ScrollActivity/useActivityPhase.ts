import { useCallback, useContext, useSyncExternalStore } from 'react';
import { RegistryContext, SlotContext } from './context';
import type { ActivityPhase } from './types';

export function useActivityPhase(): ActivityPhase {
  const registry = useContext(RegistryContext);
  const slot = useContext(SlotContext);
  const joined = slot?.joined ?? false;
  const slotId = slot?.id;

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!registry || !joined || slotId === undefined) {
        return () => undefined;
      }
      return registry.subscribe(slotId, listener);
    },
    [registry, joined, slotId],
  );

  const getSnapshot = useCallback((): ActivityPhase => {
    if (!registry || !joined || slotId === undefined) {
      return 'active';
    }
    return registry.getPhase(slotId);
  }, [registry, joined, slotId]);

  const phase = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (!registry) {
    throw new Error('useActivityPhase must be used within ActivityScrollView');
  }
  if (!slot) {
    throw new Error('useActivityPhase must be used within ActivitySlot');
  }
  return phase;
}
