import { createSelector } from 'reselect';
import {
  Nft,
  NftContract,
  NftControllerState,
} from '@metamask/assets-controllers';
import { Hex, KnownCaipNamespace } from '@metamask/utils';
import { EthScope } from '@metamask/keyring-api';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectEnabledNetworksByNamespace } from './networkEnablementController';
import { selectSelectedInternalAccountByScope } from './multichainAccounts/accounts';

// TODO Unified Assets Controller State Access (1)
// NftController: allNftContracts, allNfts
// References
// app/selectors/nftController.ts (2)
const selectNftControllerState = (state: RootState) =>
  state.engine.backgroundState.NftController;

// TODO Unified Assets Controller State Access (1)
// NftController: allNftContracts
// References
// app/selectors/nftController.ts (1)
// app/reducers/collectibles/index.js (2)
// app/components/Views/confirmations/hooks/nft/useNft.ts (1)
// app/components/hooks/DisplayName/useWatchedNFTNames.ts (1)
export const selectAllNftContracts = createSelector(
  selectNftControllerState,
  (nftControllerState: NftControllerState) =>
    nftControllerState.allNftContracts,
);

// TODO Unified Assets Controller State Access (1)
// NftController: allNfts
// References
// app/selectors/nftController.ts (1)
// app/reducers/collectibles/index.js (3)
// app/reducers/collectibles/collectibles.ts (1)
// app/components/Views/confirmations/hooks/send/useNfts.ts (1)
// app/components/Views/ProtectWalletMandatoryModal/ProtectWalletMandatoryModal.tsx (1)
export const selectAllNfts = createSelector(
  selectNftControllerState,
  (nftControllerState: NftControllerState) => nftControllerState.allNfts,
);

// TODO Unified Assets Controller State Access (2)
// Uses: selectAllNfts
// References
// app/util/sentry/tags/index.ts (1)
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

// TODO Unified Assets Controller State Access (2)
// Uses: selectAllNftContracts
// References
// None found
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
