import { createSelector } from 'reselect';
import {
  getDefaultSubscriptionControllerState,
  MoneyAccountFeature,
  PRODUCT_TYPES,
  selectHasEntitlement,
  selectIsActiveSubscriber,
  type CachedLastSelectedPaymentMethod,
  type ProductType,
  type Subscription,
  type SubscriptionControllerState,
} from '@metamask/subscription-controller';
import { RootState } from '../reducers';
import { mapMoneyAccountPlusPricing } from '../components/Views/ProSubscription/screens/Benefits/utils/mapMoneyAccountPlusPricing';

const EMPTY_SUBSCRIPTIONS: Subscription[] = [];
const EMPTY_TRIALED_PRODUCTS: ProductType[] = [];

/**
 * Statuses that grant subscription benefits. Mirrors Core's
 * `ACTIVE_SUBSCRIPTION_STATUSES`, which is not part of the package's public
 * exports.
 */
const ACTIVE_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  SUBSCRIPTION_STATUSES.active,
  SUBSCRIPTION_STATUSES.trialing,
  SUBSCRIPTION_STATUSES.provisional,
]);
const MONEY_ACCOUNT_PLUS_FEATURES = Object.values(MoneyAccountFeature);

/**
 * Core's entitlement selectors require a defined controller state, but the
 * Redux slice is absent until the Engine hydrates. Falling back to default
 * state makes those selectors fail closed instead of throwing.
 */
const DEFAULT_CONTROLLER_STATE: SubscriptionControllerState =
  getDefaultSubscriptionControllerState();

const hasProduct = (
  subscription: Subscription,
  productType: ProductType,
): boolean =>
  subscription.products.some((product) => product.name === productType);

/**
 * Selects SubscriptionController state.
 *
 * @param state - The root Redux state.
 * @returns The SubscriptionController state, or undefined when the slice is absent.
 */
export const selectSubscriptionControllerState = (
  state: RootState,
): SubscriptionControllerState | undefined =>
  state.engine?.backgroundState?.SubscriptionController;

/**
 * Selects cached subscription pricing. v8 pricing is returned unchanged so
 * callers apply Core's product and auth-method resolution rules themselves.
 *
 * @param state - The root Redux state.
 * @returns The pricing response, or undefined when it has not been fetched.
 */
export const selectSubscriptionPricing = createSelector(
  selectSubscriptionControllerState,
  (subscriptionControllerState) => subscriptionControllerState?.pricing,
);

/**
 * Selects Money Account Plus monthly and annual plans derived from cached
 * pricing. Matching is by product name and billing interval, not array index.
 *
 * @param state - The root Redux state.
 * @returns Mapped Plus pricing, including unavailable and malformed status.
 */
export const selectMoneyAccountPlusPricing = createSelector(
  selectSubscriptionPricing,
  mapMoneyAccountPlusPricing,
);

/**
 * Selects Money Account Plus monthly and annual plans derived from cached
 * pricing. Matching is by product name and billing interval, not array index.
 *
 * @param state - The root Redux state.
 * @returns Mapped Plus pricing, including unavailable and malformed status.
 */
export const selectMoneyAccountPlusPricing = createSelector(
  selectSubscriptionPricing,
  mapMoneyAccountPlusPricing,
);

/**
 * Selects the user's current subscriptions.
 *
 * @param state - The root Redux state.
 * @returns The subscriptions array, or a stable empty array when absent.
 */
export const selectSubscriptions = createSelector(
  selectSubscriptionControllerState,
  (subscriptionControllerState) =>
    subscriptionControllerState?.subscriptions ?? EMPTY_SUBSCRIPTIONS,
);

/**
 * Selects products the user has already trialed.
 *
 * @param state - The root Redux state.
 * @returns The trialed product list, or a stable empty array when absent.
 */
export const selectTrialedSubscriptionProducts = createSelector(
  selectSubscriptionControllerState,
  (subscriptionControllerState) =>
    subscriptionControllerState?.trialedProducts ?? EMPTY_TRIALED_PRODUCTS,
);

