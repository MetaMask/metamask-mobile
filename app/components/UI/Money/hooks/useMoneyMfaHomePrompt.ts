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
  const pendingCheck = useRef<Promise<boolean> | null>(null);

  const isFunded = (balance?.totalBalanceInUserCurrency ?? 0) > 0;
  const isEligible =
    status === 'not_set_up' && isFunded && !isHomePromptDismissed;

  useFocusEffect(
    useCallback(() => {
      if (!isEligible || moneyMfaHomePromptSession.hasPrompted()) {
        return;
      }
      let isFocused = true;
      // The stored credential list may predate this session, so confirm no
      // passkey exists before prompting. A focus during a check reuses it.
      pendingCheck.current ??= mobileMfaControllerAdapter
        .refreshEnrolledCredentials()
        .then((credentials) =>
          credentials.some(
            ({ type, status: credentialStatus }) =>
              type === 'passkey' && credentialStatus === 'active',
          ),
        )
        .finally(() => {
          pendingCheck.current = null;
        });
      pendingCheck.current
        .then((hasPasskey) => {
          if (
            !isFocused ||
            hasPasskey ||
            moneyMfaHomePromptSession.hasPrompted()
          ) {
            return;
          }
          moneyMfaHomePromptSession.markPrompted();
          navigation.navigate(Routes.MONEY.MODALS.ROOT, {
            screen: Routes.MONEY.MODALS.MFA_PROMPT_SHEET,
          });
        })
        .catch(() => undefined);
      return () => {
        isFocused = false;
      };
    }, [isEligible, navigation]),
  );
};
