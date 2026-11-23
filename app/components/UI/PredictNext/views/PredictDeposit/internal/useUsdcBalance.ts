import { useEffect, useState } from 'react';
import { toHex } from '@metamask/controller-utils';
import Engine from '../../../../../../core/Engine';
import type { PredictDepositNetwork } from '../../../config/depositEnvironment';

export type UsdcBalance =
  | { status: 'loading' }
  /** USDC base units (6 decimals). */
  | { status: 'ready'; baseUnits: bigint }
  /** Unknown: offline, no network client for the chain, or a failed read. */
  | { status: 'unavailable' };

/** The wallet's network client for a chain, or nothing when it has none. */
export const findNetworkClientId = (chainId: number): string | undefined => {
  try {
    return (
      Engine.context.NetworkController.findNetworkClientIdByChainId(
        toHex(chainId),
      ) || undefined
    );
  } catch {
    return undefined;
  }
};

const readUsdcBalance = async (
  network: PredictDepositNetwork,
  address: string,
): Promise<bigint> => {
  const networkClientId = findNetworkClientId(network.chainId);
  if (!networkClientId) {
    throw new Error('No network client for the deposit chain');
  }
  const balance =
    await Engine.context.AssetsContractController.getERC20BalanceOf(
      network.usdc.address,
      address,
      networkClientId,
    );
  if (balance === null || balance === undefined) {
    throw new Error('No USDC balance');
  }
  return BigInt(balance.toString(10));
};

/**
 * The Funding Wallet's USDC balance on the deposit chain, read once from the
 * chain itself (the token may not be in the wallet's token list). Nothing is
 * read while `enabled` is false, which the screen sets when the device is
 * offline; the read runs when it comes back. No polling, and the address
 * never enters a cache key.
 */
export const useUsdcBalance = ({
  network,
  address,
  enabled,
}: {
  network: PredictDepositNetwork | undefined;
  address: string | undefined;
  enabled: boolean;
}): UsdcBalance => {
  const requestKey =
    network && address && enabled
      ? `${network.chainId}:${network.usdc.address}:${address}`
      : undefined;
  const [state, setState] = useState<{
    key: string;
    balance: UsdcBalance;
  }>();

  useEffect(() => {
    if (!requestKey || !network || !address) {
      setState(undefined);
      return undefined;
    }
    let isCurrent = true;
    setState({ key: requestKey, balance: { status: 'loading' } });
    readUsdcBalance(network, address)
      .then((baseUnits) => {
        if (isCurrent) {
          setState({
            key: requestKey,
            balance: { status: 'ready', baseUnits },
          });
        }
      })
      .catch(() => {
        if (isCurrent) {
          setState({
            key: requestKey,
            balance: { status: 'unavailable' },
          });
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [address, network, requestKey]);

  if (!address || !enabled) {
    return { status: 'unavailable' };
  }
  if (!network || !requestKey) {
    return { status: 'loading' };
  }
  if (state?.key === requestKey) {
    return state.balance;
  }
  return { status: 'loading' };
};
