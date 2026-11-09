import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector, useStore } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import type {
  PerpsAccountSupport,
  PerpsActiveProviderMode,
  PerpsProviderType,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import type { RootState } from '../../../../reducers';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import {
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';

export type PerpsAccountSupportCheckResult =
  | 'supported'
  | 'unsupported'
  | 'stale'
  | 'unmounted';

export interface CheckPerpsAccountSupportOptions {
  /**
   * Projection of the active provider. When it changes during the read, the
   * check is stale even though an explicit providerId was requested. An
   * action that signs with the live provider, such as a withdrawal, passes
   * this. An order pinned to one venue does not.
   */
  watchActiveProvider?: (
    activeProvider: PerpsActiveProviderMode | undefined,
  ) => string;
}

export interface UsePerpsAccountSupportReturn {
  isAccountUnsupportedModalVisible: boolean;
  checkAccountSupport: (
    providerId?: PerpsProviderType,
    options?: CheckPerpsAccountSupportOptions,
  ) => Promise<PerpsAccountSupportCheckResult>;
  closeAccountUnsupportedModal: () => void;
}

const getSupportContextKey = (
  state: RootState,
  providerId?: PerpsProviderType,
  watchActiveProvider?: CheckPerpsAccountSupportOptions['watchActiveProvider'],
) => {
  const queriedProvider = providerId ?? selectPerpsProvider(state) ?? '';
  const providerKey = watchActiveProvider
    ? `${queriedProvider}:${watchActiveProvider(selectPerpsProvider(state))}`
    : queriedProvider;

  return `${selectSelectedInternalAccountAddress(state) ?? ''}:${providerKey}:${selectPerpsNetwork(
    state,
  )}`;
};

/**
 * Reads provider-owned account support before actions that can sign.
 *
 * The controller owns detection and caching. A failed read fails open; Core
 * still enforces the check immediately before supported providers sign.
 */
export const usePerpsAccountSupport = (): UsePerpsAccountSupportReturn => {
  const store = useStore<RootState>();
  const contextKey = useSelector((state: RootState) =>
    getSupportContextKey(state),
  );
  const isMountedRef = useRef(true);

  // Keyed to the context it was shown for so a switch hides it at once,
  // before the next support read settles.
  const [unsupportedContextKey, setUnsupportedContextKey] = useState<
    string | null
  >(null);
  const isAccountUnsupportedModalVisible = unsupportedContextKey === contextKey;

  const readAccountSupport = useCallback(
    async (providerId?: PerpsProviderType): Promise<PerpsAccountSupport> => {
      try {
        return await Engine.context.PerpsController.getAccountSupport(
          providerId ? { providerId } : undefined,
        );
      } catch {
        return { isSupported: true };
      }
    },
    [],
  );

  useEffect(() => {
    readAccountSupport().catch(() => undefined);
  }, [contextKey, readAccountSupport]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const resolveSupportCheck = useCallback(
    async (
      providerId?: PerpsProviderType,
      watchActiveProvider?: CheckPerpsAccountSupportOptions['watchActiveProvider'],
    ): Promise<PerpsAccountSupportCheckResult> => {
      const requestedContext = getSupportContextKey(
        store.getState(),
        providerId,
        watchActiveProvider,
      );
      const support = await readAccountSupport(providerId);
      const unmounted = !isMountedRef.current;
      // Read the live store, not render state: a committed post-deposit
      // order resolves after its view unmounts and must still see a switch.
      // An explicit providerId ignores the active provider on its own, so
      // callers that sign with the live venue pass a watch.
      if (
        getSupportContextKey(
          store.getState(),
          providerId,
          watchActiveProvider,
        ) !== requestedContext
      ) {
        return 'stale';
      }
      if (!support.isSupported) {
        if (!unmounted) {
          setUnsupportedContextKey(getSupportContextKey(store.getState()));
        }
        return 'unsupported';
      }
      if (unmounted) {
        return 'unmounted';
      }
      return 'supported';
    },
    [readAccountSupport, store],
  );

  const checkAccountSupport = useCallback(
    async (
      providerId?: PerpsProviderType,
      options?: CheckPerpsAccountSupportOptions,
    ): Promise<PerpsAccountSupportCheckResult> => {
      const traceId = uuidv4();
      let result: PerpsAccountSupportCheckResult | undefined;
      trace({
        name: TraceName.PerpsAccountSupportCheck,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          provider:
            providerId ?? selectPerpsProvider(store.getState()) ?? 'unknown',
        },
      });
      try {
        result = await resolveSupportCheck(
          providerId,
          options?.watchActiveProvider,
        );
        return result;
      } finally {
        endTrace({
          name: TraceName.PerpsAccountSupportCheck,
          id: traceId,
          data: { result: result ?? 'error' },
        });
      }
    },
    [resolveSupportCheck, store],
  );

  const closeAccountUnsupportedModal = useCallback(() => {
    setUnsupportedContextKey(null);
  }, []);

  return {
    isAccountUnsupportedModalVisible,
    checkAccountSupport,
    closeAccountUnsupportedModal,
  };
};
