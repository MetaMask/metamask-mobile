import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { toHex } from '@metamask/controller-utils';
import type {
  AppNavigationProp,
  RootStackParamList,
} from '../../../../../core/NavigationService/types';
import Logger from '../../../../../util/Logger';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { selectGeolocationStatus } from '../../../../../selectors/geolocationController';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import useMoneyToasts from '../../hooks/useMoneyToasts';
import { selectMoneyEntryContext } from '../../selectors/entry';
import { selectHighestBalanceAaveTokenMeetingDepositMinimum } from '../../selectors/aaveOutputTokenEligibility';
import { selectMoneyEnableMoneyAccountFlag } from '../../selectors/featureFlags';
import {
  MoneyDepositTokenType,
  MoneyPostOnboardingRedirectType,
  type MoneyPreferredPaymentToken,
} from '../../types/navigation';
import { getMoneyEntryDecision } from '../../navigation/moneyEntryDecision';
import { isUserRejectedError } from '../../../../../util/errorHandling/isUserRejectedError';

type MoneyDepositDeeplinkRouteProp = RouteProp<
  RootStackParamList,
  'MoneyDepositDeeplink'
>;

export const MONEY_DEPOSIT_DEEPLINK_READINESS_TIMEOUT_MS = 10000;

const MoneyDepositDeeplinkBridge = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<MoneyDepositDeeplinkRouteProp>();
  const tokenType = route.params?.tokenType;
  const isMoneyAccountFeatureEnabled = useSelector(
    selectMoneyEnableMoneyAccountFlag,
  );
  const geolocationStatus = useSelector(selectGeolocationStatus);
  const highestBalanceAaveTokenMeetingDepositMinimum = useSelector(
    selectHighestBalanceAaveTokenMeetingDepositMinimum,
  );

  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);

  const { initiateDeposit } = useMoneyAccountDeposit();
  const { showToast, MoneyToastOptions } = useMoneyToasts();
  const entryContext = useSelector(selectMoneyEntryContext);
  const hasHandledRequest = useRef(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  const hasMoneyAccount = Boolean(primaryMoneyAccount?.address);

  const isGeolocationLoading =
    geolocationStatus === undefined ||
    geolocationStatus === 'idle' ||
    geolocationStatus === 'loading';

  const preferredPaymentToken = useMemo<
    MoneyPreferredPaymentToken | undefined
  >(() => {
    if (
      tokenType !== MoneyDepositTokenType.ATOKEN ||
      !highestBalanceAaveTokenMeetingDepositMinimum?.address ||
      !highestBalanceAaveTokenMeetingDepositMinimum.chainId
    ) {
      return undefined;
    }

    return {
      address: toHex(highestBalanceAaveTokenMeetingDepositMinimum.address),
      chainId: toHex(highestBalanceAaveTokenMeetingDepositMinimum.chainId),
    };
  }, [highestBalanceAaveTokenMeetingDepositMinimum, tokenType]);

  const navigateToGeoBlockSheet = useCallback(() => {
    navigation.dispatch((state) => ({
      ...StackActions.replace(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
      }),
      target: state.key,
    }));
  }, [navigation]);

  const closeBridgeWithFailure = useCallback(() => {
    const state = navigation.getState();
    // Once the confirmation has replaced this route, the deposit hook has
    // already rolled back and reported the failure.
    if (!state.routes.some(({ key }) => key === route.key)) {
      return;
    }

    navigation.dispatch({
      ...StackActions.pop(),
      source: route.key,
      target: state.key,
    });
    showToast(MoneyToastOptions.deposit.failed({ intent: 'addMusd' }));
  }, [MoneyToastOptions.deposit, navigation, route.key, showToast]);

  useEffect(() => {
    const timeout = setTimeout(
      () => setHasTimedOut(true),
      MONEY_DEPOSIT_DEEPLINK_READINESS_TIMEOUT_MS,
    );

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (hasHandledRequest.current) {
      return;
    }

    if (hasTimedOut) {
      hasHandledRequest.current = true;
      Logger.error(new Error('Deposit deeplink readiness timed out'), {
        tags: { feature: 'money' },
        context: {
          name: 'money_deposit_deeplink_bridge',
          data: {
            geolocationStatus: geolocationStatus ?? 'unset',
            hasMoneyAccount,
          },
        },
      });
      closeBridgeWithFailure();
      return;
    }

    if (isGeolocationLoading) {
      return;
    }

    if (!isMoneyAccountFeatureEnabled) {
      hasHandledRequest.current = true;
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

    const decision = getMoneyEntryDecision('deposit', entryContext);

    if (decision.destination === 'geoBlockSheet') {
      hasHandledRequest.current = true;
      Logger.log(
        '[MoneyDepositDeeplinkBridge] Deposit blocked: user is geo-ineligible',
      );
      navigateToGeoBlockSheet();
      return;
    }

    if (decision.destination === 'splash') {
      hasHandledRequest.current = true;
      navigation.dispatch((state) => ({
        ...StackActions.replace(Routes.MONEY.SPLASH, {
          postOnboardingRedirect: {
            type: MoneyPostOnboardingRedirectType.DEPOSIT,
            ...(preferredPaymentToken ? { preferredPaymentToken } : {}),
          },
        }),
        target: state.key,
      }));
      return;
    }

    if (!hasMoneyAccount) {
      return;
    }

    hasHandledRequest.current = true;

    const startDeposit = async () => {
      try {
        await initiateDeposit({
          ...(preferredPaymentToken ? { preferredPaymentToken } : {}),
          replaceConfirmation: true,
        });
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
        closeBridgeWithFailure();
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
    entryContext,
    isGeolocationLoading,
    hasMoneyAccount,
    hasTimedOut,
    geolocationStatus,
    closeBridgeWithFailure,
    initiateDeposit,
    navigateToGeoBlockSheet,
    navigation,
    preferredPaymentToken,
  ]);

  return null;
};

export default MoneyDepositDeeplinkBridge;