/**
 * Selects whether the user has an active Money Account Plus (Pro)
 * subscription. Active covers `active`, `trialing`, and `provisional`.
 *
 * @param state - The root Redux state.
 * @returns True when a subscription grants Money Account Plus.
 */
export const selectIsMoneyAccountPlusSubscriber = createSelector(
  selectSubscriptions,
  (subscriptions) =>
    subscriptions.some(
      (subscription) =>
        ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) &&
        hasProduct(subscription, PRODUCT_TYPES.MONEY_ACCOUNT_PLUS),
    ),
);

/**
 * Selects the current subscription that contains the given product. A
 * subscription may contain multiple products; matching is by
 * `subscription.products`.
 *
 * @param state - The root Redux state.
 * @param productType - The product to look up.
 * @returns The matching subscription, or undefined when none exists.
 */
export const selectSubscriptionByProduct = (
  state: RootState,
  productType: ProductType,
): Subscription | undefined =>
  selectSubscriptions(state).find((subscription) =>
    hasProduct(subscription, productType),
  );

/**
 * Selects the last subscription that contains the given product.
 *
 * @param state - The root Redux state.
 * @param productType - The product to look up.
 * @returns The last subscription when it includes the product, otherwise undefined.
 */
export const selectLastSubscriptionByProduct = (
  state: RootState,
  productType: ProductType,
): Subscription | undefined => {
  const lastSubscription =
    selectSubscriptionControllerState(state)?.lastSubscription;
  if (!lastSubscription || !hasProduct(lastSubscription, productType)) {
    return undefined;
  }
  return lastSubscription;
};

/**
 * Selects the cached last-selected payment method for a product. Cached
 * methods are optional per product; missing keys return undefined.
 *
 * @param state - The root Redux state.
 * @param productType - The product to look up.
 * @returns The cached payment method, or undefined when none is stored.
 */
export const selectLastSelectedPaymentMethodByProduct = (
  state: RootState,
  productType: ProductType,
): CachedLastSelectedPaymentMethod | undefined =>
  selectSubscriptionControllerState(state)?.lastSelectedPaymentMethod?.[
    productType
  ];

/**
 * Selects whether the user has an active Money Account Plus subscription.
 * Active covers `active`, `trialing`, and `provisional`; every other status
 * fails closed.
 *
 * @param state - The root Redux state.
 * @returns Whether the user is an active Plus subscriber.
 */
export const selectIsMoneyAccountPlusSubscriber = createSelector(
  selectSubscriptionControllerState,
  (subscriptionControllerState): boolean =>
    selectIsActiveSubscriber(
      subscriptionControllerState ?? DEFAULT_CONTROLLER_STATE,
      PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
    ),
);

/**
 * Selects whether the user still holds any Money Account Plus entitlement.
 *
 * Entitlements are granted by the server independently of subscription
 * status, so a `past_due` or `paused` subscriber keeps paid access until the
 * server revokes it. Omitted entitlements are stored as an empty map, so this
 * fails closed once access ends.
 *
 * @param state - The root Redux state.
 * @returns Whether at least one Plus feature entitlement is granted.
 */
export const selectHasAnyMoneyAccountPlusEntitlement = createSelector(
  selectSubscriptionControllerState,
  (subscriptionControllerState): boolean =>
    MONEY_ACCOUNT_PLUS_FEATURES.some((feature) =>
      selectHasEntitlement(
        subscriptionControllerState ?? DEFAULT_CONTROLLER_STATE,
        PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
        feature,
      ),
    ),
);

/**
 * Selects whether a single Money Account Plus feature is entitled. Not
 * memoized because the feature argument varies per call site.
 *
 * @param state - The root Redux state.
 * @param feature - The Plus feature to check.
 * @returns Whether the feature entitlement is granted.
 */
export const selectHasMoneyAccountPlusEntitlement = (
  state: RootState,
  feature: MoneyAccountFeature,
): boolean =>
  selectHasEntitlement(
    selectSubscriptionControllerState(state) ?? DEFAULT_CONTROLLER_STATE,
    PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
    feature,
  );
