import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

/**
 * Migration 83: Remove Automatic Security Checks state
 *
 * This migration removes the automatic security checks state from the security state.
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = '085';

  if (!ensureValidState(state, Number(migrationVersion))) {
    return state;
  }

  try {
    if (
      !hasProperty(state, 'engine') ||
      !isObject(state.engine) ||
      !hasProperty(state.engine, 'backgroundState') ||
      !isObject(state.engine.backgroundState)
    ) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid engine state structure`,
        ),
      );
      return state;
    }

    if (
      !hasProperty(state.engine.backgroundState, 'security') ||
      !isObject(state.engine.backgroundState.security)
    ) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid security state: '${JSON.stringify(
            state.engine.backgroundState.security,
          )}'`,
        ),
      );
      return state;
    }

    if (
      hasProperty(
        state.engine.backgroundState.security,
        'automaticSecurityChecksEnabled',
      )
    ) {
      delete state.engine.backgroundState.security
        .automaticSecurityChecksEnabled;
    }

    if (
      hasProperty(
        state.engine.backgroundState.security,
        'hasUserSelectedAutomaticSecurityCheckOption',
      )
    ) {
      delete state.engine.backgroundState.security
        .hasUserSelectedAutomaticSecurityCheckOption;
    }

    if (
      hasProperty(
        state.engine.backgroundState.security,
        'isAutomaticSecurityChecksModalOpen',
      )
    ) {
      delete state.engine.backgroundState.security
        .isAutomaticSecurityChecksModalOpen;
    }

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: cleaning security state failed with error: ${error}`,
      ),
    );
    return state;
  }
};

export default migration;
