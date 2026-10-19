import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { dismissBanner } from '../../../../reducers/banners';
import { selectDismissedBanners } from '../../../../selectors/banner';
import { selectAccountGroupBalanceForEmptyState } from '../../../../selectors/assets/balances';
import { mobileMfaControllerAdapter } from '../../../../util/identity/mfa/bindings';
import { useMoneyMfa } from './useMoneyMfa';

export const MONEY_MFA_HOME_PROMPT_ID = 'money-mfa-home-prompt';

/**
 * Opens the passkey prompt once on the wallet home after the wallet has a
 * balance, when Money 2-step verification is available and not set up.
 */
export const useMoneyMfaHomePrompt = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const { status } = useMoneyMfa();
  const balance = useSelector(selectAccountGroupBalanceForEmptyState);
  const dismissedBanners = useSelector(selectDismissedBanners);
  const isChecking = useRef(false);

  const isFunded = (balance?.totalBalanceInUserCurrency ?? 0) > 0;
  const isEligible =
    status === 'not_set_up' &&
    isFunded &&
    !dismissedBanners.includes(MONEY_MFA_HOME_PROMPT_ID);

  useFocusEffect(
    useCallback(() => {
      if (!isEligible || isChecking.current) {
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
          dispatch(dismissBanner(MONEY_MFA_HOME_PROMPT_ID));
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
    }, [isEligible, dispatch, navigation]),
  );
};
