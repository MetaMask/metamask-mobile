import {
  ActivityEmptyStateAction,
  getActivityEmptyState,
} from './empty-states';
import { ActivityTypeFilter } from '../../types';

describe('getActivityEmptyState', () => {
  describe('All filter', () => {
    it('returns funded default copy + Swap action when hasFunds is true', () => {
      expect(
        getActivityEmptyState({
          filter: ActivityTypeFilter.All,
          hasFunds: true,
        }),
      ).toEqual({
        descriptionKey: 'activity_view.empty_state.default_funded.description',
        actionLabelKey: 'activity_view.empty_state.default_funded.action',
        action: ActivityEmptyStateAction.Swap,
      });
    });

    it('returns unfunded default copy + AddFunds action when hasFunds is false', () => {
      expect(
        getActivityEmptyState({
          filter: ActivityTypeFilter.All,
          hasFunds: false,
        }),
      ).toEqual({
        descriptionKey:
          'activity_view.empty_state.default_unfunded.description',
        actionLabelKey: 'activity_view.empty_state.default_unfunded.action',
        action: ActivityEmptyStateAction.AddFunds,
      });
    });
  });

  describe('Transactions filter', () => {
    it('returns funded copy + Swap when hasFunds is true', () => {
      expect(
        getActivityEmptyState({
          filter: ActivityTypeFilter.Transactions,
          hasFunds: true,
        }),
      ).toEqual({
        descriptionKey:
          'activity_view.empty_state.transactions_funded.description',
        actionLabelKey: 'activity_view.empty_state.transactions_funded.action',
        action: ActivityEmptyStateAction.Swap,
      });
    });

    it('returns unfunded copy + AddFunds when hasFunds is false', () => {
      expect(
        getActivityEmptyState({
          filter: ActivityTypeFilter.Transactions,
          hasFunds: false,
        }),
      ).toEqual({
        descriptionKey:
          'activity_view.empty_state.transactions_unfunded.description',
        actionLabelKey:
          'activity_view.empty_state.transactions_unfunded.action',
        action: ActivityEmptyStateAction.AddFunds,
      });
    });
  });

  describe('Money filter', () => {
    it('returns funded copy + TransferToMoney when hasFunds is true', () => {
      expect(
        getActivityEmptyState({
          filter: ActivityTypeFilter.Money,
          hasFunds: true,
        }),
      ).toEqual({
        descriptionKey: 'activity_view.empty_state.money_funded.description',
        actionLabelKey: 'activity_view.empty_state.money_funded.action',
        action: ActivityEmptyStateAction.TransferToMoney,
      });
    });

    it('returns unfunded copy + TransferToMoney when hasFunds is false', () => {
      expect(
        getActivityEmptyState({
          filter: ActivityTypeFilter.Money,
          hasFunds: false,
        }),
      ).toEqual({
        descriptionKey: 'activity_view.empty_state.money_unfunded.description',
        actionLabelKey: 'activity_view.empty_state.money_unfunded.action',
        action: ActivityEmptyStateAction.TransferToMoney,
      });
    });
  });

  describe('Filters that override hasFunds (themed copy regardless of balance)', () => {
    it.each([true, false])(
      'Predictions returns themed copy + MakePrediction (hasFunds=%s)',
      (hasFunds) => {
        expect(
          getActivityEmptyState({
            filter: ActivityTypeFilter.Predictions,
            hasFunds,
          }),
        ).toEqual({
          descriptionKey: 'activity_view.empty_state.predictions.description',
          actionLabelKey: 'activity_view.empty_state.predictions.action',
          action: ActivityEmptyStateAction.MakePrediction,
        });
      },
    );

    it.each([true, false])(
      'Perps returns themed copy + BrowsePerpsMarkets (hasFunds=%s)',
      (hasFunds) => {
        expect(
          getActivityEmptyState({
            filter: ActivityTypeFilter.Perps,
            hasFunds,
          }),
        ).toEqual({
          descriptionKey: 'activity_view.empty_state.perps.description',
          actionLabelKey: 'activity_view.empty_state.perps.action',
          action: ActivityEmptyStateAction.BrowsePerpsMarkets,
        });
      },
    );

    it('Perps with an active sub-filter returns the "try a different filter" hint', () => {
      expect(
        getActivityEmptyState({
          filter: ActivityTypeFilter.Perps,
          hasFunds: true,
          perpsSubFilterActive: true,
        }),
      ).toEqual({
        descriptionKey:
          'activity_view.empty_state.perps_sub_filter.description',
        actionLabelKey: 'activity_view.empty_state.perps.action',
        action: ActivityEmptyStateAction.BrowsePerpsMarkets,
      });
    });

    it('perpsSubFilterActive only affects the Perps filter', () => {
      expect(
        getActivityEmptyState({
          filter: ActivityTypeFilter.Transactions,
          hasFunds: true,
          perpsSubFilterActive: true,
        }).descriptionKey,
      ).toBe('activity_view.empty_state.transactions_funded.description');
    });

    it.each([true, false])(
      'BuySell returns themed copy + AddFunds (hasFunds=%s)',
      (hasFunds) => {
        expect(
          getActivityEmptyState({
            filter: ActivityTypeFilter.BuySell,
            hasFunds,
          }),
        ).toEqual({
          descriptionKey: 'activity_view.empty_state.buy_sell.description',
          actionLabelKey: 'activity_view.empty_state.buy_sell.action',
          action: ActivityEmptyStateAction.AddFunds,
        });
      },
    );

    it.each([true, false])(
      'MetamaskCard returns themed copy + OpenMetamaskCard (hasFunds=%s)',
      (hasFunds) => {
        expect(
          getActivityEmptyState({
            filter: ActivityTypeFilter.MetamaskCard,
            hasFunds,
          }),
        ).toEqual({
          descriptionKey: 'activity_view.empty_state.metamask_card.description',
          actionLabelKey: 'activity_view.empty_state.metamask_card.action',
          action: ActivityEmptyStateAction.OpenMetamaskCard,
        });
      },
    );
  });

  it('falls back to the All branch for an unknown filter value', () => {
    const result = getActivityEmptyState({
      filter: 'something-unknown' as ActivityTypeFilter,
      hasFunds: true,
    });
    expect(result.action).toBe(ActivityEmptyStateAction.Swap);
  });
});
