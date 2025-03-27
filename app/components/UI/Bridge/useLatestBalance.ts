import { useEffect, useState, useCallback } from 'react';
import { type Hex, type CaipChainId, isCaipChainId } from '@metamask/utils';
import { abiERC20 } from '@metamask/metamask-eth-abis';
import { Web3Provider } from '@ethersproject/providers';
import { formatUnits, getAddress } from 'ethers/lib/utils';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { selectChainId } from '../../../selectors/networkController';
import { getProviderByChainId } from '../../../util/notifications/methods/common';
import { BigNumber, constants, Contract } from 'ethers';

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

export const fetchAtomicBalance = async (
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
 * @param token - The token object containing address, decimals, and symbol.
 * @param chainId - The chain ID to be used for fetching the balance. Optional.
 * @returns An object containing the the balance as a non-atomic decimal string and the atomic balance as a BigNumber.
 */
export const useLatestBalance = (
  token: {
    address?: string;
    decimals?: number;
  },
  chainId?: Hex | CaipChainId,
) => {
  const [balance, setBalance] = useState<Balance | undefined>(undefined);
  const selectedAddress = useSelector(selectSelectedInternalAccountFormattedAddress);
  const currentChainId = useSelector(selectChainId);

  const handleFetchAtomicBalance = useCallback(async () => {
    if (
      token.address &&
      token.decimals &&
      chainId && !isCaipChainId(chainId) &&
      currentChainId === chainId &&
      selectedAddress
    ) {
      const web3Provider = getProviderByChainId(currentChainId);
      const atomicBalance = await fetchAtomicBalance(
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
  }, [token.address, token.decimals, chainId, currentChainId, selectedAddress]);

  useEffect(() => {
    handleFetchAtomicBalance();
  }, [handleFetchAtomicBalance]);

  return balance;
};
