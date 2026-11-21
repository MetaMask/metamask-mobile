import { createSelector } from 'reselect';
import { RampsOrderStatus } from '@metamask/ramps-controller';
import { FIAT_ORDER_STATES } from '../../../constants/on-ramp';
import { getOrders } from '../../../reducers/fiatOrders';
import { selectRampsOrdersForSelectedAccountGroup } from '../../../selectors/rampsController';
import { selectWalletHomeOnboardingStepsEligibleAt } from '../../../selectors/onboarding';
import { toEpochMs } from '../Ramp/utils/displayOrder';
import { isSellFiatOrder } from '../Ramp/Aggregator/utils';

// Precreated (hosted checkout opened) and Created (awaiting bank transfer) orders are not paid yet.
const FUNDING_RAMPS_ORDER_STATUSES = new Set<RampsOrderStatus>([
  RampsOrderStatus.Pending,
  RampsOrderStatus.Completed,
]);

const FUNDING_FIAT_ORDER_STATES = new Set<FIAT_ORDER_STATES>([
  FIAT_ORDER_STATES.PENDING,
  FIAT_ORDER_STATES.COMPLETED,
]);

/**
 * Whether the selected account group has a paid buy order (processing or completed) placed
 * since the user became eligible for the Wallet Home checklist. Reads saved order state, so
 * it covers every Buy entry point and survives an app restart.
 */
export const selectHasWalletHomeOnboardingFundingOrder = createSelector(
  [
    selectRampsOrdersForSelectedAccountGroup,
    getOrders,
    selectWalletHomeOnboardingStepsEligibleAt,
  ],
  (rampsOrders, fiatOrders, eligibleAt): boolean => {
    const isSinceEligible = (createdAt: unknown): boolean =>
      eligibleAt === null || toEpochMs(createdAt) >= eligibleAt;

    return (
      rampsOrders.some(
        (order) =>
          FUNDING_RAMPS_ORDER_STATUSES.has(order.status) &&
          isSinceEligible(order.createdAt),
      ) ||
      fiatOrders.some(
        (order) =>
          FUNDING_FIAT_ORDER_STATES.has(order.state) &&
          isSinceEligible(order.createdAt) &&
          !isSellFiatOrder(order),
      )
    );
  },
);
