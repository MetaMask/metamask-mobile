import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService';
import type { NavigationAnalyticsContext } from '../../../../util/analytics/navigationAnalyticsAttribution';
import { strings } from '../../../../../locales/i18n';
import { selectMoneyEntryContext } from '../selectors/entry';
import {
  getMoneyEntryDecision,
  type MoneyEntryDecision,
} from '../navigation/moneyEntryDecision';
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
  /**
   * Skips the Rive onboarding redirect for callers that already showed another
   * Money intro, such as the splash.
   */
  skipOnboardingRedirect?: boolean;
  track?: TrackMoneyEntry;
}

export const useMoneyHomeNavigation = () => {
  const entryContext = useSelector(selectMoneyEntryContext);

  const navigateHome = useCallback(
    (
      { analyticsContext, pop = true, track }: NavigateToMoneyHomeOptions,
      decision: MoneyEntryDecision,
    ) => {
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

      if (decision.destination === 'splash') {
        if (analyticsContext) {
          NavigationService.navigation.navigate(Routes.MONEY.SPLASH, {
            analyticsContext,
          });
        } else {
          NavigationService.navigation.navigate(Routes.MONEY.SPLASH);
        }
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
    [],
  );

  const navigateToMoneyHome = useCallback(
    ({
      skipOnboardingRedirect = false,
      ...options
    }: NavigateToMoneyHomeOptions = {}) =>
      navigateHome(
        options,
        getMoneyEntryDecision('home', {
          ...entryContext,
          isOnboardingRedirectNeeded:
            !skipOnboardingRedirect && entryContext.isOnboardingRedirectNeeded,
        }),
      ),
    [entryContext, navigateHome],
  );

  return { navigateToMoneyHome };
};
