import type {
  RecurringOrder,
  RecurringSwap,
} from '../../api/recurringOrders.types';

export interface RecurringSwapDetailsRouteParams {
  order: RecurringOrder;
  swap: RecurringSwap;
  showAddFundsCta?: boolean;
}
