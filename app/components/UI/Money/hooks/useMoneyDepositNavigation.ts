import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { MoneyPostOnboardingRedirectType } from '../types/navigation';
import { selectMoneyEntryContext } from '../selectors/entry';
import { getMoneyEntryDecision } from '../navigation/moneyEntryDecision';
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

/**
 * Provides gated deposit navigation separately from `useMoneyHomeNavigation`.
 *
 * `useMoneyAccountDeposit` uses `useConfirmNavigation`, which subscribes to transaction
 * state to manage pending confirmations. Keeping this dependency isolated
 * prevents home-only navigation consumers, including tab bars, from
 * re-rendering whenever transaction state changes.
 */
export const useMoneyDepositNavigation = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const entryContext = useSelector(selectMoneyEntryContext);
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
