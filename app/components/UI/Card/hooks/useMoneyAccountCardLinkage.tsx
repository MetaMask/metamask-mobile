import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Icon,
  IconColor,
  IconSize,
  Spinner,
} from '@metamask/design-system-react-native';
import type { MoneyAccount } from '@metamask/money-account-controller';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../util/theme';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { getGasFeesSponsoredNetworkEnabled } from '../../../../selectors/featureFlagController/gasFeesSponsored';
import { selectCardFeatureFlag } from '../../../../selectors/featureFlagController/card';
import {
  selectCardDelegationSettings,
  selectCardHomeDataStatus,
  selectIsCardAuthenticated,
  selectIsCardholder,
  selectIsMoneyAccountCardLinkInProgress,
  selectIsMoneyAccountDelegatedForCard,
  selectMoneyAccountVedaTokenConfig,
} from '../../../../selectors/cardController';
import {
  selectPendingMoneyAccountCardLink,
  setPendingMoneyAccountCardLink,
} from '../../../../core/redux/slices/card';
import { selectMoneyEnableMoneyAccountFlag } from '../../Money/selectors/featureFlags';
import {
  hasMoneyAccountCardRequirements,
  resolveMoneyAccountCardToken,
} from '../../../../core/Engine/controllers/card-controller/utils/moneyAccountCardToken';
import { CardLinkageInProgressError } from '../../../../core/Engine/controllers/card-controller/provider-types';
import { BAANX_MAX_LIMIT } from '../constants';
import { isMoneyAccountCardTokenAllowlisted } from '../util/vedaToken';
import { CardFundingToken } from '../types';
import { UserCancelledError } from './useCardDelegation';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  IMetaMetricsEvent,
  MetaMetricsEvents,
} from '../../../../core/Analytics';
import {
  CardEntryPoint,
  CardFlow,
  CardLinkingFailureReason,
} from '../util/metrics';

export type LinkageStatus =
  | 'idle'
  | 'pending'
  | 'success'
  | 'error'
  | 'cancelled';

export interface LinkFlowOrigin {
  screen: string;
  params?: object;
  entrypoint?: CardEntryPoint;
}

export interface UseMoneyAccountCardLinkageReturn {
  hasMoneyAccountRequirements: boolean;
  isCardAuthenticated: boolean;
  isCardLinkedToMoneyAccount: boolean;
  primaryMoneyAccount: MoneyAccount | undefined;
  moneyAccountCardToken: CardFundingToken | null;
  canLink: boolean;

  status: LinkageStatus;
  isLinking: boolean;
  error: Error | null;

  startLinkFlow: (origin: LinkFlowOrigin) => void;
  openLinkCardSheet: (entrypoint?: CardEntryPoint | string) => void;
  confirmLinkInBackground: (options?: {
    delegationAmountHuman?: string;
    entrypoint?: CardEntryPoint | string;
  }) => Promise<boolean>;
  reset: () => void;
}

/**
 * UI-only hook that wraps `CardController.linkMoneyAccountCard` and owns the
 * pending / success / error / cancel toasts.
 *
 * Business logic — on-chain signing, transaction submission, confirmation
 * waiting and provider reporting — lives entirely in the controller. This hook
 * is a thin orchestration layer for the screen wiring it.
 */
