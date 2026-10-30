import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type {
  GetAccountSupportParams,
  PerpsAccountSupport,
  PerpsProviderType,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
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
  | 'stale';

export interface UsePerpsAccountSupportReturn {
  isAccountUnsupportedModalVisible: boolean;
  checkAccountSupport: (
    providerId?: PerpsProviderType,
  ) => Promise<PerpsAccountSupportCheckResult>;
  closeAccountUnsupportedModal: () => void;
}

/**
 * Reads provider-owned account support before actions that can sign.
 *
 * The controller owns detection and caching. Missing support on an older
 * controller and transient errors fail open; Core still enforces the check
 * immediately before supported providers sign.
 */
export const usePerpsAccountSupport = (): UsePerpsAccountSupportReturn => {
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const provider = useSelector(selectPerpsProvider);
  const network = useSelector(selectPerpsNetwork);
  const contextKey = `${selectedAddress ?? ''}:${provider ?? ''}:${network}`;
  const contextRef = useRef({ selectedAddress, provider, network });
  contextRef.current = { selectedAddress, provider, network };
  const isMountedRef = useRef(true);

  const [isAccountUnsupportedModalVisible, setIsModalVisible] = useState(false);

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
      const requested = contextRef.current;
      const requestedRoute = providerId ?? requested.provider;
      const requestedContext = `${requested.selectedAddress ?? ''}:${
        requestedRoute ?? ''
      }:${requested.network}`;
      const support = await readAccountSupport(providerId);
      if (!isMountedRef.current) {
        return 'stale';
      }
      const current = contextRef.current;
      const currentRoute = providerId ?? current.provider;
      const currentContext = `${current.selectedAddress ?? ''}:${
        currentRoute ?? ''
      }:${current.network}`;
      if (currentContext !== requestedContext) {
        return 'stale';
      }
      if (!support.isSupported) {
        setIsModalVisible(true);
        return 'unsupported';
      }
      return 'supported';
    },
    [readAccountSupport],
  );

  const closeAccountUnsupportedModal = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  return {
    isAccountUnsupportedModalVisible,
    checkAccountSupport,
    closeAccountUnsupportedModal,
  };
};
