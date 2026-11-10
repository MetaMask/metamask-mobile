import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService/NavigationService';
import type { NavigationAnalyticsContext } from '../../../../util/analytics/navigationAnalyticsAttribution';
import { strings } from '../../../../../locales/i18n';
import { MoneyPostOnboardingRedirectType } from '../types/navigation';
import {
  selectMoneyCtaEntryContext,
  selectMoneyEntryContext,
} from '../selectors/entry';
import {
  getMoneyEntryDecision,
  type MoneyEntryContext,
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
  /**
   * Skips the Rive onboarding redirect for callers that already showed another
   * Money intro, such as the splash.
   */
  skipOnboardingRedirect?: boolean;
  track?: TrackMoneyEntry;
}

export type TrackMoneyEntry = (
  decision: Pick<MoneyEntryDecision, 'redirect_target' | 'button_intent'>,
) => void;

interface NavigateToMoneyDepositOptions extends InitiateDepositOptions {
  /**
   * Skips the onboarding redirect when continuing a deposit after onboarding.
   */
  isPostOnboardingContinuation?: boolean;
  track?: TrackMoneyEntry;
}

export const useMoneyNavigation = () => {
  const entryContext = useSelector(selectMoneyEntryContext);
  const ctaEntryContext = useSelector(selectMoneyCtaEntryContext);

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

  /**
   * Money home entry from a CTA surface, which shows the intro splash before
   * onboarding/home while it is enabled.
   */
  const navigateToMoneyHomeFromCta = useCallback(
    (options?: NavigateToMoneyHomeOptions) =>
      navigateHome(
        options ?? {},
        getMoneyEntryDecision('home', ctaEntryContext),
      ),
    [ctaEntryContext, navigateHome],
  );

  return { navigateToMoneyHome, navigateToMoneyHomeFromCta };
};

const useDepositNavigation = (entryContext: MoneyEntryContext) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { initiateDeposit } = useMoneyAccountDeposit();

  const navigateToMoneyDeposit = useCallback(
    async ({
      isPostOnboardingContinuation = false,
      track,
      ...options
    }: NavigateToMoneyDepositOptions = {}) => {
      const decision = getMoneyEntryDecision('deposit', {
        ...entryContext,
        isOnboardingRedirectNeeded:
          !isPostOnboardingContinuation &&
          entryContext.isOnboardingRedirectNeeded,
      });

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

      if (
        decision.destination === 'splash' ||
        decision.destination === 'onboarding'
      ) {
        const { preferredPaymentToken, autoSelectFiatPayment, intent } =
          options;
        navigation.navigate(
          decision.destination === 'splash'
            ? Routes.MONEY.SPLASH
            : Routes.MONEY.ONBOARDING,
          {
            postOnboardingRedirect: {
              type: MoneyPostOnboardingRedirectType.DEPOSIT,
              preferredPaymentToken,
              autoSelectFiatPayment,
              intent,
            },
          },
        );
        return;
      }

      await initiateDeposit(options);
    },
    [entryContext, initiateDeposit, navigation],
  );

  return { navigateToMoneyDeposit };
};

/**
 * Deposit entry for tab, deeplink and wallet-home surfaces, which keep the
 * Rive onboarding.
 */
export const useMoneyDepositNavigation = () =>
  useDepositNavigation(useSelector(selectMoneyEntryContext));

/**
 * Deposit entry for token, Explore and Earn CTAs, which show the intro splash
 * before onboarding while it is enabled.
 */
export const useMoneyCtaDepositNavigation = () =>
  useDepositNavigation(useSelector(selectMoneyCtaEntryContext));
