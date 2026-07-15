import { useCallback, useEffect, useState } from 'react';
import Engine from '../../../../core/Engine';
import type { CardSpendingPrerequisite } from '../../../../core/Engine/controllers/card-controller/provider-types';
import {
  deriveNextImmersveAction,
  type ImmersveNextAction,
} from '../util/immersvePrerequisites';
import { getCardProviderErrorMessage } from '../util/getCardProviderErrorMessage';

const DEFAULT_POLL_INTERVAL_MS = 5000;

function getController() {
  const controller = Engine.context?.CardController;
  if (!controller) {
    throw new Error('CardController not initialized');
  }
  return controller;
}

interface UseImmersveSpendingPrerequisitesParams {
  fundingSourceId?: string;
  kycRegion?: string;
  kycRedirectUrl?: string;
  pollIntervalMs?: number;
}

interface PrerequisitesState {
  prerequisites: CardSpendingPrerequisite[];
  nextAction: ImmersveNextAction | null;
  isLoading: boolean;
  error: string | null;
}

export const useImmersveSpendingPrerequisites = ({
  fundingSourceId,
  kycRegion,
  kycRedirectUrl,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: UseImmersveSpendingPrerequisitesParams) => {
  const [state, setState] = useState<PrerequisitesState>({
    prerequisites: [],
    nextAction: null,
    isLoading: false,
    error: null,
  });

  const refresh = useCallback(async (): Promise<ImmersveNextAction | null> => {
    if (!fundingSourceId) {
      return null;
    }
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const { prerequisites } = await getController().getSpendingPrerequisites(
        fundingSourceId,
        { kycRegion, kycRedirectUrl },
      );
      const nextAction = deriveNextImmersveAction(prerequisites);
      setState({ prerequisites, nextAction, isLoading: false, error: null });
      return nextAction;
    } catch (e) {
      const message = getCardProviderErrorMessage(e);
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      return null;
    }
  }, [fundingSourceId, kycRegion, kycRedirectUrl]);

  useEffect(() => {
    // 'funding' also polls: after the approve tx confirms, Immersve may take a
    // moment to observe the on-chain allowance, so this keeps refreshing until
    // the prerequisite flips to 'active' (ponytail: exact settlement timing is
    // an open question — reuses this hook's existing 5s cadence rather than a
    // bespoke backoff).
    if (
      state.nextAction?.type !== 'pending' &&
      state.nextAction?.type !== 'funding'
    ) {
      return undefined;
    }
    const id = setInterval(() => {
      refresh().catch(() => undefined);
    }, pollIntervalMs);
    return () => clearInterval(id);
  }, [state.nextAction?.type, pollIntervalMs, refresh]);

  return {
    prerequisites: state.prerequisites,
    nextAction: state.nextAction,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
  };
};
