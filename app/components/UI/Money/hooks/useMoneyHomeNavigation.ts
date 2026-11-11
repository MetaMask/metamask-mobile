import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import type { NavigationAnalyticsContext } from '../../../../util/analytics/navigationAnalyticsAttribution';
import { strings } from '../../../../../locales/i18n';
import { selectMoneyEntryContext } from '../selectors/entry';
import { getMoneyEntryDecision } from '../navigation/moneyEntryDecision';
import { navigateToMoneyHomeRoute } from '../navigation/navigateToMoneyHome';
import type { TrackMoneyEntry } from './useMoneyNavigation.types';

interface NavigateToMoneyHomeOptions {
  analyticsContext?: NavigationAnalyticsContext;
  /**
   * Controls whether navigation pops to an existing route, which can show the
   * backward animation. Explore passes `pop: false` to use normal forward
   * navigation into Money Home. Defaults to true.
   */
  pop?: boolean;
  track?: TrackMoneyEntry;
}

export const useMoneyHomeNavigation = () => {
  const entryContext = useSelector(selectMoneyEntryContext);

  const navigateToMoneyHome = useCallback(
    (options?: NavigateToMoneyHomeOptions) => {
      const { analyticsContext, pop = true, track } = options ?? {};
      const decision = getMoneyEntryDecision('home', entryContext);

      track?.({
        redirect_target: decision.redirect_target,
        button_intent: decision.button_intent,
      });

      if (decision.destination === 'featureDisabled') {
        NavigationService.navigation.navigate(
          Routes.MONEY.MODALS.DEEPLINK_MODAL,
          {
            title: strings('money.deeplink_modal.money_account_disabled.title'),
            description: strings(
              'money.deeplink_modal.money_account_disabled.description',
            ),
          },
        );
        return;
      }

      if (decision.destination === 'geoBlockSheet') {
        NavigationService.navigation.navigate(Routes.MONEY.MODALS.ROOT, {
          screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
        });
        return;
      }

      if (decision.destination === 'onboarding') {
        if (analyticsContext) {
          NavigationService.navigation.navigate(Routes.MONEY.ONBOARDING, {
            analyticsContext,
          });
        } else {
          NavigationService.navigation.navigate(Routes.MONEY.ONBOARDING);
        }
        return;
      }

      navigateToMoneyHomeRoute({ analyticsContext, pop });
    },
    [entryContext],
  );

  return { navigateToMoneyHome };
};
