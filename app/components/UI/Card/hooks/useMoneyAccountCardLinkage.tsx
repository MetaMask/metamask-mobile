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
  selectIsCardVerified,
  selectIsCardholder,
  selectIsMoneyAccountCardLinkInProgress,
  selectIsMoneyAccountDelegatedForCard,
  selectIsCardResidencyBlocked,
  selectMoneyAccountVedaTokenConfig,
} from '../../../../selectors/cardController';
import {
  selectPendingMoneyAccountCardLink,
  setPendingMoneyAccountCardLink,
} from '../../../../core/redux/slices/card';
import { selectIsMoneyAccountGeoEligible } from '../../Money/selectors/eligibility';
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

/**
 * The user-facing action a linkage submission represents.
 *
 * - `link`: linking a card that is not yet delegated.
 * - `unlink`: revoking an existing delegation (amount of 0).
 * - `update`: changing the spending limit of an already-linked card.
 */
export type LinkageAction = 'link' | 'unlink' | 'update';

const PENDING_TITLE_BY_ACTION: Record<LinkageAction, string> = {
  link: 'money.metamask_card.link_pending_title',
  unlink: 'money.metamask_card.unlink_pending_title',
  update: 'money.metamask_card.update_pending_title',
};

const SUCCESS_TITLE_BY_ACTION: Record<LinkageAction, string> = {
  link: 'money.metamask_card.link_success_title',
  unlink: 'money.metamask_card.unlink_success_title',
  update: 'money.metamask_card.update_success_title',
};

const ERROR_TITLE_BY_ACTION: Record<LinkageAction, string> = {
  link: 'money.metamask_card.link_error',
  unlink: 'money.metamask_card.unlink_error',
  update: 'money.metamask_card.update_error',
};

export interface LinkFlowOrigin {
  screen?: string;
  params?: object;
  entrypoint?: CardEntryPoint;
}

export interface UseMoneyAccountCardLinkageReturn {
  hasMoneyAccountRequirements: boolean;
  hasMoneyAccountBaseRequirements: boolean;
  isCardAuthenticated: boolean;
  isCardVerified: boolean;
  isCardLinkedToMoneyAccount: boolean;
  primaryMoneyAccount: MoneyAccount | undefined;
  moneyAccountCardToken: CardFundingToken | null;
  canLink: boolean;
  isResidencyBlocked: boolean;

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
    const isMoneyAccountGeoEligible = useSelector(
      selectIsMoneyAccountGeoEligible,
    );
    const isMoneyAccountVisible =
      isMoneyAccountEnabled && isMoneyAccountGeoEligible;
    const isCardAuthenticated = useSelector(selectIsCardAuthenticated);
    const isCardVerified = useSelector(selectIsCardVerified);
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
    const isResidencyBlocked = useSelector(selectIsCardResidencyBlocked);
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

    const hasMoneyAccountBaseRequirements = hasMoneyAccountCardRequirements({
      isMoneyAccountEnabled: isMoneyAccountVisible,
      vaultConfig,
      moneyAccountAddress: primaryMoneyAccount?.address,
    });

    const hasRequirements =
      hasMoneyAccountBaseRequirements && Boolean(moneyAccountCardToken);

    const canSubmitDelegation = Boolean(
      hasRequirements &&
        isCardAuthenticated &&
        isCardVerified &&
        moneyAccountCardToken &&
        isMonadSponsorshipEnabled,
    );
    const canLink = Boolean(
      canSubmitDelegation && !isAlreadyDelegated && !isResidencyBlocked,
    );

