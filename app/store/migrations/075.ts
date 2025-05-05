import { captureException } from '@sentry/react-native';
import { RootState } from '../../reducers';

const  migration = (state: unknown):unknown => {
  console.log('============ Migration 75 START ============');
  console.log('State type:', typeof state);
  console.log('Has engine:', Boolean((state as any)?.engine));
  console.log('Has backgroundState:', Boolean((state as any)?.engine?.backgroundState));
  console.log('Has KeyringController:', Boolean((state as any)?.engine?.backgroundState?.KeyringController));
  
  if (typeof state !== 'object' || state === null) {
    console.log('============ Migration 75 INVALID STATE ============');
    captureException(
      new Error(`Migration 75: Invalid root state: root state is not an object`),
    );
    return state;
  }

  const typedState = state as RootState;
  if (!typedState.engine?.backgroundState?.KeyringController) {
    console.log('============ Migration 75 NO KEYRING CONTROLLER ============');
    return state;
  }

  console.log('============ Migration 75 MODIFYING STATE ============');
  typedState.engine.backgroundState.KeyringController = {
    isUnlocked: false,
    keyrings: [],
    keyringsMetadata: [],
    vault: undefined,
  };

  console.log('============ Migration 75 COMPLETE ============');
  return state;
} 

export default migration;