import { isObject } from '@metamask/utils';
import { captureErrorException } from '../../../util/sentry';

export interface ValidState {
  engine: {
    backgroundState: Record<string, unknown>;
  };
  settings: Record<string, unknown>;
}

export function ensureValidState<T>(
  state: T,
  migrationNumber: number,
): state is T & ValidState {
  if (!isObject(state)) {
    captureErrorException(
      new Error(
        `FATAL ERROR: Migration ${migrationNumber}: Invalid state error: '${typeof state}'`,
      ),
    );
    return false;
  }

  if (!isObject(state.engine)) {
    captureErrorException(
      new Error(
        `FATAL ERROR: Migration ${migrationNumber}: Invalid engine state error: '${typeof state.engine}'`,
      ),
    );
    return false;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureErrorException(
      new Error(
        `FATAL ERROR: Migration ${migrationNumber}: Invalid engine backgroundState error: '${typeof state
          .engine.backgroundState}'`,
      ),
    );
    return false;
  }

  return true;
}
