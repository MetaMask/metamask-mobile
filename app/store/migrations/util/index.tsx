import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';

interface ValidState {
  engine: {
    backgroundState: Record<string, unknown>;
  };
}

// eslint-disable-next-line import/prefer-default-export
export function ensureValidState<T>(
  state: T,
  migrationNumber: number,
): state is T & ValidState {
  if (!isObject(state)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration ${migrationNumber}: Invalid state error: '${typeof state}'`,
      ),
    );
    return false;
  }

  if (!isObject(state.engine)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration ${migrationNumber}: Invalid engine state error: '${typeof state.engine}'`,
      ),
    );
    return false;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration ${migrationNumber}: Invalid engine backgroundState error: '${typeof state
          .engine.backgroundState}'`,
      ),
    );
    return false;
  }

  return true;
}
