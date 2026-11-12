import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useDispatch, useSelector } from 'react-redux';
import {
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
  selectCardHomeData,
  selectCardHomeDataStatus,
  selectIsCardAuthenticated,
  selectIsCardVerified,
  selectIsCardholder,
  selectIsMoneyAccountCardLinkInProgress,
  selectIsMoneyAccountDelegatedForCard,
  selectIsCardResidencyBlocked,
  selectMoneyAccountVedaTokenConfig,
  selectCardActiveProviderId,
  selectCardSignInLink,
  selectImmersveFundingChannelForSelectedCountry,
  selectImmersveMoneyAccountMode,
} from '../../../../selectors/cardController';
import {
  selectPendingMoneyAccountCardLink,
  setPendingMoneyAccountCardLink,
} from '../../../../core/redux/slices/card';
import { selectIsMoneyAccountVisible } from '../../Money/selectors/visibility';
import {
  hasMoneyAccountCardRequirements,
  resolveMoneyAccountCardToken,
} from '../../../../core/Engine/controllers/card-controller/utils/moneyAccountCardToken';
import {
  CardLinkageInProgressError,
  type CardProviderId,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import { BAANX_MAX_LIMIT } from '../constants';
import {
  isMoneyAccountCardTokenAllowlisted,
  MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
  MONEY_ACCOUNT_DISPLAY_SYMBOL,
} from '../util/vedaToken';
import { CardFundingToken, FundingStatus } from '../types';
import { useCardCapabilities } from './useCardCapabilities';
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
  withCardProvider,
} from '../util/metrics';
import {
  BOTTOM_SHEET_NAMES,
  SCREEN_NAMES,
} from '../../Money/constants/moneyEventLocations';

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

export interface ConfirmLinkInBackgroundOptions {
  delegationAmountHuman?: string;
  entrypoint?: CardEntryPoint | string;
  /**
   * Delay every toast until this resolves. Nothing shows before then,
   * including a failed precondition. On resolve, a link that is still running
   * shows the pending toast, a failure shows the error toast, and a success
   * or cancellation shows nothing. After resolve, toasts behave as usual.
   */
  holdToastsUntil?: Promise<void>;
  /**
   * When false, success closes the pending toast instead of showing
   * "Your card is ready to use". Defaults to true.
   */
  showSuccessToast?: boolean;
}

const supportsMoneyAccountLinking = (
  capabilities: { supportsMoneyAccountLinking?: boolean } | null,
  whenUnknown: boolean,
): boolean => capabilities?.supportsMoneyAccountLinking ?? whenUnknown;

