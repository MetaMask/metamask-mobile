import { useCallback, useMemo, useRef, useState } from 'react';

export interface InFlightIds {
  /** Sync check against the ref — preferred for guarding concurrent starts. */
  has: (id: string) => boolean;
  add: (id: string) => void;
  remove: (id: string) => void;
  /** Reactive set for UI (spinners, disabled state). */
  ids: ReadonlySet<string>;
}

/**
 * Dual-tracks in-flight ids via a ref (sync guards) and React state (re-renders).
 * Use when the same set of ids must both block duplicate requests and drive UI.
 */
const useInFlightIds = (): InFlightIds => {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());
  const inFlightRef = useRef(new Set<string>());

  const has = useCallback((id: string) => inFlightRef.current.has(id), []);

  const add = useCallback((id: string) => {
    inFlightRef.current.add(id);
    setIds((prev) => new Set(prev).add(id));
  }, []);

  const remove = useCallback((id: string) => {
    inFlightRef.current.delete(id);
    setIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return useMemo(() => ({ has, add, remove, ids }), [has, add, remove, ids]);
};

export default useInFlightIds;
