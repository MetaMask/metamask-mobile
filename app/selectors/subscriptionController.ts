import { createSelector } from 'reselect';
import type {
  CachedLastSelectedPaymentMethod,
  ProductType,
  Subscription,
  SubscriptionControllerState,
} from '@metamask/subscription-controller';
import { RootState } from '../reducers';

const EMPTY_SUBSCRIPTIONS: Subscription[] = [];
const EMPTY_TRIALED_PRODUCTS: ProductType[] = [];

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