const signInProviderSupportsLinking = (
  providerId?: CardProviderId,
): boolean => {
  if (!providerId) return true;

  try {
    return supportsMoneyAccountLinking(
      Engine.context?.CardController?.getCapabilities(providerId) ?? null,
      true,
    );
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to read sign-in provider capabilities',
    );
    return true;
  }
};

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
  isMoneyAccountLinkingSupported: boolean;
  isMoneyCardSectionAvailable: boolean;
  /** False when the active provider has no Baanx-style verification status. */
  reportsVerificationStatus: boolean;

  status: LinkageStatus;
  isLinking: boolean;
  error: Error | null;

  getLinkFlowRedirectTarget: () =>
    | SCREEN_NAMES.CARD_HOME
    | BOTTOM_SHEET_NAMES.CARD_LINK_SHEET
    | undefined;
  startLinkFlow: (origin: LinkFlowOrigin) => void;
  openLinkCardSheet: (entrypoint?: CardEntryPoint | string) => void;
  confirmLinkInBackground: (
    options?: ConfirmLinkInBackgroundOptions,
  ) => Promise<boolean>;
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
export const useMoneyAccountCardLinkage = ({
  consumesPendingLink = true,
}: {
  /**
   * When false, this instance does not run the pending-link effect. Callers
   * that only need `confirmLinkInBackground` on a screen that already mounts
   * the hook must opt out, or one pending link is handled once per instance.
   */
  consumesPendingLink?: boolean;
} = {}): UseMoneyAccountCardLinkageReturn => {
  const { toastRef } = useContext(ToastContext);
  const theme = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const activeProviderId = useSelector(selectCardActiveProviderId);

  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const isMoneyAccountVisible = useSelector(selectIsMoneyAccountVisible);
  const isCardAuthenticated = useSelector(selectIsCardAuthenticated);
  const isCardVerified = useSelector(selectIsCardVerified);
  const isCardholder = useSelector(selectIsCardholder);
  const delegationSettings = useSelector(selectCardDelegationSettings);
  const vedaConfig = useSelector(selectMoneyAccountVedaTokenConfig);
  const fundingChannel = useSelector(
    selectImmersveFundingChannelForSelectedCountry,
  );
  const isImmersveMoneyAccountMode = useSelector(
    selectImmersveMoneyAccountMode,
  );
  const cardFeatureFlag = useSelector(selectCardFeatureFlag);
  const cardHomeData = useSelector(selectCardHomeData);
  const cardHomeDataStatus = useSelector(selectCardHomeDataStatus);
  const isAlreadyDelegated = useSelector(selectIsMoneyAccountDelegatedForCard);
  const pendingMoneyAccountCardLinkEntryPoint = useSelector(
    selectPendingMoneyAccountCardLink,
  );
  const linkInProgress = useSelector(selectIsMoneyAccountCardLinkInProgress);
  const isResidencyBlocked = useSelector(selectIsCardResidencyBlocked);
  const capabilities = useCardCapabilities();
  const signInLink = useSelector(selectCardSignInLink);
  const isMoneyAccountLinkingSupported =
    !isCardAuthenticated || supportsMoneyAccountLinking(capabilities, false);
  const reportsVerificationStatus =
    capabilities?.reportsVerificationStatus ?? true;
  const isSignInInProgress =
    !isCardAuthenticated && signInLink?.status === 'started';
  const signInProviderCanLink = useMemo(
    () =>
      isSignInInProgress
        ? signInProviderSupportsLinking(signInLink?.providerId)
        : true,
    [isSignInInProgress, signInLink?.providerId],
  );
  const isMoneyCardSectionAvailable = isCardAuthenticated
    ? isMoneyAccountLinkingSupported
    : signInProviderCanLink;
  const isMonadSponsorshipEnabled = useSelector(
    getGasFeesSponsoredNetworkEnabled,
  )(vaultConfig?.chainId ?? '');

  const [status, setStatus] = useState<LinkageStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  const rawMoneyAccountCardToken = useMemo(() => {
    if (isImmersveMoneyAccountMode && fundingChannel) {
      return {
        address: fundingChannel.tokenAddress,
        symbol: MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
        name: MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
        decimals: fundingChannel.decimals,
        caipChainId: fundingChannel.caipChainId,
        walletAddress: undefined,
        fundingStatus: FundingStatus.NotEnabled,
        spendableBalance: '0',
        delegationContract: fundingChannel.spenderAddress,
        priority: undefined,
        stagingTokenAddress: undefined,
        displaySymbol: MONEY_ACCOUNT_DISPLAY_SYMBOL,
      };
    }
    return resolveMoneyAccountCardToken(delegationSettings);
  }, [delegationSettings, fundingChannel, isImmersveMoneyAccountMode]);

  const isMoneyAccountCardSupported = useMemo(() => {
    if (isImmersveMoneyAccountMode && rawMoneyAccountCardToken) {
      return true;
    }
    return isMoneyAccountCardTokenAllowlisted(
      cardFeatureFlag?.chains,
      vedaConfig,
    );
  }, [
    cardFeatureFlag,
    vedaConfig,
    isImmersveMoneyAccountMode,
    rawMoneyAccountCardToken,
  ]);

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

  const isVerifiedForLinking = isCardVerified || !reportsVerificationStatus;
  // Immersve has no verification status, so a signed-in session is not proof
  // of a card. Link only once card home data includes one. The funding
  // approval still uses canSubmitDelegation, which stays open after KYC.
  const isReadyToLink =
    isCardVerified ||
    (!reportsVerificationStatus && Boolean(cardHomeData?.card));
  const canSubmitDelegation = Boolean(
    hasRequirements &&
      isCardAuthenticated &&
      isVerifiedForLinking &&
      moneyAccountCardToken &&
      isMonadSponsorshipEnabled &&
      isMoneyAccountLinkingSupported,
  );
  const canLink = Boolean(
    canSubmitDelegation &&
      isReadyToLink &&
      !isAlreadyDelegated &&
      !isResidencyBlocked,
  );

  const getLinkFlowRedirectTarget = useCallback(() => {
    if (
      linkInProgress ||
      !hasMoneyAccountBaseRequirements ||
      !primaryMoneyAccount?.address ||
      isResidencyBlocked ||
      !isMoneyAccountLinkingSupported
    ) {
      return undefined;
    }

    if (isCardAuthenticated) {
      return canLink ? BOTTOM_SHEET_NAMES.CARD_LINK_SHEET : undefined;
    }

    return SCREEN_NAMES.CARD_HOME;
  }, [
    canLink,
    hasMoneyAccountBaseRequirements,
    isCardAuthenticated,
    isMoneyAccountLinkingSupported,
    isResidencyBlocked,
    linkInProgress,
    primaryMoneyAccount?.address,
  ]);

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
          <Spinner
            color={IconColor.IconDefault}
            spinnerIconProps={{ size: IconSize.Lg }}
          />
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
          <Icon
            name={IconName.Confirmation}
            color={IconColor.SuccessDefault}
            size={IconSize.Lg}
          />
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
          <Icon
            name={IconName.Error}
            color={IconColor.ErrorDefault}
            size={IconSize.Lg}
          />
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
          .addProperties(
            withCardProvider(activeProviderId, {
              flow: CardFlow.MONEY_ACCOUNT_LINKAGE,
              ...properties,
            }),
          )
          .build(),
      );
    },
    [trackEvent, createEventBuilder, activeProviderId],
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
      if (!isMoneyAccountLinkingSupported) {
        showErrorToast();
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
        if (!isVerifiedForLinking || !isReadyToLink) {
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
      isMoneyAccountLinkingSupported,
      hasMoneyAccountBaseRequirements,
      moneyAccountCardToken,
      primaryMoneyAccount?.address,
      isCardAuthenticated,
      isVerifiedForLinking,
      isReadyToLink,
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
    if (!consumesPendingLink) return;
    if (!pendingMoneyAccountCardLinkEntryPoint) return;
    if (!isCardAuthenticated) return;

    if (!isMoneyAccountLinkingSupported) {
      dispatch(setPendingMoneyAccountCardLink(null));
      return;
    }

    if (!isVerifiedForLinking || !isReadyToLink) {
      if (cardHomeDataStatus === 'success' || cardHomeDataStatus === 'error') {
        dispatch(setPendingMoneyAccountCardLink(null));
      }
      return;
    }

    if (!hasMoneyAccountBaseRequirements || !primaryMoneyAccount?.address) {
      dispatch(setPendingMoneyAccountCardLink(null));
      return;
    }

    if (!isMoneyAccountCardSupported) {
      if (cardHomeDataStatus === 'success' || cardHomeDataStatus === 'error') {
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
      if (cardHomeDataStatus === 'success' || cardHomeDataStatus === 'error') {
        dispatch(setPendingMoneyAccountCardLink(null));
      }
      return;
    }

    const entrypoint = pendingMoneyAccountCardLinkEntryPoint;
    dispatch(setPendingMoneyAccountCardLink(null));
    openLinkCardSheet(entrypoint);
  }, [
    consumesPendingLink,
    pendingMoneyAccountCardLinkEntryPoint,
    isCardAuthenticated,
    isMoneyAccountLinkingSupported,
    isVerifiedForLinking,
    isReadyToLink,
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
    async (options?: ConfirmLinkInBackgroundOptions): Promise<boolean> => {
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
      const showSuccess = options?.showSuccessToast !== false;
      const hold = options?.holdToastsUntil;

      const showErrorWhenReleased = () => {
        if (!hold) {
          showErrorToast(action);
          return;
        }
        // A rejected hold still releases the toast, so a failed link is not
        // swallowed when the caller drops the promise.
        hold
          .then(
            () => showErrorToast(action),
            () => showErrorToast(action),
          )
          .catch(() => undefined);
      };

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
        showErrorWhenReleased();
        return false;
      }

      if (Engine.context.CardController.isLinkageInProgress()) {
        return false;
      }

      // 'quiet' is a cancellation or a linkage that was already running.
      // Resolving the hold shows nothing, matching the unheld behaviour.
      let phase: 'pending' | 'success' | 'error' | 'quiet' = 'pending';
      let released = !hold;
      let showedPending = false;
      let pendingTimer: ReturnType<typeof setTimeout> | null = null;

      const cancelPendingTimer = () => {
        if (pendingTimer) {
          clearTimeout(pendingTimer);
          pendingTimer = null;
        }
      };

      const showPendingNow = () => {
        showedPending = true;
        showPendingToast(action);
      };

      // showToast mounts on its own timer. Close after that, or a pending
      // toast that has not mounted yet appears once this call returns.
      const dismissPendingToast = () => {
        if (!showedPending) {
          return;
        }
        setTimeout(() => {
          toastRef?.current?.closeToast();
        }, 0);
      };

      const onReleased = () => {
        released = true;
        // Wait a tick so a link that already settled in this turn does not
        // flash the pending toast before we record the outcome.
        pendingTimer = setTimeout(() => {
          pendingTimer = null;
          if (phase === 'pending') {
            showPendingNow();
            return;
          }
          if (phase === 'error') {
            showErrorToast(action);
          }
        }, 0);
      };

      if (hold) {
        hold.then(onReleased, onReleased).catch(() => undefined);
      } else {
        showPendingNow();
      }

      setStatus('pending');
      setError(null);

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
        phase = 'success';
        cancelPendingTimer();
        if (released) {
          if (showSuccess) {
            showSuccessToast(action);
          } else {
            dismissPendingToast();
          }
        }
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
          phase = 'quiet';
          cancelPendingTimer();
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
          phase = 'quiet';
          cancelPendingTimer();
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
        phase = 'error';
        cancelPendingTimer();
        setError(linkageError);
        setStatus('error');
        if (released) {
          showErrorToast(action);
        }
        return false;
      }
    },
    [
      canSubmitDelegation,
      primaryMoneyAccount?.address,
      showErrorToast,
      showPendingToast,
      showSuccessToast,
      toastRef,
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
    isMoneyAccountLinkingSupported,
    isMoneyCardSectionAvailable,
    reportsVerificationStatus,

    status,
    isLinking: linkInProgress,
    error,

    getLinkFlowRedirectTarget,
    startLinkFlow,
    openLinkCardSheet,
    confirmLinkInBackground,
    reset,
  };
};

export default useMoneyAccountCardLinkage;
