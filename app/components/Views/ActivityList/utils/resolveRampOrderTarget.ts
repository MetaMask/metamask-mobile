/**
 * Activity-owned mirror of OrdersList.handleItemPress routing.
 * Must stay in sync with OrdersList.tsx (Ramps folder is import-only).
 */
import type { RampsOrder } from '@metamask/ramps-controller';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import {
  isRampFiatOrder,
  isRampRampsOrder,
} from '../../../../util/activity-adapters';
import { createOrderDetailsNavDetails } from '../../../UI/Ramp/Aggregator/Views/OrderDetails/OrderDetails';
import { createRampsOrderDetailsNavDetails } from '../../../UI/Ramp/Views/OrderDetails';
import { createDepositOrderDetailsNavDetails } from '../../../UI/Ramp/Views/OrderDetails/DepositOrderDetails/DepositOrderDetails';

export type RampOrderTarget =
  | 'ramps-v2-details'
  | 'deposit-details'
  | 'deposit-resume-buy'
  | 'aggregator-details';

export function resolveRampOrderTarget(
  data: FiatOrder | RampsOrder,
): RampOrderTarget {
  if (isRampRampsOrder(data)) {
    return 'ramps-v2-details';
  }

  if (data.provider === FIAT_ORDER_PROVIDERS.DEPOSIT) {
    if (data.state === FIAT_ORDER_STATES.CREATED) {
      return 'deposit-resume-buy';
    }
    return 'deposit-details';
  }

  if (data.provider === FIAT_ORDER_PROVIDERS.RAMPS_V2) {
    return 'ramps-v2-details';
  }

  return 'aggregator-details';
}

export interface NavigateToRampOrderTargetArgs {
  data: FiatOrder | RampsOrder;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors React Navigation's navigate spread of create*NavDetails
  navigation: { navigate: (...args: any[]) => void };
  goToBuy: () => void;
}

/**
 * Flag-OFF consumer: navigates to the same destinations OrdersList uses.
 * Always pass goToBuy from useRampNavigation().
 */
export function navigateToRampOrderTarget({
  data,
  navigation,
  goToBuy,
}: NavigateToRampOrderTargetArgs): void {
  const target = resolveRampOrderTarget(data);

  if (target === 'deposit-resume-buy') {
    goToBuy();
    return;
  }

  if (isRampRampsOrder(data)) {
    if (!data.id) {
      return;
    }
    navigation.navigate(
      ...createRampsOrderDetailsNavDetails({ orderId: data.id }),
    );
    return;
  }

  // Narrowed FiatOrder
  if (!isRampFiatOrder(data)) {
    return;
  }

  const orderId = data.id;

  switch (target) {
    case 'ramps-v2-details':
      navigation.navigate(...createRampsOrderDetailsNavDetails({ orderId }));
      return;
    case 'deposit-details':
      navigation.navigate(...createDepositOrderDetailsNavDetails({ orderId }));
      return;
    case 'aggregator-details':
    default:
      navigation.navigate(...createOrderDetailsNavDetails({ orderId }));
  }
}
