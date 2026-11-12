import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

export const migrationVersion = 163;

/** Preserve pending purchases and holdings when the feature/controller is renamed. */
export default function migration(state: unknown): unknown {
  if (!ensureValidState(state, migrationVersion)) return state;
  const background = state.engine.backgroundState;
  if (
    !hasProperty(background, 'GachaController') ||
    !isObject(background.GachaController)
  )
    return state;
  // Never overwrite an already migrated controller, including an empty reset.
  if (hasProperty(background, 'CollectiblesController')) return state;
  const { GachaController: legacy, ...remainingControllers } = background;
  return {
    ...state,
    engine: {
      ...state.engine,
      backgroundState: {
        ...remainingControllers,
        CollectiblesController: legacy,
      },
    },
  };
}
