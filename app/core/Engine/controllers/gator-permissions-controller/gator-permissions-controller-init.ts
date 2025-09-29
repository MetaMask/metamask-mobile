import type { ControllerInitFunction } from '../../types';
import type { GatorPermissionsControllerMessenger } from '../../messengers/gator-permissions-controller-messenger/gator-permissions-controller-messenger';
import {
  GatorPermissionsController,
  GatorPermissionsControllerState,
} from '@metamask/gator-permissions-controller';
import { isSnapId } from '@metamask/snaps-utils';
import { isGatorPermissionsFeatureEnabled } from '../../../../util/environment';

const generateDefaultGatorPermissionsControllerState =
  (): Partial<GatorPermissionsControllerState> => {
    const gatorPermissionsProviderSnapId =
      process.env.GATOR_PERMISSIONS_PROVIDER_SNAP_ID;

    // if GATOR_PERMISSIONS_PROVIDER_SNAP_ID is not specified, GatorPermissionsController will initialize it's default
    if (
      gatorPermissionsProviderSnapId !== undefined &&
      !isSnapId(gatorPermissionsProviderSnapId)
    ) {
      throw new Error(
        'GATOR_PERMISSIONS_PROVIDER_SNAP_ID must be set to a valid snap id',
      );
    }

    const isGatorPermissionsEnabled = isGatorPermissionsFeatureEnabled();

    const state: Partial<GatorPermissionsControllerState> = {
      isGatorPermissionsEnabled,
    };

    if (gatorPermissionsProviderSnapId) {
      state.gatorPermissionsProviderSnapId = gatorPermissionsProviderSnapId;
    }

    return state;
  };

export const GatorPermissionsControllerInit: ControllerInitFunction<
  GatorPermissionsController,
  GatorPermissionsControllerMessenger
> = (request) => {
  const { controllerMessenger: messenger, persistedState } = request;

  const controller = new GatorPermissionsController({
    messenger,
    state: {
      ...generateDefaultGatorPermissionsControllerState(),
      ...persistedState.GatorPermissionsController,
    },
  });

  return {
    controller,
  };
};
