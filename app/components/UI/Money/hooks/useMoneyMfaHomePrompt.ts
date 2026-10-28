import { useCallback, useRef, useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { selectAccountGroupBalanceForEmptyState } from '../../../../selectors/assets/balances';
import { mobileMfaControllerAdapter } from '../../../../util/identity/mfa/bindings';
import { moneyMfaStore } from '../../../../lib/Money/mfa/moneyMfaStore';
import { moneyMfaHomePromptSession } from '../../../../lib/Money/mfa/moneyMfaHomePromptSession';
import { useMoneyMfa } from './useMoneyMfa';

/**
 * Opens the passkey prompt on the wallet home, at most once per session, after
 * the wallet has a balance, when Money 2-step verification is available and not
 * set up.
 */
export const useMoneyMfaHomePrompt = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { status } = useMoneyMfa();
  const balance = useSelector(selectAccountGroupBalanceForEmptyState);
  const { isHomePromptDismissed } = useSyncExternalStore(
    moneyMfaStore.subscribe,
    moneyMfaStore.getState,
  );
  const isChecking = useRef(false);

  const isFunded = (balance?.totalBalanceInUserCurrency ?? 0) > 0;
  const isEligible =
    status === 'not_set_up' && isFunded && !isHomePromptDismissed;

  useFocusEffect(
    useCallback(() => {
      if (
        !isEligible ||
        isChecking.current ||
        moneyMfaHomePromptSession.hasPrompted()
      ) {
        return;
      }
      isChecking.current = true;
      let isFocused = true;
      // The stored credential list may predate this session, so confirm no
      // passkey exists before prompting.
      mobileMfaControllerAdapter
        .refreshEnrolledCredentials()
        .then((credentials) => {
          const hasPasskey = credentials.some(
            ({ type, status: credentialStatus }) =>
              type === 'passkey' && credentialStatus === 'active',
          );
          if (!isFocused || hasPasskey) {
            return;
          }
          moneyMfaHomePromptSession.markPrompted();
          navigation.navigate(Routes.MONEY.MODALS.ROOT, {
            screen: Routes.MONEY.MODALS.MFA_PROMPT_SHEET,
          });
        })
        .catch(() => undefined)
        .finally(() => {
          isChecking.current = false;
        });
      return () => {
        isFocused = false;
      };
    }, [isEligible, navigation]),
  );
};
