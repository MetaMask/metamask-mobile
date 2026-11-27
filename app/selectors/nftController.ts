import { createSelector } from 'reselect';
import {
  Nft,
  NftContract,
  NftControllerState,
} from '@metamask/assets-controllers';
import { Hex, KnownCaipNamespace } from '@metamask/utils';
import { EthScope } from '@metamask/keyring-api';
import { toHex } from '@metamask/controller-utils';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectEnabledNetworksByNamespace } from './networkEnablementController';
import { selectSelectedInternalAccountByScope } from './multichainAccounts/accounts';
import { selectSelectedInternalAccountAddress } from './accountsController';

const selectNftControllerState = (state: RootState) =>
  state.engine.backgroundState.NftController;

export const selectAllNftContracts = createSelector(
  selectNftControllerState,
  (nftControllerState: NftControllerState) =>
    nftControllerState.allNftContracts,
);

export const selectAllNfts = createSelector(
  selectNftControllerState,
  (nftControllerState: NftControllerState) => nftControllerState.allNfts,
);

const EMPTY_NFTS: Nft[] = Object.freeze([] as Nft[]) as Nft[];

export const selectAllNftsFlat = createDeepEqualSelector(
  selectAllNfts,
  (nftsByChainByAccount: NftControllerState['allNfts']): Nft[] => {
    const nftsByChainArray = Object.values(nftsByChainByAccount);
    if (nftsByChainArray.length === 0) {
      return EMPTY_NFTS;
    }

    return nftsByChainArray.reduce<Nft[]>((acc, nftsByChain) => {
      const nftsArrays = Object.values(nftsByChain);
      return acc.concat(...nftsArrays);
    }, []);
  },
);

const EMPTY_NFT_IDENTITY_INDEX: ReadonlyMap<string, Nft> = new Map();

const getNftIdentityKey = (
  chainId: Hex,
  contractAddress: string,
  tokenId: string | number,
): string => `${chainId}:${contractAddress.toLowerCase()}:${String(tokenId)}`;

/**
 * Memoized index of all owned NFTs across every account and chain, keyed by
 * `${chainId}:${address.toLowerCase()}:${tokenId}`.
 *
 * Uses reference equality on `allNfts` so unrelated controller updates reuse
 * the cached map in O(1), and keeps the first match when multiple accounts
 * hold the same token (e.g. ERC-1155).
 */
export const selectNftsByIdentity = createSelector(
  selectAllNfts,
  (
    allNfts: NftControllerState['allNfts'] | undefined,
  ): ReadonlyMap<string, Nft> => {
    if (!allNfts) {
      return EMPTY_NFT_IDENTITY_INDEX;
    }

    const index = new Map<string, Nft>();

    for (const accountAddress of Object.keys(allNfts)) {
      const nftsByChain = allNfts[accountAddress];
      if (!nftsByChain) {
        continue;
      }

      for (const chainId of Object.keys(nftsByChain) as Hex[]) {
        const chainNfts = nftsByChain[chainId];
        if (!chainNfts) {
          continue;
        }

        for (const nft of chainNfts) {
          if (!nft.address) {
            continue;
          }
          const key = getNftIdentityKey(chainId, nft.address, nft.tokenId);
          if (!index.has(key)) {
            index.set(key, nft);
          }
        }
      }
    }

    return index.size === 0 ? EMPTY_NFT_IDENTITY_INDEX : index;
  },
);

/**
 * Looks up a single owned NFT by contract address + token id on a given chain,
 * searching every account in `allNfts` (the NFT belongs to whichever account
 * received/minted it). Returns the controller's `Nft` (with `image`, `name`,
 * `collection`, …) or `undefined`.
 *
 * Returns the live state reference, so `useSelector` stays referentially stable
 * across renders when the underlying NFT does not change. Address comparison is
 * case-insensitive; token ids are compared as strings.
 *
 * @param state - Redux root state.
 * @param contractAddress - NFT contract address (hex).
 * @param tokenId - NFT token id.
 * @param chainId - Hex chain id (e.g. `0x1`).
 * @returns The matching `Nft`, or `undefined`.
 */
