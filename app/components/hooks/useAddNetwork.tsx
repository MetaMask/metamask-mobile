import React, { useState, useCallback } from 'react';
import { PopularList } from '../../util/networks/customNetworks';
import { noop } from 'lodash';
import NetworkModals from '../UI/NetworkModal';

type PopularNetwork = (typeof PopularList)[number];

export const useAddNetwork = (options?: { skipEnableNetwork?: boolean }) => {
  const [popularNetwork, setPopularNetwork] = useState<PopularNetwork | null>(
    null,
  );
  const [resolveAddNetwork, setResolveAddNetwork] = useState<() => void>(noop);
  const [rejectAddNetwork, setRejectAddNetwork] = useState<() => void>(noop);

  const addPopularNetwork = (network: PopularNetwork) =>
    new Promise<void>((resolve, reject) => {
      setResolveAddNetwork(() => resolve);
      setRejectAddNetwork(() => reject);
      setPopularNetwork(network);
    });

  const onCloseModal = () => {
    setPopularNetwork(null);
    setResolveAddNetwork(noop);
    setRejectAddNetwork(noop);
  };

  const handleReject = useCallback(() => {
    const rejectFn = rejectAddNetwork;
    if (rejectFn !== noop) {
      rejectFn();
    }
    setPopularNetwork(null);
    setResolveAddNetwork(noop);
    setRejectAddNetwork(noop);
  }, [rejectAddNetwork]);

  const networkModal = popularNetwork ? (
    <NetworkModals
      isVisible
      onClose={onCloseModal}
      networkConfiguration={popularNetwork}
      showPopularNetworkModal
      autoSwitchNetwork={!options?.skipEnableNetwork}
      skipEnableNetwork={options?.skipEnableNetwork}
      onAccept={resolveAddNetwork}
      onReject={handleReject}
    />
  ) : null;

  return {
    addPopularNetwork,
    networkModal,
  };
};
