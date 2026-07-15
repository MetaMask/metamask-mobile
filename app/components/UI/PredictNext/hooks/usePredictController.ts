import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PredictController } from '../controller/PredictController';
import type { Observable } from '../session/Observable';

const PredictControllerContext = createContext<PredictController | null>(null);

export const PredictControllerProvider = PredictControllerContext.Provider;

export function usePredictController(): PredictController {
  const controller = useContext(PredictControllerContext);
  if (!controller) {
    throw new Error('usePredictController must be used inside PredictControllerProvider');
  }
  return controller;
}

/** Subscribe a React component to any Observable<S> state. */
export function useObservableState<S>(observable: Observable<S>): S {
  const [state, setState] = useState<S>(() => observable.getState());
  useEffect(() => observable.subscribe(setState), [observable]);
  return state;
}

/** Convenience helper for stable derived selectors. */
export function useObservableSelector<S, R>(
  observable: Observable<S>,
  selector: (state: S) => R,
): R {
  const state = useObservableState(observable);
  return useMemo(() => selector(state), [state, selector]);
}
