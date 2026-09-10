import { createSelector } from 'reselect';
import {
  getDefaultSubscriptionControllerState,
  MoneyAccountFeature,
  PRODUCT_TYPES,
  selectHasEntitlement,
  selectIsActiveSubscriber,
  ShieldFeature,
  type CachedLastSelectedPaymentMethod,
  type MoneyAccountPlusClaim,
  type ProductType,
  type Subscription,
  type SubscriptionBenefitsState,
  type SubscriptionControllerState,
} from '@metamask/subscription-controller';
import { RootState } from '../reducers';

const EMPTY_SUBSCRIPTIONS: Subscription[] = [];
const EMPTY_TRIALED_PRODUCTS: ProductType[] = [];

/**
 * Core's entitlement selectors require a defined controller state, but the
 * Redux slice is absent until the Engine hydrates. Falling back to default
 * state makes those selectors fail closed instead of throwing.
 */
const DEFAULT_CONTROLLER_STATE: SubscriptionControllerState =
  getDefaultSubscriptionControllerState();

const MONEY_ACCOUNT_FEATURES = Object.values(MoneyAccountFeature);

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
 * Selects the Money Account Plus entitlement claim.
 *
 * @param state - The root Redux state.
 * @returns The claim, or undefined when the user holds no Plus entitlements.
 */
export const selectMoneyAccountPlusClaim = createSelector(
  selectSubscriptionControllerState,
  (subscriptionControllerState): MoneyAccountPlusClaim | undefined =>
    subscriptionControllerState?.productEntitlements?.[
      PRODUCT_TYPES.MONEY_ACCOUNT_PLUS
    ],
);

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

/**
 * Selects whether any Money Account Plus feature is still entitled.
 * Entitlements outlive the active statuses, so this is what keeps a
 * `past_due` subscriber in the Pro experience during their grace period.
 *
 * @param state - The root Redux state.
 * @returns Whether at least one Plus feature entitlement is granted.
 */
export const selectHasAnyMoneyAccountPlusEntitlement = createSelector(
  selectMoneyAccountPlusClaim,
  (claim): boolean =>
    MONEY_ACCOUNT_FEATURES.some((feature) =>
      Boolean(claim?.entitlements?.[feature]),
    ),
);

/**
 * Selects persisted Money Account Plus benefit usage for the current billing
 * period. Undefined until `getBenefits()` has stored a snapshot.
 *
 * @param state - The root Redux state.
 * @returns The benefits snapshot, or undefined when it has not been fetched.
 */
export const selectSubscriptionBenefits = createSelector(
  selectSubscriptionControllerState,
  (subscriptionControllerState): SubscriptionBenefitsState | undefined =>
    subscriptionControllerState?.benefits,
);

/**
 * Selects the current Money Account Plus subscription, if any.
 *
 * @param state - The root Redux state.
 * @returns The Plus subscription, or undefined when none exists.
 */
export const selectMoneyAccountPlusSubscription = (
  state: RootState,
): Subscription | undefined =>
  selectSubscriptionByProduct(state, PRODUCT_TYPES.MONEY_ACCOUNT_PLUS);

/**
 * Selects whether a single Shield feature is entitled. Not memoized because
 * the feature argument varies per call site.
 *
 * @param state - The root Redux state.
 * @param feature - The Shield feature to check.
 * @returns Whether the feature entitlement is granted.
 */
export const selectHasShieldEntitlement = (
  state: RootState,
  feature: ShieldFeature,
): boolean =>
  selectHasEntitlement(
    selectSubscriptionControllerState(state) ?? DEFAULT_CONTROLLER_STATE,
    PRODUCT_TYPES.SHIELD,
    feature,
  );
