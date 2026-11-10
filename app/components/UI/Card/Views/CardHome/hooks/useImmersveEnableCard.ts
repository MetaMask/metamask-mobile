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
  selectImmersveMoneyAccountMode,
} from '../../../../../../selectors/cardController';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { BAANX_MAX_LIMIT } from '../../../constants';
import { useMoneyAccountCardLinkage } from '../../../hooks/useMoneyAccountCardLinkage';
import { useImmersveMoneyAccountFundingApproval } from '../../../hooks/useImmersveMoneyAccountFundingApproval';
import {
  CardActions,
  CardEntryPoint,
  withCardProvider,
} from '../../../util/metrics';
import type { CardProvisioningView, CardSetupStep } from '../../../types';
import type { ImmersveNextAction } from '../../../util/immersvePrerequisites';
import {
  useImmersveCardProvisioning,
  type CardProvisioningOptions,
} from './useImmersveCardProvisioning';

const ACTIONABLE_ACTIONS = new Set<CardSetupStep>([
  'contact',
  'kyc',
  'expected_spend',
  'funding',
  'rejected',
]);

function isCardSetupStep(
  action: ImmersveNextAction,
): action is Extract<ImmersveNextAction, { type: CardSetupStep }> {
  return ACTIONABLE_ACTIONS.has(action.type as CardSetupStep);
}

/**
 * Centralizes Immersve Card Home "pending action" UX behind the shared
 * Enable card button (same surface Baanx uses for delegation setup).
 *
 * - `allowance_revoked` → navigate to FUNDING_APPROVAL in reapprove mode
 * - actionable `pendingAction` from provisioning reconcile → resume via router
 * - `pending` (KYC under review) / no pending action → passive banners only
 */
export function useImmersveEnableCard(
  data: CardHomeData | null | undefined,
  options?: CardProvisioningOptions,
) {
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const kycRegion = useSelector(selectCardSelectedCountry) ?? undefined;
  const providerId = useSelector(selectCardActiveProviderId);
  const isImmersve = providerId === CardProviderIds.Immersve;
  const isMoneyAccountMode = useSelector(selectImmersveMoneyAccountMode);
  const { confirmLinkInBackground } = useMoneyAccountCardLinkage();
  const { approveFunding, isApproving } =
    useImmersveMoneyAccountFundingApproval();

  const { isReconciling, pendingAction, resumePendingAction, isProvisioning } =
    useImmersveCardProvisioning(data, options);

  const isAllowanceRevoked =
    isImmersve &&
    (data?.alerts ?? []).some(
      (cardAlert) => cardAlert.type === 'allowance_revoked',
    );

  const setupStep: CardSetupStep | null =
    pendingAction && isCardSetupStep(pendingAction) ? pendingAction.type : null;

  const canEnableCard = isAllowanceRevoked || setupStep !== null;

  const isKycUnderReview = pendingAction?.type === 'pending';

  const provisioningView: CardProvisioningView = (() => {
    if (!isProvisioning) {
      return 'hidden';
    }
    if (isReconciling) {
      return 'reconciling';
    }
    if (setupStep) {
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
      if (isMoneyAccountMode) {
        confirmLinkInBackground({
          delegationAmountHuman: BAANX_MAX_LIMIT,
          entrypoint: CardEntryPoint.CARD_HOME_MONEY_ACCOUNT_CARD,
        }).catch(() => undefined);
        return;
      }
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
    if (isMoneyAccountMode && pendingAction?.type === 'funding') {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties(
            withCardProvider(CardProviderIds.Immersve, {
              action: CardActions.IMMERSVE_PROVISIONING_RESUME,
              next_action: pendingAction.type,
            }),
          )
          .build(),
      );
      approveFunding(
        options?.navigateFromOutsideCard
          ? CardEntryPoint.MONEY_HOME_METAMASK_CARD
          : CardEntryPoint.CARD_HOME_MONEY_ACCOUNT_CARD,
      ).catch(() => undefined);
      return;
    }
    resumePendingAction();
  }, [
    isAllowanceRevoked,
    isMoneyAccountMode,
    confirmLinkInBackground,
    pendingAction,
    approveFunding,
    options?.navigateFromOutsideCard,
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
    setupStep,
    isEnableCardPending: Boolean(isMoneyAccountMode && isApproving),
  };
}
