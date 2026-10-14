import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import {
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';

type PerpsAccountSupport =
  | { isSupported: true }
  | { isSupported: false; reason: 'multi_sig_account' };

interface AccountSupportController {
  getAccountSupport: () => Promise<PerpsAccountSupport>;
}

const hasAccountSupport = (
  controller: unknown,
): controller is AccountSupportController =>
  typeof controller === 'object' &&
  controller !== null &&
  'getAccountSupport' in controller &&
  typeof controller.getAccountSupport === 'function';

export interface UsePerpsAccountSupportReturn {
  isAccountUnsupportedModalVisible: boolean;
  checkAccountSupport: () => Promise<boolean>;
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
  const contextKeyRef = useRef(contextKey);
  contextKeyRef.current = contextKey;

  const [isAccountUnsupportedModalVisible, setIsModalVisible] = useState(false);

  const readAccountSupport = useCallback(async () => {
    const controller = Engine.context?.PerpsController;
    if (!hasAccountSupport(controller)) {
      return { isSupported: true } as const;
    }

    try {
      return await controller.getAccountSupport();
    } catch {
      return { isSupported: true } as const;
    }
  }, []);

  useEffect(() => {
    readAccountSupport().catch(() => undefined);
  }, [contextKey, readAccountSupport]);

  const checkAccountSupport = useCallback(async () => {
    const requestedContext = contextKeyRef.current;
    const support = await readAccountSupport();
    if (contextKeyRef.current !== requestedContext) {
      return false;
    }
    if (!support.isSupported) {
      setIsModalVisible(true);
      return false;
    }
    return true;
  }, [readAccountSupport]);

  const closeAccountUnsupportedModal = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  return {
    isAccountUnsupportedModalVisible,
    checkAccountSupport,
    closeAccountUnsupportedModal,
  };
};