    const showPendingToast = useCallback(
      (action: LinkageAction) => {
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            {
              label: strings(PENDING_TITLE_BY_ACTION[action]),
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
      (action: LinkageAction) => {
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            {
              label: strings(SUCCESS_TITLE_BY_ACTION[action]),
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
      (action: LinkageAction = 'link') => {
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            {
              label: strings(ERROR_TITLE_BY_ACTION[action]),
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
          if (isResidencyBlocked) {
            trackMoneyAccountLinkingEvent(
              MetaMetricsEvents.CARD_MONEY_ACCOUNT_LINKING_FAILED,
              {
                entrypoint: entrypoint ?? CardEntryPoint.MONEY_LINK_CARD_SHEET,
                reason: CardLinkingFailureReason.RESIDENCY_BLOCKED,
              },
            );
          }
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
        isResidencyBlocked,
        trackMoneyAccountLinkingEvent,
      ],
    );

    const startLinkFlow = useCallback(
      (origin: LinkFlowOrigin): void => {
        if (linkInProgress) {
          return;
        }
        if (!hasMoneyAccountBaseRequirements || !primaryMoneyAccount?.address) {
          showErrorToast();
          return;
        }

        if (isResidencyBlocked) {
          trackMoneyAccountLinkingEvent(
            MetaMetricsEvents.CARD_MONEY_ACCOUNT_LINKING_FAILED,
            {
              entrypoint: origin.entrypoint,
              reason: CardLinkingFailureReason.RESIDENCY_BLOCKED,
            },
          );
          showErrorToast();
          return;
        }

        if (isCardAuthenticated) {
          if (!isCardVerified) {
            return;
          }

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
        hasMoneyAccountBaseRequirements,
        moneyAccountCardToken,
        primaryMoneyAccount?.address,
        isCardAuthenticated,
        isCardVerified,
        isAlreadyDelegated,
        isCardholder,
        isResidencyBlocked,
        openLinkCardSheet,
        showErrorToast,
        navigation,
        dispatch,
        trackMoneyAccountLinkingEvent,
      ],
    );

    useEffect(() => {
      if (!pendingMoneyAccountCardLinkEntryPoint) return;
      if (!isCardAuthenticated) return;

      if (!isCardVerified) {
        if (
          cardHomeDataStatus === 'success' ||
          cardHomeDataStatus === 'error'
        ) {
          dispatch(setPendingMoneyAccountCardLink(null));
        }
        return;
      }

      if (!hasMoneyAccountBaseRequirements || !primaryMoneyAccount?.address) {
        dispatch(setPendingMoneyAccountCardLink(null));
        return;
      }

      if (!isMoneyAccountCardSupported) {
        if (
          cardHomeDataStatus === 'success' ||
          cardHomeDataStatus === 'error'
        ) {
          dispatch(setPendingMoneyAccountCardLink(null));
        }
        return;
      }

      if (isResidencyBlocked) {
        trackMoneyAccountLinkingEvent(
          MetaMetricsEvents.CARD_MONEY_ACCOUNT_LINKING_FAILED,
          {
            entrypoint: pendingMoneyAccountCardLinkEntryPoint,
            reason: CardLinkingFailureReason.RESIDENCY_BLOCKED,
          },
        );
        dispatch(setPendingMoneyAccountCardLink(null));
        showErrorToast();
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
      isCardVerified,
      hasMoneyAccountBaseRequirements,
      isMoneyAccountCardSupported,
      moneyAccountCardToken,
      primaryMoneyAccount?.address,
      isAlreadyDelegated,
      isResidencyBlocked,
      cardHomeDataStatus,
      openLinkCardSheet,
      dispatch,
      showErrorToast,
      trackMoneyAccountLinkingEvent,
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
        // A non-zero submission against an already-linked card is a spending
        // limit update, not an initial link — surface the correct copy.
        const action: LinkageAction = isRevoke
          ? 'unlink'
          : isAlreadyDelegated
            ? 'update'
            : 'link';
        const isRevokeWithoutOwnedDelegation = isRevoke && !isAlreadyDelegated;
        const isBlockedByResidency =
          !isRevoke && isResidencyBlocked && !isAlreadyDelegated;

        if (
          !canSubmitDelegation ||
          !primaryMoneyAccount?.address ||
          isRevokeWithoutOwnedDelegation ||
          isBlockedByResidency
        ) {
          trackMoneyAccountLinkingEvent(
            MetaMetricsEvents.CARD_MONEY_ACCOUNT_LINKING_FAILED,
            {
              entrypoint,
              reason: isBlockedByResidency
                ? CardLinkingFailureReason.RESIDENCY_BLOCKED
                : CardLinkingFailureReason.PRECONDITION_FAILED,
              is_revoke: isRevoke,
            },
          );
          showErrorToast(action);
          return false;
        }

        if (Engine.context.CardController.isLinkageInProgress()) {
          return false;
        }

        setStatus('pending');
        setError(null);
        showPendingToast(action);

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
          showSuccessToast(action);
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
          showErrorToast(action);
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
        isResidencyBlocked,
        isAlreadyDelegated,
      ],
    );

    const reset = useCallback(() => {
      setStatus('idle');
      setError(null);
    }, []);

    return {
      hasMoneyAccountRequirements: hasRequirements,
      hasMoneyAccountBaseRequirements,
      isCardAuthenticated,
      isCardVerified,
      isCardLinkedToMoneyAccount: isAlreadyDelegated,
      primaryMoneyAccount,
      moneyAccountCardToken,
      canLink,
      isResidencyBlocked,

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
