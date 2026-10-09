import {
  RecurringOrdersDataService,
  type RecurringOrdersDataServiceMessenger,
} from '../../../components/UI/Bridge/services/RecurringOrdersDataService';
import type { MessengerClientInitFunction } from '../types';

export const recurringOrdersDataServiceInit: MessengerClientInitFunction<
  RecurringOrdersDataService,
  RecurringOrdersDataServiceMessenger
> = ({ controllerMessenger }) => ({
  controller: new RecurringOrdersDataService({
    messenger: controllerMessenger,
  }),
});