export const useMoneyAccountCardLinkage =
  (): UseMoneyAccountCardLinkageReturn => {
    const { toastRef } = useContext(ToastContext);
    const theme = useTheme();
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const { trackEvent, createEventBuilder } = useAnalytics();

    const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
    const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
    const isMoneyAccountEnabled = useSelector(
      selectMoneyEnableMoneyAccountFlag,
    );
    const isCardAuthenticated = useSelector(selectIsCardAuthenticated);
    const isCardholder = useSelector(selectIsCardholder);
    const delegationSettings = useSelector(selectCardDelegationSettings);
    const vedaConfig = useSelector(selectMoneyAccountVedaTokenConfig);
    const cardFeatureFlag = useSelector(selectCardFeatureFlag);
    const cardHomeDataStatus = useSelector(selectCardHomeDataStatus);
    const isAlreadyDelegated = useSelector(
      selectIsMoneyAccountDelegatedForCard,
    );
    const pendingMoneyAccountCardLinkEntryPoint = useSelector(
      selectPendingMoneyAccountCardLink,
    );
    const linkInProgress = useSelector(selectIsMoneyAccountCardLinkInProgress);
    const isMonadSponsorshipEnabled = useSelector(
      getGasFeesSponsoredNetworkEnabled,
    )(vaultConfig?.chainId ?? '');

    const [status, setStatus] = useState<LinkageStatus>('idle');
    const [error, setError] = useState<Error | null>(null);

    const rawMoneyAccountCardToken = useMemo(
      () => resolveMoneyAccountCardToken(delegationSettings),
      [delegationSettings],
    );

    const isMoneyAccountCardSupported = useMemo(
      () =>
        isMoneyAccountCardTokenAllowlisted(cardFeatureFlag?.chains, vedaConfig),
      [cardFeatureFlag, vedaConfig],
    );

    const moneyAccountCardToken = isMoneyAccountCardSupported
      ? rawMoneyAccountCardToken
      : null;

    const hasRequirements =
      hasMoneyAccountCardRequirements({
        isMoneyAccountEnabled,
        vaultConfig,
        moneyAccountAddress: primaryMoneyAccount?.address,
      }) && isMoneyAccountCardSupported;

    const canSubmitDelegation = Boolean(
      hasRequirements &&
        isCardAuthenticated &&
        moneyAccountCardToken &&
        isMonadSponsorshipEnabled,
    );
    const canLink = Boolean(canSubmitDelegation && !isAlreadyDelegated);

    const showPendingToast = useCallback(
      (isRevoke: boolean = false) => {
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            {
              label: strings(
                isRevoke
                  ? 'money.metamask_card.unlink_pending_title'
                  : 'money.metamask_card.link_pending_title',
              ),
            },
          ],
          iconName: IconName.Loading,
          hasNoTimeout: true,
          startAccessory: (
            <Box twClassName="pr-3">
              <Spinner
                color={IconColor.IconDefault}
                spinnerIconProps={{ size: IconSize.Lg }}
              />
            </Box>
          ),
        });
      },
      [toastRef],
    );

    const showSuccessToast = useCallback(
      (isRevoke: boolean = false) => {
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            {
              label: strings(
                isRevoke
                  ? 'money.metamask_card.unlink_success_title'
                  : 'money.metamask_card.link_success_title',
              ),
            },
          ],
          iconName: IconName.Confirmation,
          iconColor: theme.colors.success.default,
          hasNoTimeout: false,
          startAccessory: (
            <Box twClassName="pr-3">
              <Icon
                name={IconName.Confirmation}
                color={IconColor.SuccessDefault}
                size={IconSize.Lg}
              />
            </Box>
          ),
        });
      },
      [theme.colors.success.default, toastRef],
    );

    const showErrorToast = useCallback(
      (isRevoke: boolean = false) => {
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            {
              label: strings(
                isRevoke
                  ? 'money.metamask_card.unlink_error'
                  : 'money.metamask_card.link_error',
              ),
            },
          ],
          iconName: IconName.Error,
          iconColor: theme.colors.error.default,
          hasNoTimeout: false,
          startAccessory: (
            <Box twClassName="pr-3">
              <Icon
                name={IconName.Error}
                color={IconColor.ErrorDefault}
                size={IconSize.Lg}
              />
            </Box>
          ),
        });
      },
      [theme.colors.error.default, toastRef],
    );

    const trackMoneyAccountLinkingEvent = useCallback(
      (
        eventName: IMetaMetricsEvent,
        properties: Record<string, string | boolean | undefined> = {},
      ) => {
        trackEvent(
          createEventBuilder(eventName)
            .addProperties({
              flow: CardFlow.MONEY_ACCOUNT_LINKAGE,
              ...properties,
            })
            .build(),
        );
      },
      [trackEvent, createEventBuilder],
    );

    const openLinkCardSheet = useCallback(
      (entrypoint?: CardEntryPoint | string): void => {
        if (linkInProgress) {
          return;
        }
        if (!canLink || !primaryMoneyAccount?.address) {
          showErrorToast();
          return;
        }
        navigation.navigate(Routes.MONEY.MODALS.ROOT, {
          screen: Routes.MONEY.MODALS.LINK_CARD_SHEET,
          params: {
            entrypoint: entrypoint ?? CardEntryPoint.MONEY_LINK_CARD_SHEET,
          },
        });
      },
      [
        linkInProgress,
        canLink,
        primaryMoneyAccount?.address,
        navigation,
        showErrorToast,
      ],
    );

    const startLinkFlow = useCallback(
      (origin: LinkFlowOrigin): void => {
        if (linkInProgress) {
          return;
        }
        if (!hasRequirements || !primaryMoneyAccount?.address) {
          showErrorToast();
          return;
        }

        if (isCardAuthenticated) {
          if (isAlreadyDelegated) {
            return;
          }

          if (!moneyAccountCardToken) {
            showErrorToast();
            return;
          }

          openLinkCardSheet(origin.entrypoint);
          return;
        }

        if (isCardholder) {
          dispatch(
            setPendingMoneyAccountCardLink(
              origin.entrypoint ?? CardEntryPoint.MONEY_LINK_CARD_SHEET,
            ),
          );
          navigation.navigate(Routes.CARD.ROOT, {
            screen: Routes.CARD.HOME,
            params: {
              screen: Routes.CARD.AUTHENTICATION,
              params: { postAuthRedirect: origin, showAuthPrompt: true },
            },
          });
          return;
        }

        navigation.navigate(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.ONBOARDING.ROOT,
            params: { postAuthRedirect: origin },
          },
        });
      },
      [
        linkInProgress,
        hasRequirements,
        moneyAccountCardToken,
        primaryMoneyAccount?.address,
        isCardAuthenticated,
        isAlreadyDelegated,
        isCardholder,
        openLinkCardSheet,
        showErrorToast,
        navigation,
        dispatch,
      ],
    );

    useEffect(() => {
      if (!pendingMoneyAccountCardLinkEntryPoint) return;
      if (!isCardAuthenticated) return;

      if (!hasRequirements || !primaryMoneyAccount?.address) {
        dispatch(setPendingMoneyAccountCardLink(null));
        return;
      }

      if (isAlreadyDelegated) {
        dispatch(setPendingMoneyAccountCardLink(null));
        return;
      }

      if (!moneyAccountCardToken) {
        if (
          cardHomeDataStatus === 'success' ||
          cardHomeDataStatus === 'error'
        ) {
          dispatch(setPendingMoneyAccountCardLink(null));
        }
        return;
      }

      const entrypoint = pendingMoneyAccountCardLinkEntryPoint;
      dispatch(setPendingMoneyAccountCardLink(null));
      openLinkCardSheet(entrypoint);
    }, [
      pendingMoneyAccountCardLinkEntryPoint,
      isCardAuthenticated,
      hasRequirements,
      moneyAccountCardToken,
      primaryMoneyAccount?.address,
      isAlreadyDelegated,
      cardHomeDataStatus,
      openLinkCardSheet,
      dispatch,
    ]);

    const confirmLinkInBackground = useCallback(
      async (options?: {
        delegationAmountHuman?: string;
        entrypoint?: CardEntryPoint | string;
      }): Promise<boolean> => {
        const entrypoint =
          options?.entrypoint ?? CardEntryPoint.MONEY_LINK_CARD_SHEET;
        const isRevoke =
          options?.delegationAmountHuman !== undefined &&
          parseFloat(options.delegationAmountHuman) === 0;

        if (!canSubmitDelegation || !primaryMoneyAccount?.address) {
          trackMoneyAccountLinkingEvent(
            MetaMetricsEvents.CARD_MONEY_ACCOUNT_LINKING_FAILED,
            {
              entrypoint,
              reason: CardLinkingFailureReason.PRECONDITION_FAILED,
              is_revoke: isRevoke,
            },
          );
          showErrorToast(isRevoke);
          return false;
        }

        if (Engine.context.CardController.isLinkageInProgress()) {
          return false;
        }

        setStatus('pending');
        setError(null);
        showPendingToast(isRevoke);

        try {
          trackMoneyAccountLinkingEvent(
            MetaMetricsEvents.CARD_MONEY_ACCOUNT_LINKING_STARTED,
            {
              entrypoint,
              is_revoke: isRevoke,
            },
          );
          await Engine.context.CardController.linkMoneyAccountCard({
            moneyAccountAddress: primaryMoneyAccount.address,
            delegationAmountHuman:
              options?.delegationAmountHuman ?? BAANX_MAX_LIMIT,
          });
          trackMoneyAccountLinkingEvent(
            MetaMetricsEvents.CARD_MONEY_ACCOUNT_LINKING_COMPLETED,
            {
              entrypoint,
              is_revoke: isRevoke,
            },
          );
          setStatus('success');
          showSuccessToast(isRevoke);
          return true;
        } catch (caught) {
          const linkageError =
            caught instanceof Error ? caught : new Error(String(caught));

          if (linkageError instanceof UserCancelledError) {
            trackMoneyAccountLinkingEvent(
              MetaMetricsEvents.CARD_MONEY_ACCOUNT_LINKING_FAILED,
              {
                entrypoint,
                reason: CardLinkingFailureReason.USER_CANCELLED,
                is_revoke: isRevoke,
              },
            );
            setStatus('cancelled');
            return false;
          }

          if (linkageError instanceof CardLinkageInProgressError) {
            trackMoneyAccountLinkingEvent(
              MetaMetricsEvents.CARD_MONEY_ACCOUNT_LINKING_FAILED,
              {
                entrypoint,
                reason: CardLinkingFailureReason.CONTROLLER_FAILED,
                error_name: linkageError.name,
                is_revoke: isRevoke,
              },
            );
            setStatus('idle');
            setError(null);
            return false;
          }

          trackMoneyAccountLinkingEvent(
            MetaMetricsEvents.CARD_MONEY_ACCOUNT_LINKING_FAILED,
            {
              entrypoint,
              reason:
                caught instanceof Error
                  ? CardLinkingFailureReason.CONTROLLER_FAILED
                  : CardLinkingFailureReason.UNKNOWN,
              error_name: linkageError.name,
              is_revoke: isRevoke,
            },
          );
          Logger.error(linkageError, 'useMoneyAccountCardLinkage failed');
          setError(linkageError);
          setStatus('error');
          showErrorToast(isRevoke);
          return false;
        }
      },
      [
        canSubmitDelegation,
        primaryMoneyAccount?.address,
        showErrorToast,
        showPendingToast,
        showSuccessToast,
        trackMoneyAccountLinkingEvent,
      ],
    );

    const reset = useCallback(() => {
      setStatus('idle');
      setError(null);
    }, []);

    return {
      hasMoneyAccountRequirements: hasRequirements,
      isCardAuthenticated,
      isCardLinkedToMoneyAccount: isAlreadyDelegated,
      primaryMoneyAccount,
      moneyAccountCardToken,
      canLink,

      status,
      isLinking: linkInProgress,
      error,

      startLinkFlow,
      openLinkCardSheet,
      confirmLinkInBackground,
      reset,
    };
  };

export default useMoneyAccountCardLinkage;
