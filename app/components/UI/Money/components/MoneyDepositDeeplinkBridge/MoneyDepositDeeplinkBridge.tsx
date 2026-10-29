import { useCallback, useEffect, useRef } from 'react';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Logger from '../../../../../util/Logger';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { selectGeolocationStatus } from '../../../../../selectors/geolocationController';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import { useMoneyOnboardingNavigation } from '../../hooks/useMoneyNavigation';
import { selectIsMoneyAccountGeoEligible } from '../../selectors/eligibility';
import { selectMoneyEnableMoneyAccountFlag } from '../../selectors/featureFlags';
import { MoneyPostOnboardingRedirectType } from '../../types/navigation';
import { isUserRejectedError } from '../../../../../util/errorHandling/isUserRejectedError';

const MoneyDepositDeeplinkBridge = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const isMoneyAccountFeatureEnabled = useSelector(
    selectMoneyEnableMoneyAccountFlag,
  );
  const isMoneyAccountGeoEligible = useSelector(
    selectIsMoneyAccountGeoEligible,
  );
  const geolocationStatus = useSelector(selectGeolocationStatus);
  const { initiateDeposit } = useMoneyAccountDeposit();
  const { isOnboardingRedirectNeeded } = useMoneyOnboardingNavigation();
  const hasHandledRequest = useRef(false);

  const isGeolocationLoading =
    geolocationStatus === undefined ||
    geolocationStatus === 'idle' ||
    geolocationStatus === 'loading';

  const navigateToGeoBlockSheet = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
    });
  }, [navigation]);

  useEffect(() => {
    if (hasHandledRequest.current || isGeolocationLoading) {
      return;
    }

    hasHandledRequest.current = true;

    if (!isMoneyAccountFeatureEnabled) {
      Logger.log(
        '[MoneyDepositDeeplinkBridge] Deposit blocked: Money account feature disabled',
      );
      // Routes.MONEY.MODALS.DEEPLINK_MODAL is a generic modal that accepts title and description strings.
      navigation.navigate(Routes.MONEY.MODALS.DEEPLINK_MODAL, {
        title: strings('money.deeplink_modal.money_account_disabled.title'),
        description: strings(
          'money.deeplink_modal.money_account_disabled.description',
        ),
      });
      return;
    }

    if (!isMoneyAccountGeoEligible) {
      Logger.log(
        '[MoneyDepositDeeplinkBridge] Deposit blocked: user is geo-ineligible',
      );
      navigateToGeoBlockSheet();
      return;
    }

    if (isOnboardingRedirectNeeded) {
      navigation.dispatch((state) => ({
        ...StackActions.replace(Routes.MONEY.ONBOARDING, {
          postOnboardingRedirect: {
            type: MoneyPostOnboardingRedirectType.DEPOSIT,
          },
        }),
        target: state.key,
      }));
      return;
    }

    const startDeposit = async () => {
      try {
        await initiateDeposit({ replaceConfirmation: true });
      } catch (error) {
        if (
          isUserRejectedError(
            error,
            '[MoneyDepositDeeplinkBridge] Deposit cancelled',
          )
        ) {
          return;
        }
        Logger.error(
          error as Error,
          '[MoneyDepositDeeplinkBridge] Failed to initiate deposit',
        );
        navigation.navigate(Routes.WALLET.HOME);
      }
    };

    startDeposit().catch((error) => {
      Logger.error(
        error as Error,
        '[MoneyDepositDeeplinkBridge] startDeposit failed',
      );
    });
  }, [
    isMoneyAccountFeatureEnabled,
    isMoneyAccountGeoEligible,
    isGeolocationLoading,
    initiateDeposit,
    navigateToGeoBlockSheet,
    navigation,
    isOnboardingRedirectNeeded,
  ]);

  return null;
};

export default MoneyDepositDeeplinkBridge;
