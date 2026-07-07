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
  TransferToMoney = 'transferToMoney',
  OpenMetamaskCard = 'openMetamaskCard',
}

export interface ActivityEmptyStateConfig {
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
}: GetEmptyStateArgs): ActivityEmptyStateConfig {
  switch (filter) {
    case ActivityTypeFilter.Predictions:
      return {
        descriptionKey: 'activity_view.empty_state.predictions.description',
        actionLabelKey: 'activity_view.empty_state.predictions.action',
        action: ActivityEmptyStateAction.MakePrediction,
      };

    case ActivityTypeFilter.Perps:
      if (perpsSubFilterActive) {
        return {
          descriptionKey:
            'activity_view.empty_state.perps_sub_filter.description',
          actionLabelKey: 'activity_view.empty_state.perps.action',
          action: ActivityEmptyStateAction.BrowsePerpsMarkets,
        };
      }
      return {
        descriptionKey: 'activity_view.empty_state.perps.description',
        actionLabelKey: 'activity_view.empty_state.perps.action',
        action: ActivityEmptyStateAction.BrowsePerpsMarkets,
      };

    case ActivityTypeFilter.Transactions:
      return hasFunds
        ? {
            descriptionKey:
              'activity_view.empty_state.transactions_funded.description',
            actionLabelKey:
              'activity_view.empty_state.transactions_funded.action',
            action: ActivityEmptyStateAction.Swap,
          }
        : {
            descriptionKey:
              'activity_view.empty_state.transactions_unfunded.description',
            actionLabelKey:
              'activity_view.empty_state.transactions_unfunded.action',
            action: ActivityEmptyStateAction.AddFunds,
          };

    case ActivityTypeFilter.BuySell:
      return {
        descriptionKey: 'activity_view.empty_state.buy_sell.description',
        actionLabelKey: 'activity_view.empty_state.buy_sell.action',
        action: ActivityEmptyStateAction.AddFunds,
      };

    case ActivityTypeFilter.Money:
      return hasFunds
        ? {
            descriptionKey:
              'activity_view.empty_state.money_funded.description',
            actionLabelKey: 'activity_view.empty_state.money_funded.action',
            action: ActivityEmptyStateAction.TransferToMoney,
          }
        : {
            descriptionKey:
              'activity_view.empty_state.money_unfunded.description',
            actionLabelKey: 'activity_view.empty_state.money_unfunded.action',
            action: ActivityEmptyStateAction.TransferToMoney,
          };

    case ActivityTypeFilter.MetamaskCard:
      // TODO: confirm card empty state copy with product
      return {
        descriptionKey: 'activity_view.empty_state.metamask_card.description',
        actionLabelKey: 'activity_view.empty_state.metamask_card.action',
        action: ActivityEmptyStateAction.OpenMetamaskCard,
      };

    case ActivityTypeFilter.All:
    default:
      return hasFunds
        ? {
            descriptionKey:
              'activity_view.empty_state.default_funded.description',
            actionLabelKey: 'activity_view.empty_state.default_funded.action',
            action: ActivityEmptyStateAction.Swap,
          }
        : {
            descriptionKey:
              'activity_view.empty_state.default_unfunded.description',
            actionLabelKey: 'activity_view.empty_state.default_unfunded.action',
            action: ActivityEmptyStateAction.AddFunds,
          };
  }
}
