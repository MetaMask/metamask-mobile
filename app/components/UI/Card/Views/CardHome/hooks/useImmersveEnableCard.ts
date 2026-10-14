import { useCallback, useContext, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Routes from '../../../../../../constants/navigation/Routes';
import Engine from '../../../../../../core/Engine';
import {
  CardProviderError,
  CardProviderErrorCode,
  CardProviderIds,
  type CardHomeData,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';
import {
  selectCardActiveProviderId,
  selectCardSelectedCountry,
} from '../../../../../../selectors/cardController';
import { selectCardImmersveConfig } from '../../../../../../selectors/featureFlagController/card';
import {
  selectImmersveFundingSourceId,
  setImmersveFundingSourceId,
} from '../../../../../../core/redux/slices/card';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { strings } from '../../../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../../component-library/components/Toast';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../../util/theme';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { CardActions, withCardProvider } from '../../../util/metrics';
import { loadImmersveNextAction } from '../../../util/loadImmersveNextAction';
import { useImmersveOnboardingRouter } from '../../../hooks/useImmersveOnboardingRouter';
import type { CardProvisioningView } from '../../../types';
import type { ImmersveNextAction } from '../../../util/immersvePrerequisites';
import { useImmersveCardProvisioning } from './useImmersveCardProvisioning';

const ACTIONABLE_ACTIONS = new Set<ImmersveNextAction['type']>([
  'contact',
  'kyc',
  'expected_spend',
  'funding',
  'rejected',
]);

const MAX_CARD_ERROR_CODES = new Set([
  'MAX_CARDS_EXCEEDED',
  'MAX_ACTIVE_CARDS_EXCEEDED',
]);

function isCancelledCard(data: CardHomeData | null | undefined): boolean {
  return (data?.actions ?? []).some(
    (action) =>
      action.type === 'enable_card' && action.reason === 'card_cancelled',
  );
}

/**
 * Centralizes Immersve Card Home "pending action" UX behind the shared
 * Enable card button (same surface Baanx uses for delegation setup).
 *
 * - `allowance_revoked` → navigate to FUNDING_APPROVAL in reapprove mode
 * - cancelled card → resolve prerequisites, then create a replacement or resume onboarding
 * - actionable `pendingAction` from provisioning reconcile → resume via router
 * - `pending` (KYC under review) / no pending action → passive banners only
 */
export function useImmersveEnableCard(data: CardHomeData | null | undefined) {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const theme = useTheme();
  const { toastRef } = useContext(ToastContext);
  const kycRegion = useSelector(selectCardSelectedCountry) ?? undefined;
  const providerId = useSelector(selectCardActiveProviderId);
  const fundingChannelId = useSelector(
    selectCardImmersveConfig,
  )?.fundingChannelId;
  const existingFundingSourceId =
    useSelector(selectImmersveFundingSourceId) ?? null;
  const isImmersve = providerId === CardProviderIds.Immersve;
  const route = useImmersveOnboardingRouter();
  const [isEnableCardLoading, setIsEnableCardLoading] = useState(false);

  const { isReconciling, pendingAction, resumePendingAction, isProvisioning } =
    useImmersveCardProvisioning(data);

  const isAllowanceRevoked =
    isImmersve &&
    (data?.alerts ?? []).some(
      (cardAlert) => cardAlert.type === 'allowance_revoked',
    );

  const hasActionablePendingAction =
    pendingAction !== null && ACTIONABLE_ACTIONS.has(pendingAction.type);

  const cardCancelled = isImmersve && isCancelledCard(data);

  const canEnableCard =
    isAllowanceRevoked || hasActionablePendingAction || cardCancelled;

  const isKycUnderReview = pendingAction?.type === 'pending';

  const provisioningView: CardProvisioningView = (() => {
    if (!isProvisioning) {
      return 'hidden';
    }
    if (isReconciling) {
      return 'reconciling';
    }
    if (hasActionablePendingAction) {
      return 'hidden';
    }
    if (isKycUnderReview) {
      return 'kyc_under_review';
    }
    return 'provisioning';
  })();

  const showRecreateError = useCallback(
    (error: unknown) => {
      const isMaxCards =
        error instanceof CardProviderError &&
        error.errorCode !== undefined &&
        MAX_CARD_ERROR_CODES.has(error.errorCode);
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: strings(
              isMaxCards
                ? 'card.card_home.recreate_card_max_cards_error'
                : 'card.card_home.recreate_card_error',
            ),
          },
        ],
        iconName: IconName.Error,
        iconColor: theme.colors.error.default,
        hasNoTimeout: false,
      });
    },
    [theme.colors.error.default, toastRef],
  );

  const recreateCancelledCard = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(CardProviderIds.Immersve, {
            action: CardActions.RECREATE_CARD_BUTTON,
          }),
        )
        .build(),
    );
    setIsEnableCardLoading(true);
    try {
      const { fundingSourceId, action } = await loadImmersveNextAction({
        fundingChannelId,
        existingFundingSourceId,
        kycRegion,
      });
      if (!existingFundingSourceId) {
        dispatch(setImmersveFundingSourceId(fundingSourceId));
      }
      if (action.type === 'active') {
        try {
          await Engine.context.CardController.createCard(fundingSourceId);
        } catch (createError) {
          const alreadyExists =
            createError instanceof CardProviderError &&
            createError.code === CardProviderErrorCode.Conflict;
          if (!alreadyExists) {
            throw createError;
          }
        }
        await Engine.context.CardController.fetchCardHomeData({ force: true });
        return;
      }
      route(action, { navigateFromRoot: true, countryKey: kycRegion });
    } catch (error) {
      showRecreateError(error);
    } finally {
      setIsEnableCardLoading(false);
    }
  }, [
    trackEvent,
    createEventBuilder,
    fundingChannelId,
    existingFundingSourceId,
    kycRegion,
    dispatch,
    route,
    showRecreateError,
  ]);

  const enableCard = useCallback(() => {
    if (isAllowanceRevoked) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties(
            withCardProvider(CardProviderIds.Immersve, {
              action: CardActions.SET_SPENDING_ALLOWANCE_BUTTON,
            }),
          )
          .build(),
      );
      navigation.navigate(Routes.CARD.ONBOARDING.ROOT, {
        screen: Routes.CARD.ONBOARDING.FUNDING_APPROVAL,
        params: {
          mode: 'reapprove',
          countryKey: kycRegion,
          ...(data?.primaryFundingAsset?.walletAddress
            ? { fundingAddress: data.primaryFundingAsset.walletAddress }
            : {}),
        },
      });
      return;
    }
    if (cardCancelled) {
      return recreateCancelledCard();
    }
    resumePendingAction();
  }, [
    isAllowanceRevoked,
    cardCancelled,
    trackEvent,
    createEventBuilder,
    navigation,
    kycRegion,
    data?.primaryFundingAsset?.walletAddress,
    recreateCancelledCard,
    resumePendingAction,
  ]);

  return {
    canEnableCard,
    enableCard,
    isEnableCardLoading,
    isReconciling,
    isKycUnderReview,
    hasPendingAction: Boolean(pendingAction),
    provisioningView,
  };
}
