import useOwnedNfts from './useOwnedNfts';

/**
 * Hook to check if the currently selected account has any NFTs
 * across enabled networks.
 *
 * Only counts NFTs that are currently owned (isCurrentlyOwned === true),
 * matching the same logic used by NftGrid.
 *
 * @returns true if the account has at least one owned NFT, false otherwise
 */
const useHasNfts = (): boolean => {
  const ownedNfts = useOwnedNfts();
  return ownedNfts.length > 0;
};

export default useHasNfts;
