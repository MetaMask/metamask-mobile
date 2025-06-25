import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';
import { ensureValidState } from './util';
import { hasProperty, isObject } from '@metamask/utils';

// In-lined from @metamask/multichain
const Caip25CaveatType = 'authorizedScopes';
const Caip25EndowmentPermissionName = 'endowment:caip25';

/**
 * Migration to add sessionProperties property to CAIP-25 permission caveats
 * @param state - The current MetaMask mobile state.
 * @returns Migrated Redux state.
 */
export default function migrate(oldState: unknown) {
  const version = 79;

  // Ensure the state is valid for migration
  if (!ensureValidState(oldState, version)) {
    return oldState;
  }

  const newState = cloneDeep(oldState);
  const { backgroundState } = newState.engine;

  if (
    !hasProperty(backgroundState, 'PermissionController') ||
    !isObject(backgroundState.PermissionController)
  ) {
    captureException(
      new Error(
        `Migration ${version}: typeof state.PermissionController is ${typeof backgroundState.PermissionController}`,
      ),
    );
    return oldState;
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
    return oldState;
  }

  for (const subject of Object.values(subjects)) {
    if (
      !isObject(subject) ||
      !hasProperty(subject, 'permissions') ||
      !isObject(subject.permissions)
    ) {
      continue;
    }

    const { permissions } = subject;
    const caip25Permission = permissions[Caip25EndowmentPermissionName];

    if (
      !isObject(caip25Permission) ||
      !Array.isArray(caip25Permission.caveats)
    ) {
      continue;
    }

    const caip25Caveat = caip25Permission.caveats.find(
      (caveat) => caveat.type === Caip25CaveatType,
    );

    if (
      caip25Caveat &&
      isObject(caip25Caveat.value) &&
      !hasProperty(caip25Caveat.value, 'sessionProperties')
    ) {
      caip25Caveat.value.sessionProperties = {};
    }
  }

  return newState;
}
