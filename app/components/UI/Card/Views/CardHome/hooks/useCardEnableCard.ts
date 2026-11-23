import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  CardProviderIds,
  type CardHomeData,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';
import { selectCardActiveProviderId } from '../../../../../../selectors/cardController';
import type { CardProvisioningView, CardSetupStep } from '../../../types';
import type { CardProvisioningOptions } from './useImmersveCardProvisioning';
import { useImmersveEnableCard } from './useImmersveEnableCard';

export interface CardEnableCardState {
  /** Provider needs an Enable card button beyond the ones in `data.actions`. */
  canEnableCard: boolean;
  /** Provider-owned Enable card handler, or `null` to use the default action. */
  enableCard: (() => void) | null;
  provisioningView: CardProvisioningView;
  setupStep: CardSetupStep | null;
  /** True while a Money account funding approval is running in the background. */
  isEnableCardPending: boolean;
  /**
   * Call before leaving for a Card screen so the next focus rechecks setup.
   * A no-op for providers that do not reconcile a left-off step.
   */
  markCardFlowOpened: () => void;
}

const noop = () => undefined;

const DEFAULT_STATE: CardEnableCardState = {
  canEnableCard: false,
  enableCard: null,
  provisioningView: 'provisioning',
  setupStep: null,
  isEnableCardPending: false,
  markCardFlowOpened: noop,
};

/**
 * Resolves the Enable card behaviour of the active Card provider so Card Home
 * never branches on the provider itself. Providers that do not override the
 * flow fall back to `DEFAULT_STATE`, which keeps the default `enable_card`
 * action and the standard `card_provisioning` banner.
 */
export function useCardEnableCard(
  data: CardHomeData | null | undefined,
  options?: CardProvisioningOptions,
): CardEnableCardState {
  const providerId = useSelector(selectCardActiveProviderId);
  // Provider hooks must run unconditionally; each one no-ops unless it owns the
  // active provider.
  const immersve = useImmersveEnableCard(data, options);

  return useMemo(() => {
    if (providerId !== CardProviderIds.Immersve) {
      return DEFAULT_STATE;
    }
    return {
      canEnableCard: immersve.canEnableCard,
      enableCard: immersve.canEnableCard ? immersve.enableCard : null,
      provisioningView: immersve.provisioningView,
      setupStep: immersve.setupStep,
      isEnableCardPending: immersve.isEnableCardPending,
      markCardFlowOpened: immersve.markCardFlowOpened,
    };
  }, [
    providerId,
    immersve.canEnableCard,
    immersve.enableCard,
    immersve.provisioningView,
    immersve.setupStep,
    immersve.isEnableCardPending,
    immersve.markCardFlowOpened,
  ]);
}
