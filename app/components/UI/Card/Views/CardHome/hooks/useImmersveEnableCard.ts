import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  CardProviderIds,
  type CardHomeData,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';
import {
  selectCardActiveProviderId,
  selectCardSelectedCountry,
} from '../../../../../../selectors/cardController';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { CardActions, withCardProvider } from '../../../util/metrics';
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

/**
 * Centralizes Immersve Card Home "pending action" UX behind the shared
 * Enable card button (same surface Baanx uses for delegation setup).
 *
 * - `allowance_revoked` → navigate to FUNDING_APPROVAL in reapprove mode
 * - actionable `pendingAction` from provisioning reconcile → resume via router
 * - `pending` (KYC under review) / no pending action → passive banners only
 */
export function useImmersveEnableCard(data: CardHomeData | null | undefined) {
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const kycRegion = useSelector(selectCardSelectedCountry) ?? undefined;
  const providerId = useSelector(selectCardActiveProviderId);
  const isImmersve = providerId === CardProviderIds.Immersve;

  const { isReconciling, pendingAction, resumePendingAction, isProvisioning } =
    useImmersveCardProvisioning(data);

  const isAllowanceRevoked =
    isImmersve &&
    (data?.alerts ?? []).some(
      (cardAlert) => cardAlert.type === 'allowance_revoked',
    );

  const hasActionablePendingAction =
    pendingAction !== null && ACTIONABLE_ACTIONS.has(pendingAction.type);

  const canEnableCard = isAllowanceRevoked || hasActionablePendingAction;

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
    resumePendingAction();
  }, [
    isAllowanceRevoked,
    trackEvent,
    createEventBuilder,
    navigation,
    kycRegion,
    data?.primaryFundingAsset?.walletAddress,
    resumePendingAction,
  ]);

  return {
    canEnableCard,
    enableCard,
    isReconciling,
    isKycUnderReview,
    hasPendingAction: Boolean(pendingAction),
    provisioningView,
  };
}
