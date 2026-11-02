import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService/NavigationService';
import type { NavigationAnalyticsContext } from '../../../../util/analytics/navigationAnalyticsAttribution';
import { strings } from '../../../../../locales/i18n';
import { MoneyPostOnboardingRedirectType } from '../types/navigation';
import { selectMoneyEntryContext } from '../selectors/entry';
import {
  getMoneyEntryDecision,
  type MoneyEntryDecision,
} from '../navigation/moneyEntryDecision';
import { navigateToMoneyHomeRoute } from '../navigation/navigateToMoneyHome';
import {
  useMoneyAccountDeposit,
  type InitiateDepositOptions,
} from './useMoneyAccount';

export interface NavigateToMoneyHomeOptions {
  analyticsContext?: NavigationAnalyticsContext;
  /**
   * Controls whether navigation pops to an existing route, which can show the
   * backward animation. Explore passes `pop: false` to use normal forward
   * navigation into Money Home. Defaults to true.
   */
  pop?: boolean;
  track?: TrackMoneyEntry;
}

export type TrackMoneyEntry = (
  decision: Pick<MoneyEntryDecision, 'redirect_target' | 'button_intent'>,
) => void;

export const useMoneyNavigation = () => {
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

export const useMoneyDepositNavigation = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const entryContext = useSelector(selectMoneyEntryContext);
  const { initiateDeposit } = useMoneyAccountDeposit();

  const navigateToMoneyDeposit = useCallback(
    async ({
      track,
      ...options
    }: InitiateDepositOptions & { track?: TrackMoneyEntry } = {}) => {
      const decision = getMoneyEntryDecision('deposit', entryContext);

      track?.({
        redirect_target: decision.redirect_target,
        button_intent: decision.button_intent,
      });

      if (decision.destination === 'featureDisabled') {
        navigation.navigate(Routes.MONEY.MODALS.DEEPLINK_MODAL, {
          title: strings('money.deeplink_modal.money_account_disabled.title'),
          description: strings(
            'money.deeplink_modal.money_account_disabled.description',
          ),
        });
        return;
      }

      if (decision.destination === 'geoBlockSheet') {
        navigation.navigate(Routes.MONEY.MODALS.ROOT, {
          screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
        });
        return;
      }

      if (decision.destination === 'onboarding') {
        const { preferredPaymentToken, autoSelectFiatPayment, intent } =
          options;
        navigation.navigate(Routes.MONEY.ONBOARDING, {
          postOnboardingRedirect: {
            type: MoneyPostOnboardingRedirectType.DEPOSIT,
            preferredPaymentToken,
            autoSelectFiatPayment,
            intent,
          },
        });
        return;
      }

      await initiateDeposit(options);
    },
    [entryContext, initiateDeposit, navigation],
  );

  return { navigateToMoneyDeposit };
};
