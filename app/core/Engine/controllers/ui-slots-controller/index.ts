import packageJSON from '../../../../../package.json';
import type { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';
import type { MessengerClientInitFunction } from '../../types';
import AppConstants from '../../../AppConstants';
import { validatedVersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';
import Logger from '../../../../util/Logger';
import {
  UiSlotsController,
  defaultUiSlotsControllerState,
} from './UiSlotsController';
import type { UiSlotsControllerMessenger } from './types';
import { UI_SLOTS_REMOTE_FLAG_NAME } from './config';
import { PREDICT_UI_SLOTS_V1_CONTRACTS } from '../../../../components/UI/Predict/uiSlots/contracts/v1';
import { UiSlotsApiReadClient } from './UiSlotsApiReadClient';

export const uiSlotsControllerInit: MessengerClientInitFunction<
  UiSlotsController,
  UiSlotsControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new UiSlotsController({
    messenger: controllerMessenger,
    enabled: false,
    readClient: new UiSlotsApiReadClient({
      baseUrl: AppConstants.FEATURE_FLAGS_API.BASE_URL,
      clientVersion: packageJSON.version,
    }),
    diagnostics: {
      log: (message, data) => Logger.log(message, data),
      error: (error, data) => Logger.error(error, data),
    },
    contractRegistry: PREDICT_UI_SLOTS_V1_CONTRACTS,
    state: {
      ...(persistedState.UiSlotsController ?? defaultUiSlotsControllerState),
    },
  });

  const updateEnabledState = (flagState: RemoteFeatureFlagControllerState) => {
    const remotelyEnabled =
      validatedVersionGatedFeatureFlag(
        flagState.remoteFeatureFlags[UI_SLOTS_REMOTE_FLAG_NAME],
      ) ?? false;
    controller.setEnabled(remotelyEnabled);
  };
  controllerMessenger.subscribe(
    'RemoteFeatureFlagController:stateChange',
    updateEnabledState,
  );
  updateEnabledState(
    controllerMessenger.call('RemoteFeatureFlagController:getState'),
  );

  return { controller };
};

export { UiSlotsController };
export type { UiSlotsControllerMessenger };
