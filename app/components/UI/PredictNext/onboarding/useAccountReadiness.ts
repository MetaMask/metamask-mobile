import { useContext, useEffect, useMemo } from 'react';

import type {
  AccountReadinessCard,
  AccountReadinessValue,
  UseAccountReadinessOptions,
} from './accountReadiness.types';
import { AccountReadinessContext } from './AccountReadinessProvider';

const HIDDEN_CARD: AccountReadinessCard = { kind: 'hidden' };

const OUTSIDE_PROVIDER: AccountReadinessValue = {
  readiness: 'unknown',
  card: HIDDEN_CARD,
  connection: 'unavailable',
  accountActions: 'unchanged',
  setup: 'closed',
  latency: 'unknown',
  readError: 'none',
  isRefreshing: false,
  refreshStatus: () => undefined,
  startSetup: () => undefined,
  retrySetup: () => undefined,
  dismissVerified: () => undefined,
};

/**
 * Home's view of Account Readiness. It registers Home's focus and region with
 * the nearest {@link AccountReadinessProvider} and returns a read-only value.
 * Outside the provider it degrades to "nothing to show", which keeps Home
 * renderable in isolation; production always mounts the provider in the gate.
 */
export const useAccountReadiness = ({
  isFocused,
  region,
}: UseAccountReadinessOptions): AccountReadinessValue => {
  const context = useContext(AccountReadinessContext);

  const registerVisibility =
    context?.accountActions === 'readiness_gated'
      ? context.registerVisibility
      : null;

  useEffect(() => {
    if (!registerVisibility) {
      return undefined;
    }
    return registerVisibility({ isFocused, region });
  }, [isFocused, region, registerVisibility]);

  return useMemo(() => {
    if (!context) {
      return OUTSIDE_PROVIDER;
    }
    if (region !== 'blocked') {
      return context;
    }
    // A geo block suppresses the whole slot, including read status.
    return {
      ...context,
      card: HIDDEN_CARD,
      connection: 'unavailable',
      readError: 'none',
      latency: 'unknown',
      isRefreshing: false,
    };
  }, [context, region]);
};
