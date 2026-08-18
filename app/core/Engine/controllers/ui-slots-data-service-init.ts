import type { MessengerClientInitFunction } from '../types';
import {
  UiSlotsDataService,
  type UiSlotsDataServiceMessenger,
} from './ui-slots-controller/UiSlotsDataService';
import { UiSlotsMockTransport } from './ui-slots-controller/mock/UiSlotsMockTransport';

export const uiSlotsDataServiceInit: MessengerClientInitFunction<
  UiSlotsDataService,
  UiSlotsDataServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new UiSlotsDataService({
    messenger: controllerMessenger,
    transport: new UiSlotsMockTransport(),
  });

  return { controller };
};
