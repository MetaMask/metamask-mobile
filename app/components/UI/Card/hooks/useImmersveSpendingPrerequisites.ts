import { useCallback, useEffect, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import type { CardSpendingPrerequisite } from '../../../../core/Engine/controllers/card-controller/provider-types';
import {
  deriveNextImmersveAction,
  type ImmersveNextAction,
} from '../util/immersvePrerequisites';
import { getCardProviderErrorMessage } from '../util/getCardProviderErrorMessage';

const DEFAULT_POLL_INTERVAL_MS = 5000;
/** Cooldown before auto-retrying a failed pending poll (avoids Sentry spam). */
const POLL_FAILURE_COOLDOWN_MS = 15000;
/** Give up auto-retry after this many consecutive failures; manual refresh() resets. */
const MAX_CONSECUTIVE_POLL_FAILURES = 3;

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
  const consecutiveFailuresRef = useRef(0);

  const refresh = useCallback(async (): Promise<ImmersveNextAction | null> => {
    if (!fundingSourceId) {
      return null;
    }
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const { prerequisites, network } =
        await getController().getSpendingPrerequisites(fundingSourceId, {
          kycRegion,
          kycRedirectUrl,
        });
      const nextAction = deriveNextImmersveAction(prerequisites, network);
      setState({ prerequisites, nextAction, isLoading: false, error: null });
      return nextAction;
    } catch (e) {
      // Provider already reports API failures via reportAndMap. Setting error
      // pauses the fast poll interval; a cooldown retry may resume below.
      consecutiveFailuresRef.current += 1;
      const message = getCardProviderErrorMessage(e);
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      return null;
    }
  }, [fundingSourceId, kycRegion, kycRedirectUrl]);

  useEffect(() => {
    if (state.nextAction?.type !== 'pending') {
      return undefined;
    }

    // Stay idle while a refresh is in flight. refresh() clears `error` at start;
    // without this guard the effect would immediately re-enable the fast interval
    // and overlap polls / Sentry during cooldown recovery.
    if (state.isLoading) {
      return undefined;
    }

    // After a failure: cool down, then auto-retry a few times so transient
    // outages can recover (e.g. ImmersveKYCProcessing has no retry button).
    // This avoids hitting the provider every pollInterval during an outage.
    if (state.error) {
      if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_POLL_FAILURES) {
        return undefined;
      }
      const retryId = setTimeout(() => {
        refresh().catch(() => undefined);
      }, POLL_FAILURE_COOLDOWN_MS);
      return () => clearTimeout(retryId);
    }

    const id = setInterval(() => {
      refresh().catch(() => undefined);
    }, pollIntervalMs);
    return () => clearInterval(id);
  }, [
    state.nextAction?.type,
    state.error,
    state.isLoading,
    pollIntervalMs,
    refresh,
  ]);

  return {
    prerequisites: state.prerequisites,
    nextAction: state.nextAction,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
  };
};
