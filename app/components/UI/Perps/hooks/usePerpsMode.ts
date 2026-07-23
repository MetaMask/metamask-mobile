import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { PerpsMode } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import { selectPerpsMode } from '../selectors/perpsController';

export interface UsePerpsModeReturn {
  /** Current Perps interface mode (Lite ⇄ Pro) from shared controller state. */
  mode: PerpsMode;
  /** Persist the selected mode on the shared PerpsController state. */
  setMode: (mode: PerpsMode) => void;
}

/**
 * Read and update the shared Perps Lite/Pro mode (TAT-3551 / TAT-3582).
 *
 * The mode lives on `PerpsController` state so every entry point (Trade menu,
 * Perps home header, Market header) stays in sync and the choice persists
 * across restarts.
 */
export const usePerpsMode = (): UsePerpsModeReturn => {
  const mode = useSelector(selectPerpsMode);

  const setMode = useCallback((nextMode: PerpsMode) => {
    Engine.context.PerpsController.setPerpsMode(nextMode);
  }, []);

  return { mode, setMode };
};
