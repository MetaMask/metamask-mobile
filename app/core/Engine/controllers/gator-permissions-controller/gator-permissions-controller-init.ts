import type { MessengerClientInitFunction } from '../../types';
import {
  type GatorPermissionsControllerMessenger,
  GatorPermissionsController,
  GatorPermissionsControllerConfig,
} from '@metamask/gator-permissions-controller';
import { assertIsValidSnapId } from '@metamask/snaps-utils';

const createGatorPermissionsConfig = (): GatorPermissionsControllerConfig => {
  const gatorPermissionsProviderSnapId =
    process.env.GATOR_PERMISSIONS_PROVIDER_SNAP_ID;

  // if GATOR_PERMISSIONS_PROVIDER_SNAP_ID is not specified, GatorPermissionsController will initialize it's default
  if (gatorPermissionsProviderSnapId !== undefined) {
    try {
      assertIsValidSnapId(gatorPermissionsProviderSnapId);
    } catch (error) {
      throw new Error(
        `GATOR_PERMISSIONS_PROVIDER_SNAP_ID must be set to a valid snap id: ${error}`,
      );
    }
  }

  const config: GatorPermissionsControllerConfig = {
    supportedPermissionTypes: [],
  };

  if (gatorPermissionsProviderSnapId) {
    config.gatorPermissionsProviderSnapId = gatorPermissionsProviderSnapId;
  }

  return config;
};

export const GatorPermissionsControllerInit: MessengerClientInitFunction<
  GatorPermissionsController,
  GatorPermissionsControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new GatorPermissionsController({
    messenger: controllerMessenger,
    config: createGatorPermissionsConfig(),
    state: persistedState.GatorPermissionsController,
  });

  return {
    controller,
  };
};
