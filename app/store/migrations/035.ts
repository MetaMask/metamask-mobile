import { isObject, hasProperty } from '@metamask/utils';
import { captureException } from '@sentry/react-native';

export enum PrimaryCurrency {
  ETH = 'ETH',
}

/**
 * Migrate back to set primaryCurrency as 'ETH' by default
 *
 * @param {unknown} state - Redux state
 * @returns
 */
export default async function migrate(stateAsync: unknown) {
  const state = await stateAsync;
  if (!isObject(state)) {
    captureException(
      new Error(`Migration 35: Invalid state: '${typeof state}'`),
    );
    return state;
  }

  if (!isObject(state.settings)) {
    captureException(
      new Error(
        `Migration 35: Invalid settings state: '${typeof state.settings}'`,
      ),
    );
    return state;
  }

  if (!hasProperty(state.settings, 'primaryCurrency')) {
    captureException(
      new Error(
        `Migration 35: state.settings.primaryCurrency does not exist: '${JSON.stringify(
          state.settings,
        )}'`,
      ),
    );
  }

  state.settings.primaryCurrency = PrimaryCurrency.ETH;
  return state;
}
