import { isObject, hasProperty } from '@metamask/utils';
import { captureException } from '@sentry/react-native';

enum PrimaryCurrency {
  ETH = 'ETH',
  Fiat = 'Fiat',
}

/**
 * Migrate back to set primaryCurrency as 'ETH' by default
 *
 * @param {unknown} state - Redux state
 * @returns
 */
export default function migrate(state: unknown) {
  if (!isObject(state)) {
    captureException(
      new Error(`Migration 30: Invalid state: '${typeof state}'`),
    );
    return state;
  }

  if (!isObject(state.settings)) {
    captureException(
      new Error(
        `Migration 30: Invalid settings state: '${typeof state.settings}'`,
      ),
    );
    return state;
  }

  if (!hasProperty(state.settings, 'primaryCurrency')) {
    captureException(
      new Error(
        `Migration 30: Invalid state settings parameter: '${JSON.stringify(
          state.settings,
        )}'`,
      ),
    );
    return state;
  }

  if (!state.settings.primaryCurrency) {
    return state;
  }

  state.settings.primaryCurrency = PrimaryCurrency.ETH;
  return state;
}
