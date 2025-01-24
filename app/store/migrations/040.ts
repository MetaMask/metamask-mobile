import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration to remove metadata from Permissioned accounts
 *
 * @param state Persisted Redux state
 * @returns
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, 40)) {
    return state;
  }

  const permissionControllerState =
    state.engine.backgroundState.PermissionController;

  if (!isObject(permissionControllerState)) {
    captureException(
      new Error(
        `Migration 40: Invalid PermissionController state error: '${JSON.stringify(
          permissionControllerState,
        )}'`,
      ),
    );
    return state;
  }

  if (
    hasProperty(permissionControllerState, 'subjects') &&
    isObject(permissionControllerState.subjects)
  ) {
    for (const origin in permissionControllerState.subjects) {
      const subject = permissionControllerState.subjects[origin];
      if (isObject(subject) && hasProperty(subject, 'permissions')) {
        const permissions = subject.permissions;
        if (isObject(permissions) && hasProperty(permissions, 'eth_accounts')) {
          const ethAccounts = permissions.eth_accounts;
          if (
            isObject(ethAccounts) &&
            hasProperty(ethAccounts, 'caveats') &&
            Array.isArray(ethAccounts.caveats)
          ) {
            ethAccounts.caveats = ethAccounts.caveats.map((caveat) => ({
              ...caveat,
              value: caveat.value.map(
                ({ address }: { address: string }) => address,
              ),
            }));
          }
        }
      }
    }
  }

  return state;
}
