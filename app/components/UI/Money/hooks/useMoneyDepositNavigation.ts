import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { MoneyPostOnboardingRedirectType } from '../types/navigation';
import {
  selectMoneyCtaEntryContext,
  selectMoneyEntryContext,
} from '../selectors/entry';
import {
  getMoneyEntryDecision,
  type MoneyEntryContext,
} from '../navigation/moneyEntryDecision';
import {
  useMoneyAccountDeposit,
  type InitiateDepositOptions,
} from './useMoneyAccount';
import type { TrackMoneyEntry } from './useMoneyNavigation.types';

interface NavigateToMoneyDepositOptions extends InitiateDepositOptions {
  /**
   * Skips the onboarding redirect when continuing a deposit after onboarding.
   */
  isPostOnboardingContinuation?: boolean;
  track?: TrackMoneyEntry;
}

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
 *
 * `useMoneyAccountDeposit` uses `useConfirmNavigation`, which subscribes to transaction
 * state to manage pending confirmations. Keeping this dependency isolated
 * prevents home-only navigation consumers, including tab bars, from
 * re-rendering whenever transaction state changes.
 */
export const useMoneyDepositNavigation = () =>
  useDepositNavigation(useSelector(selectMoneyEntryContext));

/**
 * Deposit entry for token, Explore and Earn CTAs, which show the intro splash
 * before onboarding while it is enabled.
 */
export const useMoneyCtaDepositNavigation = () =>
  useDepositNavigation(useSelector(selectMoneyCtaEntryContext));
