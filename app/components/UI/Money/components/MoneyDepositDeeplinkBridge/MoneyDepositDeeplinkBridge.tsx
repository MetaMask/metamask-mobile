import { useCallback, useEffect, useMemo, useRef } from 'react';
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
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
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

  const { initiateDeposit } = useMoneyAccountDeposit();
  const entryContext = useSelector(selectMoneyEntryContext);
  const hasHandledRequest = useRef(false);

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

    const decision = getMoneyEntryDecision('deposit', entryContext);

    if (decision.destination === 'geoBlockSheet') {
      Logger.log(
        '[MoneyDepositDeeplinkBridge] Deposit blocked: user is geo-ineligible',
      );
      navigateToGeoBlockSheet();
      return;
    }

    if (decision.destination === 'onboarding') {
      navigation.dispatch((state) => ({
        ...StackActions.replace(Routes.MONEY.ONBOARDING, {
          postOnboardingRedirect: {
            type: MoneyPostOnboardingRedirectType.DEPOSIT,
            ...(preferredPaymentToken ? { preferredPaymentToken } : {}),
          },
        }),
        target: state.key,
      }));
      return;
    }

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
    entryContext,
    isGeolocationLoading,
    initiateDeposit,
    navigateToGeoBlockSheet,
    navigation,
    preferredPaymentToken,
  ]);

  return null;
};

export default MoneyDepositDeeplinkBridge;
