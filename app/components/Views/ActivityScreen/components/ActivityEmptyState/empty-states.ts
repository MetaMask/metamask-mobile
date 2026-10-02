import { ActivityTypeFilter } from '../../types';

/**
 * Discrete CTA actions used by the Activity screen's empty states. The
 * `ActivityEmptyState` component resolves each action to its real navigation
 * handler — this enum keeps the config table free of navigation imports.
 */
export enum ActivityEmptyStateAction {
  Swap = 'swap',
  AddFunds = 'addFunds',
  MakePrediction = 'makePrediction',
  BrowsePerpsMarkets = 'browsePerpsMarkets',
  OpenMetamaskCard = 'openMetamaskCard',
}

/**
 * Spot illustration shown above the empty-state copy. The component resolves
 * each value to its light/dark asset.
 */
export enum ActivityEmptyStateIllustration {
  Search = 'search',
  Predictions = 'predictions',
  Perps = 'perps',
}

export interface ActivityEmptyStateConfig {
  /** Spot illustration to show. */
  illustration: ActivityEmptyStateIllustration;
  /** i18n key for the empty-state title. */
  titleKey: string;
  /** i18n key for the empty-state description. */
  descriptionKey: string;
  /** i18n key for the CTA button label. */
  actionLabelKey: string;
  /** Which CTA the screen should dispatch. */
  action: ActivityEmptyStateAction;
}

interface GetEmptyStateArgs {
  filter: ActivityTypeFilter;
  hasFunds: boolean;
  perpsSubFilterActive?: boolean;
  /** Whether the selected account holds a MetaMask Card. */
  isCardholder?: boolean;
}

/**
 * Returns the empty-state config for the given filter + funds state.
 *
 * Filter empty states override the no-funds default so a user filtering by
 * Predictions still sees "your first prediction could be your best" even if
 * their wallet is empty.
 */
export function getActivityEmptyState({
  filter,
  hasFunds,
  perpsSubFilterActive = false,
  isCardholder = false,
}: GetEmptyStateArgs): ActivityEmptyStateConfig {
  switch (filter) {
    case ActivityTypeFilter.Predictions:
      return {
        illustration: ActivityEmptyStateIllustration.Predictions,
        titleKey: 'activity_view.empty_state.predictions.title',
        descriptionKey: 'activity_view.empty_state.predictions.description',
        actionLabelKey: 'activity_view.empty_state.predictions.action',
        action: ActivityEmptyStateAction.MakePrediction,
      };

    case ActivityTypeFilter.Perps:
      if (perpsSubFilterActive) {
        return {
          illustration: ActivityEmptyStateIllustration.Perps,
          titleKey: 'activity_view.empty_state.perps_sub_filter.title',
          descriptionKey:
            'activity_view.empty_state.perps_sub_filter.description',
          actionLabelKey: 'activity_view.empty_state.perps.action',
          action: ActivityEmptyStateAction.BrowsePerpsMarkets,
        };
      }
      return {
        illustration: ActivityEmptyStateIllustration.Perps,
        titleKey: 'activity_view.empty_state.perps.title',
        descriptionKey: 'activity_view.empty_state.perps.description',
        actionLabelKey: 'activity_view.empty_state.perps.action',
        action: ActivityEmptyStateAction.BrowsePerpsMarkets,
      };

    case ActivityTypeFilter.Transactions:
      return hasFunds
        ? {
            illustration: ActivityEmptyStateIllustration.Search,
            titleKey: 'activity_view.empty_state.transactions_funded.title',
            descriptionKey:
              'activity_view.empty_state.transactions_funded.description',
            actionLabelKey:
              'activity_view.empty_state.transactions_funded.action',
            action: ActivityEmptyStateAction.Swap,
          }
        : {
            illustration: ActivityEmptyStateIllustration.Search,
            titleKey: 'activity_view.empty_state.transactions_unfunded.title',
            descriptionKey:
              'activity_view.empty_state.transactions_unfunded.description',
            actionLabelKey:
              'activity_view.empty_state.transactions_unfunded.action',
            action: ActivityEmptyStateAction.AddFunds,
          };

    case ActivityTypeFilter.BuySell:
      return {
        illustration: ActivityEmptyStateIllustration.Search,
        titleKey: 'activity_view.empty_state.buy_sell.title',
        descriptionKey: 'activity_view.empty_state.buy_sell.description',
        actionLabelKey: 'activity_view.empty_state.buy_sell.action',
        action: ActivityEmptyStateAction.AddFunds,
      };

    case ActivityTypeFilter.MetamaskCard:
      // Both CTAs open the card flow, which routes cardholders to Card Home
      // and everyone else to Card Welcome.
      // TODO: confirm card empty state copy with product
      return isCardholder
        ? {
            illustration: ActivityEmptyStateIllustration.Search,
            titleKey:
              'activity_view.empty_state.metamask_card_cardholder.title',
            descriptionKey:
              'activity_view.empty_state.metamask_card_cardholder.description',
            actionLabelKey:
              'activity_view.empty_state.metamask_card_cardholder.action',
            action: ActivityEmptyStateAction.OpenMetamaskCard,
          }
        : {
            illustration: ActivityEmptyStateIllustration.Search,
            titleKey: 'activity_view.empty_state.metamask_card_no_card.title',
            descriptionKey:
              'activity_view.empty_state.metamask_card_no_card.description',
            actionLabelKey:
              'activity_view.empty_state.metamask_card_no_card.action',
            action: ActivityEmptyStateAction.OpenMetamaskCard,
          };

    case ActivityTypeFilter.All:
    default:
      return hasFunds
        ? {
            illustration: ActivityEmptyStateIllustration.Search,
            titleKey: 'activity_view.empty_state.default_funded.title',
            descriptionKey:
              'activity_view.empty_state.default_funded.description',
            actionLabelKey: 'activity_view.empty_state.default_funded.action',
            action: ActivityEmptyStateAction.Swap,
          }
        : {
            illustration: ActivityEmptyStateIllustration.Search,
            titleKey: 'activity_view.empty_state.default_unfunded.title',
            descriptionKey:
              'activity_view.empty_state.default_unfunded.description',
            actionLabelKey: 'activity_view.empty_state.default_unfunded.action',
            action: ActivityEmptyStateAction.AddFunds,
          };
  }
}
