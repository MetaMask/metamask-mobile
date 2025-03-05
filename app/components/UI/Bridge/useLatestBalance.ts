import { useEffect, useMemo, useState } from 'react';
import { type Hex, type CaipChainId, isCaipChainId } from '@metamask/utils';
import { ZERO_ADDRESS } from '@metamask/assets-controllers/dist/token-prices-service/codefi-v2.cjs';
import { abiERC20 } from '@metamask/metamask-eth-abis';
import { Web3Provider } from '@ethersproject/providers';
import { formatUnits, getAddress } from 'ethers/lib/utils';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { selectChainId } from '../../../selectors/networkController';
import { getProviderByChainId } from '../../../util/notifications/methods/common';
import { BigNumber, Contract } from 'ethers';

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
    if (tokenAddress === ZERO_ADDRESS) {
      return await web3Provider.getBalance(getAddress(selectedAddress));
    }
    return await fetchAtomicTokenBalance(tokenAddress, selectedAddress, web3Provider);
  }
  return undefined;
};


/**
 * Custom hook to fetch and format the latest balance of a given token or native asset.
 *
 * @param token - The token object for which the balance is to be fetched. Can be null.
 * @param chainId - The chain ID to be used for fetching the balance. Optional.
 * @returns An object containing the the balance as a non-atomic decimal string and the atomic balance as a BigNumber.
 */
export const useLatestBalance = (
  token: {
    address: string;
    decimals?: number;
    symbol?: string;
  },
  chainId?: Hex | CaipChainId,
) => {
  const [atomicBalance, setAtomicBalance] = useState<BigNumber | undefined>(undefined);

  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const currentChainId = useSelector(selectChainId);


  useEffect(() => {
    const handleFetchAtomicBalance = async () => {
      if (
        token?.address &&
        chainId && !isCaipChainId(chainId) &&
        currentChainId === chainId &&
        selectedAddress
      ) {
        const web3Provider = getProviderByChainId(currentChainId);
        const balance = await fetchAtomicBalance(
          web3Provider,
          selectedAddress,
          token.address,
          chainId,
        );
        setAtomicBalance(balance);
      }
    };

    handleFetchAtomicBalance();
  }, [
    chainId,
    currentChainId,
    token,
    selectedAddress,
  ]);


  if (!token.decimals || !token.symbol) {
    throw new Error(
      `Failed to calculate latest balance - ${token.symbol} token is missing "decimals" value`,
    );
  }

  return useMemo(
    () =>
      atomicBalance
        ? {
          displayBalance: formatUnits(atomicBalance, token?.decimals),
          atomicBalance,
        }
        : undefined,
    [atomicBalance, token?.decimals],
  );
};
