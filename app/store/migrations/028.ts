import { toHex } from '@metamask/controller-utils';
import { regex } from '../../../app/util/regex';

//@ts-expect-error - This error is expected, but ethereumjs-util exports this function
import { isHexString } from 'ethereumjs-util';
import { NetworkConfiguration } from '@metamask/network-controller';
import { Transaction } from '@metamask/transaction-controller';

/**
 * Converting chain id on decimal format to hexadecimal format
 * Replacing rpcTarget property for the rpcUrl new property on providerConfig
 * Converting keys of networkOnboardedState for hexadecimal for not repeat showing the new network modal
 * Addressing networkDetails property change
 * Addressing networkConfigurations chainId property change to ehxadecimal
 * Swaps on the state initial state key chain id changed for hexadecimal
 * Address book controller chain id identifier changed for hexadecimal
 * Swaps controller chain cache property now is on hexadecimal format
 * NftController allNfts, allNftsContracts chain Id now is on hexadecimal format
 * Transaction Controller transactions object chain id property to hexadecimal
 * decided here https://github.com/MetaMask/core/pull/1367
 * @param {any} state - Redux state.
 * @returns Migrated Redux state.
 */
export default function migrate(state: any) {
  // Chaning chain id to hexadecimal chain Id on the networks already on the local state
  if (
    state?.engine?.backgroundState?.NetworkController?.providerConfig?.chainId
  ) {
    const networkControllerChainId =
      state.engine.backgroundState.NetworkController.providerConfig.chainId;

    state.engine.backgroundState.NetworkController.providerConfig.chainId =
      toHex(networkControllerChainId);
  }
  // Changing rcpTarget property for the new rpcUrl
  if (
    state?.engine?.backgroundState?.NetworkController?.providerConfig?.rpcTarget
  ) {
    const networkControllerRpcTarget =
      state.engine.backgroundState.NetworkController.providerConfig.rpcTarget;

    state.engine.backgroundState.NetworkController.providerConfig.rpcUrl =
      networkControllerRpcTarget;

    delete state.engine.backgroundState.NetworkController.providerConfig
      .rpcTarget;
  }
  // Validating if the networks were already onboarded
  if (state?.networkOnboarded?.networkOnboardedState) {
    const networkOnboardedState = state.networkOnboarded.networkOnboardedState;
    const newNetworkOnboardedState: {
      [key: string]: (typeof networkOnboardedState)[string];
    } = {};

    for (const chainId in networkOnboardedState) {
      const hexChainId = toHex(chainId);
      newNetworkOnboardedState[hexChainId] = networkOnboardedState[chainId];
    }
    state.networkOnboarded.networkOnboardedState = newNetworkOnboardedState;
  }

  // Addressing networkDetails property change
  if (state?.engine?.backgroundState?.NetworkController?.networkDetails) {
    const isEIP1559Compatible =
      state?.engine?.backgroundState?.NetworkController?.networkDetails
        ?.isEIP1559Compatible;

    if (isEIP1559Compatible) {
      state.engine.backgroundState.NetworkController.networkDetails = {
        EIPS: {
          1559: true,
        },
      };
    } else {
      state.engine.backgroundState.NetworkController.networkDetails = {
        EIPS: {
          1559: false,
        },
      };
    }

    delete state.engine.backgroundState.NetworkController.networkDetails
      .isEIP1559Compatible;
  }
  // Addressing networkConfigurations chainId property change to hexadecimal
  if (
    state?.engine?.backgroundState?.NetworkController?.networkConfigurations
  ) {
    Object.values<NetworkConfiguration>(
      state?.engine?.backgroundState?.NetworkController?.networkConfigurations,
    ).forEach((networkConfiguration: NetworkConfiguration) => {
      const newHexChainId = toHex(networkConfiguration.chainId);
      networkConfiguration.chainId = newHexChainId;
    });
  }

  // Swaps on the state initial state key chain id changed for hexadecimal
  if (state?.swaps) {
    Object.keys(state?.swaps).forEach((key) => {
      // To match keys that are composed entirely of digits
      if (regex.decimalStringMigrations.test(key)) {
        const hexadecimalChainId = toHex(key);
        state.swaps = {
          ...state.swaps,
          [hexadecimalChainId]: state.swaps[key],
        };
        delete state.swaps[key];
      }
    });
  }

  // Address book controller chain id identifier changed for hexadecimal
  if (state?.engine?.backgroundState?.AddressBookController?.addressBook) {
    const addressBook =
      state?.engine?.backgroundState?.AddressBookController?.addressBook;
    Object.keys(addressBook).forEach((chainId) => {
      if (!isHexString(chainId)) {
        const hexChainId = toHex(chainId);
        const newAddressBook: {
          [key: string]: (typeof addressBook)[string];
        } = { [hexChainId]: {} };
        let newAddress: {
          [key: string]: (typeof addressBook)[string];
        } = {};
        Object.keys(addressBook[chainId]).forEach((address) => {
          newAddress = addressBook[chainId][address];
          newAddress.chainId = toHex(
            state?.engine?.backgroundState?.AddressBookController?.addressBook[
              chainId
            ][address].chainId,
          );

          newAddressBook[hexChainId][address] = newAddress;
        });
        state.engine.backgroundState.AddressBookController.addressBook[
          hexChainId
        ] = newAddressBook[hexChainId];
        delete state.engine.backgroundState.AddressBookController.addressBook[
          chainId
        ];
      }
    });
  }
  // Swaps controller chain cache property now is on hexadecimal format
  if (state?.engine?.backgroundState?.SwapsController?.chainCache) {
    Object.keys(
      state.engine.backgroundState.SwapsController.chainCache,
    ).forEach((chainId) => {
      if (!isHexString(chainId)) {
        const hexChainId = toHex(chainId);
        state.engine.backgroundState.SwapsController.chainCache[hexChainId] =
          state.engine.backgroundState.SwapsController.chainCache[chainId];
        delete state.engine.backgroundState.SwapsController.chainCache[chainId];
      }
    });
  }
  // NftController allNfts, allNftsContracts chain Id now is on hexadecimal format
  if (state?.engine?.backgroundState?.NftController?.allNftContracts) {
    const allNftContracts =
      state.engine.backgroundState.NftController.allNftContracts;
    Object.keys(
      state.engine.backgroundState.NftController.allNftContracts,
    ).forEach((nftContractsAddress) => {
      Object.keys(allNftContracts[nftContractsAddress]).forEach((chainId) => {
        if (!isHexString(chainId)) {
          const hexChainId = toHex(chainId);
          state.engine.backgroundState.NftController.allNftContracts[
            nftContractsAddress
          ][hexChainId] =
            state.engine.backgroundState.NftController.allNftContracts[
              nftContractsAddress
            ][chainId];

          delete state.engine.backgroundState.NftController.allNftContracts[
            nftContractsAddress
          ][chainId];
        }
      });
    });
  }
  if (state?.engine?.backgroundState?.NftController?.allNfts) {
    const allNfts = state.engine.backgroundState.NftController.allNfts;
    Object.keys(state.engine.backgroundState.NftController.allNfts).forEach(
      (allNftsByAddress) => {
        Object.keys(allNfts[allNftsByAddress]).forEach((chainId) => {
          if (!isHexString(chainId)) {
            const hexChainId = toHex(chainId);
            state.engine.backgroundState.NftController.allNfts[
              allNftsByAddress
            ][hexChainId] =
              state.engine.backgroundState.NftController.allNfts[
                allNftsByAddress
              ][chainId];

            delete state.engine.backgroundState.NftController.allNfts[
              allNftsByAddress
            ][chainId];
          }
        });
      },
    );
  }

  // Transaction Controller transactions object chain id property to hexadecimal
  if (state?.engine?.backgroundState?.TransactionController?.transactions) {
    state.engine.backgroundState.TransactionController.transactions.forEach(
      (transaction: Transaction, index: number) => {
        if (!isHexString(transaction?.chainId)) {
          state.engine.backgroundState.TransactionController.transactions[
            index
          ].chainId = toHex(transaction.chainId as string);
        }
      },
    );
  }
  return state;
}
