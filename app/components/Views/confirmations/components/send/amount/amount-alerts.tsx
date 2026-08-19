import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useSendContext } from '../../../context/send-context';
import { useUnreliableNetworkAlert } from '../../../hooks/send/alerts/useUnreliableNetworkAlert';
import { SendAlertModal } from '../send-alert-modal';

export const AmountAlerts = () => {
  const { chainId } = useSendContext();
  const { alert: unreliableNetworkAlert, navigateToEditNetwork } =
    useUnreliableNetworkAlert();
  const [isOpen, setIsOpen] = useState(false);
  const lastAutoOpenedChainIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (unreliableNetworkAlert) {
      if (lastAutoOpenedChainIdRef.current !== chainId) {
        setIsOpen(true);
        lastAutoOpenedChainIdRef.current = chainId;
      }
    } else {
      lastAutoOpenedChainIdRef.current = undefined;
      setIsOpen(false);
    }
  }, [chainId, unreliableNetworkAlert]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleAcknowledge = useCallback(() => {
    setIsOpen(false);
    navigateToEditNetwork();
  }, [navigateToEditNetwork]);

  return (
    <SendAlertModal
      isOpen={isOpen && Boolean(unreliableNetworkAlert)}
      alerts={unreliableNetworkAlert ? [unreliableNetworkAlert] : []}
      onAcknowledge={handleAcknowledge}
      onClose={handleClose}
    />
  );
};
