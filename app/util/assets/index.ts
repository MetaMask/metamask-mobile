import { Nft, NftControllerState } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';

export const formatWithThreshold = (
  amount: number | null,
  threshold: number,
  locale: string,
  options: Intl.NumberFormatOptions,
): string => {
  if (amount === null) {
    return '';
  }
  if (amount === 0) {
    return new Intl.NumberFormat(locale, options).format(0);
  }
  return amount < threshold
    ? `<${new Intl.NumberFormat(locale, options).format(threshold)}`
    : new Intl.NumberFormat(locale, options).format(amount);
};

type AccountNfts = NftControllerState['allNfts'][string]; // Type for NFTs of a single account

const getChainEntries = (state: AccountNfts): [Hex, Nft[]][] =>
  Object.entries(state) as [Hex, Nft[]][];

const isMatchingNft = (nft1: Nft, nft2: Nft) =>
  nft1.address === nft2.address && nft1.tokenId === nft2.tokenId;

/**
 * Compares two NFT states for a single account and returns newly detected NFTs
 * @param previousState - Previous state of NFTs grouped by chainId for a single account
 * @param newState - New state of NFTs grouped by chainId for a single account
 * @returns Array of newly detected NFTs with their respective chainIds
 */
export const compareNftStates = (
  previousState?: AccountNfts,
  newState?: AccountNfts,
): Nft[] => {
  console.log('compareNftStates');
  // Return empty array if newState is missing (nothing new to compare)
  if (!newState) return [];

  // Treat undefined/null previousState as empty object (all NFTs will be considered new)
  const prevState = previousState || {};

  return getChainEntries(newState).flatMap(([chainId, newChainNfts]) => {
    const previousChainNfts = prevState[chainId] || [];

    return newChainNfts.filter(
      (newNft) =>
        !previousChainNfts.some((prevNft) => isMatchingNft(prevNft, newNft)),
    );
  });
};
