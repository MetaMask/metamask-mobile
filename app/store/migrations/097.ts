import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import { hasProperty, isObject } from '@metamask/utils';

// Example MM SDK channel ID: 217e651d-6d18-49ef-b929-8773496c11df
// Example WC channel ID: 901035548d5fae607be1f7ebff2aff0617b9d16fd0ad7b93e2e94647de06a07b
// This seems naive, but probably covers majority of scenarios
const isHostname = (value: string) =>
  !value.startsWith('npm:') && (value === 'localhost' || value.includes('.'));

/**
 * Migration to update hostname keyed PermissionController
 * and SelectedNetworkController entries to origin.
 *
 * Note that this makes a best guess by assuming the dapp is served
 * via https on the default port. The worst case scenario is that this
 * is an incorrect assumption, forcing the user to re-establish permissions.
 * @param state - The current MetaMask mobile state.
 * @returns Migrated Redux state.
 */
export default function migrate(state: unknown) {
  const version = 97;

  // Ensure the state is valid for migration
  if (!ensureValidState(state, version)) {
    return state;
  }

  const { backgroundState } = state.engine;

  if (
    !hasProperty(backgroundState, 'PermissionController') ||
    !isObject(backgroundState.PermissionController)
  ) {
    captureException(
      new Error(
        `Migration ${version}: typeof state.PermissionController is ${typeof backgroundState.PermissionController}`,
      ),
    );
    return state;
  }

  const {
    PermissionController: { subjects },
  } = backgroundState;

  if (!isObject(subjects)) {
    captureException(
      new Error(
        `Migration ${version}: typeof state.PermissionController.subjects is ${typeof subjects}`,
      ),
    );
    return state;
  }

  if (
    !hasProperty(backgroundState, 'SelectedNetworkController') ||
    !isObject(backgroundState.SelectedNetworkController)
  ) {
    captureException(
      new Error(
        `Migration ${version}: typeof state.SelectedNetworkController is ${typeof backgroundState.SelectedNetworkController}`,
      ),
    );
    return state;
  }

  const {
    SelectedNetworkController: { domains },
  } = backgroundState;

  if (!isObject(domains)) {
    captureException(
      new Error(
        `Migration ${version}: typeof state.SelectedNetworkController.domains is ${typeof domains}`,
      ),
    );
    return state;
  }

  const newSubjects: Record<string, unknown> = {};
  for (const [origin, subject] of Object.entries(subjects)) {
    if (!isHostname(origin) || !isObject(subject)) {
      newSubjects[origin] = subject;
      continue;
    }

    const { permissions } = subject;
    if (!isObject(permissions)) {
      newSubjects[origin] = subject;
      continue;
    }
    const newOrigin = `https://${origin}`;

    const newPermissions: Record<string, unknown> = {};

    for (const [name, permission] of Object.entries(permissions)) {
      if (!isObject(permission)) {
        newPermissions[name] = permission;
        continue;
      }

      newPermissions[name] = {
        ...permission,
        invoker: newOrigin,
      };
    }

    newSubjects[newOrigin] = {
      ...subject,
      origin: newOrigin,
      permissions: newPermissions,
    };
  }
  backgroundState.PermissionController.subjects = newSubjects;

  const newDomains: Record<string, unknown> = {};
  for (const [origin, networkClientId] of Object.entries(domains)) {
    if (!isHostname(origin)) {
      newDomains[origin] = networkClientId;
      continue;
    }

    const newOrigin = `https://${origin}`;
    newDomains[newOrigin] = networkClientId;
  }
  backgroundState.SelectedNetworkController.domains = newDomains;

  return state;
}
