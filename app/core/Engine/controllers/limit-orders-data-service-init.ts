import {
  LimitOrdersDataService,
  type LimitOrdersDataServiceMessenger,
} from '../../../components/UI/Bridge/services/LimitOrdersDataService';
import type { MessengerClientInitFunction } from '../types';

export const limitOrdersDataServiceInit: MessengerClientInitFunction<
  LimitOrdersDataService,
  LimitOrdersDataServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new LimitOrdersDataService({
    messenger: controllerMessenger,
  });

  // Rehydrate the persisted history cache from disk so it's available before
  // the first render, without blocking startup on the read.
  controller.init();

  return { controller };
};
