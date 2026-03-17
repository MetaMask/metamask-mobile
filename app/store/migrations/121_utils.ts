import { hasProperty, isObject } from '@metamask/utils';
import { ValidState } from './util';
import { captureException } from '@sentry/react-native';

export interface StateNECWithNativeAssetIdentifiers {
  engine: {
    backgroundState: {
      NetworkEnablementController: {
        nativeAssetIdentifiers: { [key: string]: string };
      };
    };
  };
}

// DO NOT MODIFY (copy for your own migration if needed).
// The goal of this file is to centralize some logic that may already exist
// in some other migration but for which we accept the fact that they are
// repeated instead of being refactored.
// Introducing "common functions" in migration may be a bad practice
// because changes in them would affect multiple migrations.
// Also, some migrations are only interested in some specific checks.
// The idea is to have such logic in a separate <migrationNumber>_utils file
// to make reviewing PRs less intimidating.
// Functions of this file are tested as part of <migrationNumber>.test.ts
// and for that reason they don't have their own tests.
export const checkNetworkEnablementState = (
  state: ValidState,
  version: number,
): state is ValidState & StateNECWithNativeAssetIdentifiers => {
  if (
    !hasProperty(state.engine.backgroundState, 'NetworkEnablementController')
  ) {
    captureException(
      new Error(`Migration ${version}: NetworkEnablementController not found.`),
    );
    return false;
  }

  const networkEnablementState =
    state.engine.backgroundState.NetworkEnablementController;

  if (!isObject(networkEnablementState)) {
    captureException(
      new Error(
        `Migration ${version}: NetworkEnablementController is not an object: ${typeof networkEnablementState}`,
      ),
    );
    return false;
  }

  if (!hasProperty(networkEnablementState, 'nativeAssetIdentifiers')) {
    captureException(
      new Error(
        `Migration ${version}: NetworkEnablementController missing property nativeAssetIdentifiers.`,
      ),
    );
    return false;
  }

  if (!isObject(networkEnablementState.nativeAssetIdentifiers)) {
    captureException(
      new Error(
        `Migration ${version}: NetworkEnablementController.nativeAssetIdentifiers is not an object: ${typeof networkEnablementState.nativeAssetIdentifiers}.`,
      ),
    );
    return false;
  }

  return true;
};
