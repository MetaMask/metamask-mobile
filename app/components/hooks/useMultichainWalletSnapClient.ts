import { useMemo } from 'react';
import {
  MultichainWalletSnapClient,
  WalletClientType,
} from '../../core/SnapKeyring/MultichainWalletSnapClient';

export function useMultichainWalletSnapClient(clientType: WalletClientType) {
  const client = useMemo(
    () => new MultichainWalletSnapClient(clientType),
    [clientType],
  );

  return client;
}

export default useMultichainWalletSnapClient;
