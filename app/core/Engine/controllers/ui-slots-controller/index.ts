import packageJSON from '../../../../../package.json';
import type { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';
import type { MessengerClientInitFunction } from '../../types';
import AppConstants from '../../../AppConstants';
import { validatedVersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';
import Logger from '../../../../util/Logger';
import { store } from '../../../../store';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import {
  UiSlotsController,
  defaultUiSlotsControllerState,
} from './UiSlotsController';
import type { UiSlotsControllerMessenger } from './types';
import { UI_SLOTS_REMOTE_FLAG_NAME } from './config';
import { MOBILE_UI_SLOTS_CONTRACTS } from '../../../../components/UI/UiSlots/contractRegistry';
import { UiSlotsApiReadClient } from './UiSlotsApiReadClient';

export const uiSlotsControllerInit: MessengerClientInitFunction<
  UiSlotsController,
  UiSlotsControllerMessenger
> = ({ controllerMessenger, persistedState, getState }) => {
  const isExternalServicesEnabled = () =>
    selectBasicFunctionalityEnabled(getState());

  const controller = new UiSlotsController({
    messenger: controllerMessenger,
    enabled: false,
    isExternalServicesEnabled,
    readClient: new UiSlotsApiReadClient({
      baseUrl: AppConstants.FEATURE_FLAGS_API.BASE_URL,
      clientVersion: packageJSON.version,
    }),
    diagnostics: {
      log: (message, data) => Logger.log(message, data),
      error: (error, data) => Logger.error(error, data),
    },
    contractRegistry: MOBILE_UI_SLOTS_CONTRACTS,
    state: {
      ...(persistedState.UiSlotsController ?? defaultUiSlotsControllerState),
    },
  });

  const updateEnabledState = (
    flagState: RemoteFeatureFlagControllerState = controllerMessenger.call(
      'RemoteFeatureFlagController:getState',
    ),
  ) => {
    const remotelyEnabled =
      validatedVersionGatedFeatureFlag(
        flagState.remoteFeatureFlags[UI_SLOTS_REMOTE_FLAG_NAME],
      ) ?? false;
    controller.setEnabled(remotelyEnabled && isExternalServicesEnabled());
  };
  controllerMessenger.subscribe(
    'RemoteFeatureFlagController:stateChange',
    updateEnabledState,
  );

  let previousBasicFunctionalityEnabled = isExternalServicesEnabled();
  store.subscribe(() => {
    const currentBasicFunctionalityEnabled = isExternalServicesEnabled();
    if (
      currentBasicFunctionalityEnabled === previousBasicFunctionalityEnabled
    ) {
      return;
    }
    previousBasicFunctionalityEnabled = currentBasicFunctionalityEnabled;
    updateEnabledState();
  });

  updateEnabledState();

  return { controller };
};

export { UiSlotsController };
export type { UiSlotsControllerMessenger };
