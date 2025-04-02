import { useEffect, useState, useCallback } from 'react';
import { type Hex, type CaipChainId, isCaipChainId } from '@metamask/utils';
import { abiERC20 } from '@metamask/metamask-eth-abis';
import { Web3Provider } from '@ethersproject/providers';
import { formatUnits, getAddress, parseUnits } from 'ethers/lib/utils';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { getProviderByChainId } from '../../../../../util/notifications/methods/common';
import { BigNumber, constants, Contract } from 'ethers';
import usePrevious from '../../../../hooks/usePrevious';
import { isSolanaChainId } from '@metamask/bridge-controller';
import { selectMultichainTokenList } from '../../../../../selectors/multichain/multichain';

export async function fetchAtomicTokenBalance(
  address: string,
  userAddress: string,
  web3Provider: Web3Provider,
): Promise<BigNumber> {
  const tokenContract = new Contract(address, abiERC20, web3Provider);
  const tokenBalancePromise = tokenContract
    ? tokenContract.balanceOf(userAddress)
    : Promise.resolve();
  return await tokenBalancePromise;
}

export const fetchEvmAtomicBalance = async (
  web3Provider: Web3Provider,
  selectedAddress: string,
  tokenAddress: string,
  chainId: Hex,
): Promise<BigNumber | undefined> => {
  if (tokenAddress && chainId) {
    if (tokenAddress === constants.AddressZero) {
      return await web3Provider.getBalance(getAddress(selectedAddress));
    }
    return await fetchAtomicTokenBalance(tokenAddress, selectedAddress, web3Provider);
  }
  return undefined;
};

interface Balance {
  displayBalance: string;
  atomicBalance: BigNumber;
}

/**
 * A hook that fetches and returns the latest balance for a given token.
 * Latest balance is important because token balances can be cached and may not be updated immediately.
 * @param token.address - The token address.
 * @param token.decimals - The token decimals.
 * @param token.chainId - The chain ID to be used for fetching the balance.
 * @param token.balance - The cached token balance as a non-atomic decimal string, e.g. "1.23456".
 * @returns An object containing the the balance as a non-atomic decimal string and the atomic balance as a BigNumber.
 */
export const useLatestBalance = (
  token: {
    address?: string;
    decimals?: number;
    chainId?: Hex | CaipChainId;
    balance?: string
  },
) => {
  const [balance, setBalance] = useState<Balance | undefined>(undefined);
  const selectedAddress = useSelector(selectSelectedInternalAccountFormattedAddress);
  const previousToken = usePrevious(token);

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  // Already contains balance and fiat values
  // Balance and fiat values are not truncated
  const nonEvmTokens = useSelector(selectMultichainTokenList);
  ///: END:ONLY_INCLUDE_IF

  const chainId = token.chainId;

  const handleFetchEvmAtomicBalance = useCallback(async () => {
    if (
      token.address &&
      token.decimals &&
      chainId && !isCaipChainId(chainId) &&
      selectedAddress
    ) {
      const web3Provider = getProviderByChainId(chainId);
      const atomicBalance = await fetchEvmAtomicBalance(
        web3Provider,
        selectedAddress,
        token.address,
        chainId,
      );
      if (atomicBalance && token.decimals) {
        setBalance({
          displayBalance: formatUnits(atomicBalance, token.decimals),
          atomicBalance,
        });
      }
    }
  }, [token.address, token.decimals, chainId, selectedAddress]);

  // No need to fetch the balance for non-EVM tokens, use the balance provided by the
  // multichain balances controller
  const handleSolanaAtomicBalance = useCallback(async () => {
    if (
      token.address &&
      token.decimals &&
      chainId && isSolanaChainId(chainId) &&
      selectedAddress
    ) {
      const displayBalance = nonEvmTokens.find((nonEvmToken) =>
        nonEvmToken.address === token.address
        && nonEvmToken.chainId === chainId)?.balance;
      if (displayBalance && token.decimals) {
        setBalance({
          displayBalance,
          atomicBalance: parseUnits(displayBalance, token.decimals),
        });
      }
    }
  }, [token.address, token.decimals, chainId, selectedAddress, nonEvmTokens]);

  useEffect(() => {
    if (!isCaipChainId(chainId)) {
      handleFetchEvmAtomicBalance();
    } else if (isSolanaChainId(chainId)) {
      handleSolanaAtomicBalance();
    }
  }, [handleFetchEvmAtomicBalance, handleSolanaAtomicBalance, chainId]);

  if (!token.address || !token.decimals) {
    return undefined;
  }

  const cachedBalance = {
    displayBalance: token.balance,
    atomicBalance: token.balance
      ? parseUnits(token.balance, token.decimals)
      : undefined,
  };

  // If the token has changed, return cached balance of new token, so we have time to fetch the new balance
  if (previousToken?.address !== token.address) {
    return cachedBalance;
  }

  // Return balance if it exists, otherwise return cached balance of new token
  return balance ?? cachedBalance;
};
