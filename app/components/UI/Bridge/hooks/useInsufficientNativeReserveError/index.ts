import {
  formatChainIdToHex,
  isNativeAddress,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';
import { BridgeToken } from '../../types';
import { useSelector } from 'react-redux';
import { getGasFeesSponsoredNetworkEnabled } from '../../../../../selectors/featureFlagController/gasFeesSponsored';
import { BigNumber } from 'ethers';
import { BigNumber as BigNumberJS } from 'bignumber.js';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import { isHardwareAccount } from '../../../../../util/address';

const MINIMUM_NATIVE_RESERVE_BALANCE_PER_CHAIN: { [key: Hex]: string } = {
  '0x8f': '10',
};

const getMinimumReserveBalanceForTokenChainAndAddress = ({
  chainIdHex,
  tokenAddress,
}: {
  chainIdHex: Hex;
  tokenAddress: Hex;
}): string => {
  if (!tokenAddress || !isNativeAddress(tokenAddress)) {
    return '0';
  }
  return MINIMUM_NATIVE_RESERVE_BALANCE_PER_CHAIN[chainIdHex] ?? '0';
};

interface UseInsufficientNativeReserveErrorParams {
  amount?: string;
  token?: BridgeToken;
  latestAtomicBalance?: BigNumber;
  walletAddress?: string;
}

/**
 * Initially for gas-sponsored networks with a native reserve balance
 * logic, such as for Monad that needs 10 MON at all times.
 */
export const useInsufficientNativeReserveError = ({
  amount,
  token,
  latestAtomicBalance,
  walletAddress,
}: UseInsufficientNativeReserveErrorParams) => {
  const isGasFeesSponsoredNetworkEnabled = useSelector(
    getGasFeesSponsoredNetworkEnabled,
  );

  if (
    !amount ||
    !token?.address ||
    !token?.chainId ||
    !latestAtomicBalance ||
    !walletAddress
  ) {
    return undefined;
  }

  const isHardwareWalletAccount = Boolean(
    walletAddress && isHardwareAccount(walletAddress),
  );

  const chainIdHex = formatChainIdToHex(token.chainId);
  const isNetworkGasSponsored = isNonEvmChainId(token.chainId)
    ? false
    : !isHardwareWalletAccount && isGasFeesSponsoredNetworkEnabled(chainIdHex);

  const minimumNativeBalanceToBeKeptInAccount = isNetworkGasSponsored
    ? getMinimumReserveBalanceForTokenChainAndAddress({
        chainIdHex,
        tokenAddress: token.address as Hex,
      })
    : '0';

  const maxSwappableNativeBalanceBaseUnits = BigNumberJS.max(
    new BigNumberJS(latestAtomicBalance.toString() ?? '0').minus(
      BigNumberJS(
        parseUnits(
          minimumNativeBalanceToBeKeptInAccount,
          token.decimals,
        ).toString(),
      ),
    ),
    0,
  );

  const maxSwappableNativeBalance = BigNumberJS(
    formatUnits(maxSwappableNativeBalanceBaseUnits.toFixed(0), token.decimals),
  );

  return minimumNativeBalanceToBeKeptInAccount !== '0' &&
    maxSwappableNativeBalance.lt(amount)
    ? {
        minimumNativeBalanceToBeKeptInAccount,
        maxSwappableNativeBalance: maxSwappableNativeBalance.toString(),
      }
    : undefined;
};
