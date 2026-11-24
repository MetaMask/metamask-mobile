// PROTOTYPE-DO-NOT-MERGE
import { useSyncExternalStore } from 'react';
import {
  getKalshiPrototypeRuntime,
  isKalshiPrototypeActive,
  subscribeToKalshiPrototype,
} from './prototypeRuntime';

/**
 * The prototype's runtime state, reactively. Screens read it to decide what
 * the fakes are showing.
 *
 * @returns The current runtime state.
 */
export const useKalshiPrototypeRuntime = () =>
  useSyncExternalStore(subscribeToKalshiPrototype, getKalshiPrototypeRuntime);

/**
 * Whether the prototype is on, reactively.
 *
 * @returns Whether the prototype is active.
 */
export const useKalshiPrototypeActive = () => {
  useKalshiPrototypeRuntime();
  return isKalshiPrototypeActive();
};
