import { useCallback, useRef, useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { selectIsAccountGroupFunded } from '../../../../selectors/assets/balances';
import { selectSeedlessOnboardingLoginFlow } from '../../../../selectors/seedlessOnboardingController';
import { mobileMfaControllerAdapter } from '../../../../util/identity/mfa/bindings';
import { moneyMfaStore } from '../../../../lib/Money/mfa/moneyMfaStore';
import { moneyMfaHomePromptSession } from '../../../../lib/Money/mfa/moneyMfaHomePromptSession';
import { useMoneyMfa } from './useMoneyMfa';

/**
 * Opens the passkey prompt on the wallet home for social login users, at most
 * once per session, after the wallet has a balance, when Money 2-step
 * verification is available and not set up.
 */
export const useMoneyMfaHomePrompt = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { status } = useMoneyMfa();
  const isFunded = useSelector(selectIsAccountGroupFunded);
  const isSocialLogin = useSelector(selectSeedlessOnboardingLoginFlow);
  const { isHomePromptDismissed } = useSyncExternalStore(
    moneyMfaStore.subscribe,
    moneyMfaStore.getState,
  );
  const pendingCheck = useRef<Promise<boolean> | null>(null);

  const isEligible =
    status === 'not_set_up' &&
    isSocialLogin &&
    isFunded &&
    !isHomePromptDismissed;

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
          if (!isFocused || moneyMfaHomePromptSession.hasPrompted()) {
            return;
          }
          // An existing passkey settles it for the session, so later focuses skip the check.
          moneyMfaHomePromptSession.markPrompted();
          if (hasPasskey) {
            return;
          }
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
