import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector, useStore } from 'react-redux';
import type {
  GetAccountSupportParams,
  PerpsAccountSupport,
  PerpsProviderType,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import type { RootState } from '../../../../reducers';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import {
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';

interface AccountSupportController {
  getAccountSupport: (
    params?: GetAccountSupportParams,
  ) => Promise<PerpsAccountSupport>;
}

const hasAccountSupport = (
  controller: unknown,
): controller is AccountSupportController =>
  typeof controller === 'object' &&
  controller !== null &&
  'getAccountSupport' in controller &&
  typeof controller.getAccountSupport === 'function';

export type PerpsAccountSupportCheckResult =
  | 'supported'
  | 'unsupported'
  | 'stale'
  | 'unmounted';

export interface UsePerpsAccountSupportReturn {
  isAccountUnsupportedModalVisible: boolean;
  checkAccountSupport: (
    providerId?: PerpsProviderType,
  ) => Promise<PerpsAccountSupportCheckResult>;
  closeAccountUnsupportedModal: () => void;
}

const getSupportContextKey = (
  state: RootState,
  providerId?: PerpsProviderType,
) =>
  `${selectSelectedInternalAccountAddress(state) ?? ''}:${
    providerId ?? selectPerpsProvider(state) ?? ''
  }:${selectPerpsNetwork(state)}`;

/**
 * Reads provider-owned account support before actions that can sign.
 *
 * The controller owns detection and caching. Missing support on an older
 * controller and transient errors fail open; Core still enforces the check
 * immediately before supported providers sign.
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
    async (providerId?: PerpsProviderType) => {
      const controller = Engine.context?.PerpsController;
      if (!hasAccountSupport(controller)) {
        return { isSupported: true } as const;
      }

      try {
        return await controller.getAccountSupport(
          providerId ? { providerId } : undefined,
        );
      } catch {
        return { isSupported: true } as const;
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

  const checkAccountSupport = useCallback(
    async (
      providerId?: PerpsProviderType,
    ): Promise<PerpsAccountSupportCheckResult> => {
      const requestedContext = getSupportContextKey(
        store.getState(),
        providerId,
      );
      const support = await readAccountSupport(providerId);
      const unmounted = !isMountedRef.current;
      // Read the live store, not render state: a committed post-deposit
      // order resolves after its view unmounts and must still see a switch.
      if (
        getSupportContextKey(store.getState(), providerId) !== requestedContext
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

  const closeAccountUnsupportedModal = useCallback(() => {
    setUnsupportedContextKey(null);
  }, []);

  return {
    isAccountUnsupportedModalVisible,
    checkAccountSupport,
    closeAccountUnsupportedModal,
  };
};
