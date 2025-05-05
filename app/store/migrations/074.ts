import { hasProperty, isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';

/**
 * Migration 74: Remove `tokens`, `detectedTokens`, and `ignoredTokens` from `TokensController`
 * remove `accounts` from `AccountTrackerController`
 * remove `tokenList` from `TokenListController`
 * reset KeyringController state to empty
 */

const migration = (state: unknown): unknown => {
  const migrationVersion = 74;
  console.log('============ Migration 74 START ============');

  if (!ensureValidState(state, migrationVersion)) {
    console.log('============ Migration 74 INVALID STATE ============');
    return state;
  }

  try {
    const backgroundState = state?.engine?.backgroundState;
    console.log('Has backgroundState:', Boolean(backgroundState));

    if (backgroundState) {
      if (
        hasProperty(backgroundState, 'TokensController') &&
        isObject(backgroundState.TokensController)
      ) {
        console.log('Cleaning TokensController');
        const tokensController = backgroundState.TokensController;
        delete tokensController.tokens;
        delete tokensController.detectedTokens;
        delete tokensController.ignoredTokens;
      }

      if (
        hasProperty(backgroundState, 'AccountTrackerController') &&
        isObject(backgroundState.AccountTrackerController)
      ) {
        console.log('Cleaning AccountTrackerController');
        const accountTrackerController =
          backgroundState.AccountTrackerController;
        delete accountTrackerController.accounts;
      }

      if (
        hasProperty(backgroundState, 'TokenListController') &&
        isObject(backgroundState.TokenListController)
      ) {
        console.log('Cleaning TokenListController');
        const tokenListController = backgroundState.TokenListController;
        delete tokenListController.tokenList;
      }

      if (
        hasProperty(backgroundState, 'KeyringController') &&
        isObject(backgroundState.KeyringController)
      ) {
        console.log('Resetting KeyringController state');
        backgroundState.KeyringController = {
          isUnlocked: false,
          keyrings: [],
          keyringsMetadata: [],
          vault: undefined,
        };
      }
    }

    console.log('============ Migration 74 COMPLETE ============');
    return state;
  } catch (error) {
    console.log('============ Migration 74 ERROR ============', error);
    captureException(
      new Error(`Migration ${migrationVersion} failed: ${error}`),
    );
    return state;
  }
};

export default migration;