export const selectNftByIdentity = (
  state: RootState,
  contractAddress: string,
  tokenId: string,
  chainId: Hex,
): Nft | undefined =>
  selectNftsByIdentity(state).get(
    getNftIdentityKey(chainId, contractAddress, tokenId),
  );

/**
 * Selector that returns NFT contracts for the currently selected EVM account,
 * filtered by enabled networks in the EIP155 namespace.
 *
 * @returns Record of chain IDs to NFT contract arrays for the selected account
 */
export const multichainCollectibleForEvmAccount = createDeepEqualSelector(
  selectSelectedInternalAccountByScope,
  selectAllNftContracts,
  selectEnabledNetworksByNamespace,
  (selectedInternalAccountByScope, allNftContracts, enabledNetworks) => {
    // Early return if no selected account
    const accountAddress = selectedInternalAccountByScope(
      EthScope.Eoa,
    )?.address;
    if (!accountAddress) {
      return {};
    }

    // Get contracts for the selected account
    const accountContracts = allNftContracts[accountAddress as Hex];
    if (!accountContracts || Object.keys(accountContracts).length === 0) {
      return {};
    }

    // Get enabled EIP155 networks
    const eip155Networks = enabledNetworks?.[KnownCaipNamespace.Eip155];
    if (!eip155Networks || Object.keys(eip155Networks).length === 0) {
      return {};
    }

    // Filter and build result for enabled chains only
    const result: Record<Hex, NftContract[]> = {};
    for (const [chainId, isEnabled] of Object.entries(eip155Networks)) {
      if (isEnabled && accountContracts[chainId as Hex]) {
        result[chainId as Hex] = accountContracts[chainId as Hex];
      }
    }

    return result;
  },
);

const buildAllowedNftChainIdSet = (chainIds: string[]): Set<string> => {
  const allowedChainIds = new Set(chainIds);
  for (const chainId of chainIds) {
    if (chainId.startsWith('eip155:')) {
      const reference = chainId.slice(7);
      if (reference) {
        allowedChainIds.add(toHex(reference));
      }
    }
  }
  return allowedChainIds;
};

export const selectMultichainCollectiblesByEnabledNetworks =
  createDeepEqualSelector(
    [
      selectSelectedInternalAccountAddress,
      selectAllNfts,
      selectEnabledNetworksByNamespace,
      (_state: RootState, preferredChainIds?: string[]) => preferredChainIds,
      (
        _state: RootState,
        _preferredChainIds?: string[],
        addressesOverride?: string[],
      ) => addressesOverride,
    ],
    (
      selectedAddress,
      allNfts,
      enabledNetworks,
      preferredChainIds,
      addressesOverride,
    ): Record<string, Nft[]> => {
      const addresses =
        addressesOverride?.length && addressesOverride.length > 0
          ? addressesOverride
          : selectedAddress
            ? [selectedAddress]
            : [];

      let allowedChainIds: Set<string>;
      if (preferredChainIds?.length && preferredChainIds.length > 0) {
        allowedChainIds = buildAllowedNftChainIdSet(preferredChainIds);
      } else {
        const enabledChainIds = Object.values(enabledNetworks ?? {}).flatMap(
          (networkMap) =>
            Object.entries(networkMap)
              .filter(([, enabled]) => enabled)
              .map(([chainId]) => chainId),
        );
        if (enabledChainIds.length === 0) {
          return {};
        }
        allowedChainIds = new Set(enabledChainIds);
      }

      const result: Record<string, Nft[]> = {};
      for (const address of addresses) {
        const addressNfts = allNfts?.[address as Hex];
        if (!addressNfts) {
          continue;
        }
        for (const [chainId, nfts] of Object.entries(addressNfts)) {
          if (allowedChainIds.has(chainId) && Array.isArray(nfts)) {
            result[chainId] = (result[chainId] ?? []).concat(nfts);
          }
        }
      }
      return result;
    },
  );

export const makeSelectMultichainCollectiblesByEnabledNetworks =
  (preferredChainIds?: string[], addressesOverride?: string[]) =>
  (state: RootState) =>
    selectMultichainCollectiblesByEnabledNetworks(
      state,
      preferredChainIds,
      addressesOverride,
    );
