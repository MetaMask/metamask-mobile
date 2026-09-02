import packageJSON from '../../../../package.json';
import type { MessengerClientInitFunction } from '../types';
import AppConstants from '../../AppConstants';
import {
  UiSlotsDataService,
  type UiSlotsDataServiceMessenger,
} from './ui-slots-controller/UiSlotsDataService';
import { UiSlotsApiReadClient } from './ui-slots-controller/UiSlotsApiReadClient';
import { UI_SLOTS_LOCAL_MOCK_ENABLED } from './ui-slots-controller/config';
import { UiSlotsMockTransport } from './ui-slots-controller/mock/UiSlotsMockTransport';

export const uiSlotsDataServiceInit: MessengerClientInitFunction<
  UiSlotsDataService,
  UiSlotsDataServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new UiSlotsDataService({
    messenger: controllerMessenger,
    transport: UI_SLOTS_LOCAL_MOCK_ENABLED
      ? new UiSlotsMockTransport()
      : new UiSlotsApiReadClient({
          baseUrl: AppConstants.FEATURE_FLAGS_API.BASE_URL,
          clientVersion: packageJSON.version,
        }),
  });

  return { controller };
};
