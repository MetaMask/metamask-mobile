import packageJSON from '../../../../../package.json';
import type { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';
import type { MessengerClientInitFunction } from '../../types';
import { validatedVersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';
import Logger from '../../../../util/Logger';
import {
  UiSlotsController,
  defaultUiSlotsControllerState,
} from './UiSlotsController';
import type { UiSlotsControllerMessenger } from './types';
import {
  UI_SLOTS_CAPABILITY_COHORT,
  UI_SLOTS_CONTRACT_MAJOR,
  UI_SLOTS_LOCAL_MOCK_ENABLED,
  UI_SLOTS_PLATFORM,
  UI_SLOTS_REMOTE_FLAG_NAME,
} from './config';
import { composeUiSlotDefinitions } from './slotDefinitions';
import { PREDICT_UI_SLOT_DEFINITIONS } from '../../../../components/UI/Predict/uiSlots/slotDefinitions';
import { MOBILE_UI_SLOTS_CONTRACT_REGISTRY } from '../../../../components/UI/UiSlots/mobileContractRegistry';

export const uiSlotsControllerInit: MessengerClientInitFunction<
  UiSlotsController,
  UiSlotsControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new UiSlotsController({
    messenger: controllerMessenger,
    clientVersion: packageJSON.version,
    platform: UI_SLOTS_PLATFORM,
    contractMajor: UI_SLOTS_CONTRACT_MAJOR,
    capabilityCohort: UI_SLOTS_CAPABILITY_COHORT,
    enabled: UI_SLOTS_LOCAL_MOCK_ENABLED,
    diagnostics: {
      log: (message, data) => Logger.log(message, data),
      error: (error, data) => Logger.error(error, data),
    },
    slotDefinitions: composeUiSlotDefinitions(PREDICT_UI_SLOT_DEFINITIONS),
    contractRegistry: MOBILE_UI_SLOTS_CONTRACT_REGISTRY,
    state: {
      ...(persistedState.UiSlotsController ?? defaultUiSlotsControllerState),
    },
  });

  const updateEnabledState = (flagState: RemoteFeatureFlagControllerState) => {
    const remotelyEnabled =
      validatedVersionGatedFeatureFlag(
        flagState.remoteFeatureFlags[UI_SLOTS_REMOTE_FLAG_NAME],
      ) ?? false;
    controller.setEnabled(UI_SLOTS_LOCAL_MOCK_ENABLED || remotelyEnabled);
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
