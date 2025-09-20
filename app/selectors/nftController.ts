import { createSelector } from 'reselect';
import {
  Nft,
  NftContract,
  NftControllerState,
} from '@metamask/assets-controllers';
import { Hex, KnownCaipNamespace } from '@metamask/utils';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectLastSelectedEvmAccount } from './accountsController';
import { selectEnabledNetworksByNamespace } from './networkEnablementController';

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

export const selectAllNftsFlat = createSelector(
  selectAllNfts,
  (nftsByChainByAccount) => {
    const nftsByChainArray = Object.values(nftsByChainByAccount);
    return nftsByChainArray.reduce((acc, nftsByChain) => {
      const nftsArrays = Object.values(nftsByChain);
      return acc.concat(...nftsArrays);
    }, [] as Nft[]);
  },
);

/**
 * Selector that returns NFT contracts for the currently selected EVM account,
 * filtered by enabled networks in the EIP155 namespace.
 *
 * @returns Record of chain IDs to NFT contract arrays for the selected account
 */
export const multichainCollectibleForEvmAccount = createDeepEqualSelector(
  selectLastSelectedEvmAccount,
  selectAllNftContracts,
  selectEnabledNetworksByNamespace,
  (selectedEvmAccount, allNftContracts, enabledNetworks) => {
    // Early return if no selected account
    const accountAddress = selectedEvmAccount?.address;
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
