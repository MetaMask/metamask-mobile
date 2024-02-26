import { toHex } from '@metamask/controller-utils';
import { Hex, hasProperty, isObject } from '@metamask/utils';
import { regex } from '../../../app/util/regex';

//@ts-expect-error - This error is expected, but ethereumjs-util exports this function
import { isHexString } from 'ethereumjs-util';
import { NetworkState } from '@metamask/network-controller';
import { Transaction } from '@metamask/transaction-controller';
import { captureException } from '@sentry/react-native';
import {
  AddressBookEntry,
  AddressBookState,
} from '@metamask/address-book-controller';
import { Nft, NftContract, NftState } from '@metamask/assets-controllers';

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
export default function migrate(state: unknown) {
  // Chaning chain id to hexadecimal chain Id on the networks already on the local state
  if (!isObject(state)) {
    captureException(
      new Error(`Migration 29: Invalid state: '${typeof state}'`),
    );
    return state;
  }

  if (!isObject(state.engine)) {
    captureException(
      new Error(`Migration 29: Invalid engine state: '${typeof state.engine}'`),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `Migration 29: Invalid engine backgroundState: '${typeof state.engine
          .backgroundState}'`,
      ),
    );
    return state;
  }

  const networkControllerState = state.engine.backgroundState.NetworkController;
  const newNetworkControllerState = state.engine.backgroundState
    .NetworkController as NetworkState;

  if (!isObject(networkControllerState)) {
    captureException(
      new Error(
        `Migration 29: Invalid NetworkController state: '${typeof networkControllerState}'`,
      ),
    );
    return state;
  }

  if (
    !hasProperty(networkControllerState, 'providerConfig') ||
    !isObject(networkControllerState.providerConfig)
  ) {
    captureException(
      new Error(
        `Migration 29: Invalid NetworkController providerConfig: '${typeof networkControllerState.providerConfig}'`,
      ),
    );
    return state;
  }

  if (!networkControllerState.providerConfig.chainId) {
    captureException(
      new Error(
        `Migration 29: Invalid NetworkController providerConfig chainId: '${JSON.stringify(
          networkControllerState.providerConfig.chainId,
        )}'`,
      ),
    );
    return state;
  }

  if (networkControllerState.providerConfig.chainId) {
    const networkControllerChainId = networkControllerState.providerConfig
      .chainId as string;

    networkControllerState.providerConfig.chainId = toHex(
      networkControllerChainId,
    );
  }

  // Changing rcpTarget property for the new rpcUrl
  if (networkControllerState.providerConfig.rpcTarget) {
    const networkControllerRpcTarget =
      networkControllerState.providerConfig.rpcTarget;

    networkControllerState.providerConfig.rpcUrl = networkControllerRpcTarget;

    delete networkControllerState.providerConfig.rpcTarget;
  }

  if (
    !hasProperty(networkControllerState, 'networkDetails') ||
    !isObject(networkControllerState.networkDetails)
  ) {
    captureException(
      new Error(
        `Migration 29: Invalid NetworkController networkDetails: '${JSON.stringify(
          networkControllerState.networkDetails,
        )}'`,
      ),
    );
    return state;
  }

  if (
    !hasProperty(
      networkControllerState.networkDetails,
      'isEIP1559Compatible',
    ) ||
    networkControllerState.networkDetails.isEIP1559Compatible === null ||
    networkControllerState.networkDetails.isEIP1559Compatible === undefined
  ) {
    captureException(
      new Error(
        `Migration 29: Invalid NetworkController networkDetails isEIP1559Compatible: '${JSON.stringify(
          networkControllerState.networkDetails.isEIP1559Compatible,
        )}'`,
      ),
    );
    return state;
  }

  // Addressing networkDetails property change
  const isEIP1559Compatible =
    networkControllerState.networkDetails.isEIP1559Compatible;

  if (isEIP1559Compatible) {
    networkControllerState.networkDetails = {
      EIPS: {
        1559: true,
      },
    };
  } else {
    networkControllerState.networkDetails = {
      EIPS: {
        1559: false,
      },
    };
  }

  if (isObject(networkControllerState.networkDetails)) {
    delete networkControllerState.networkDetails.isEIP1559Compatible;
  }

  if (
    !hasProperty(networkControllerState, 'networkConfigurations') ||
    !isObject(networkControllerState.networkConfigurations)
  ) {
    captureException(
      new Error(
        `Migration 29: Invalid NetworkController networkConfigurations: '${JSON.stringify(
          networkControllerState.networkConfigurations,
        )}'`,
      ),
    );
    return state;
  }

  // Addressing networkConfigurations chainId property change to hexadecimal
  if (networkControllerState.networkConfigurations) {
    Object.entries(networkControllerState.networkConfigurations).forEach(
      ([key, networkConfiguration]) => {
        if (isObject(networkConfiguration) && networkConfiguration.chainId) {
          const newHexChainId = toHex(networkConfiguration.chainId as string);
          newNetworkControllerState.networkConfigurations[key].chainId =
            newHexChainId;
        }
      },
    );
  }

  // Validating if the networks were already onboarded
  // This property can be undefined
  if (
    isObject(state.networkOnboarded) &&
    isObject(state.networkOnboarded.networkOnboardedState)
  ) {
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

  const swapsState = state.swaps;
  // Swaps on the state initial state key chain id changed for hexadecimal
  // This property can be undefined
  if (isObject(swapsState)) {
    Object.keys(swapsState).forEach((key) => {
      // To match keys that are composed entirely of digits
      if (regex.decimalStringMigrations.test(key)) {
        const hexadecimalChainId = toHex(key);
        state.swaps = {
          ...swapsState,
          [hexadecimalChainId]: swapsState[key],
        };
        if (isObject(state.swaps)) {
          delete state.swaps[key];
        }
      }
    });
  }

  const addressBookControllerState =
    state?.engine?.backgroundState?.AddressBookController;

  const newAddressBookControllerState = state?.engine?.backgroundState
    ?.AddressBookController as AddressBookState;

  if (!isObject(addressBookControllerState)) {
    captureException(
      new Error(
        `Migration 29: Invalid AddressBookController state: '${JSON.stringify(
          addressBookControllerState,
        )}'`,
      ),
    );
    return state;
  }

  if (
    !hasProperty(addressBookControllerState, 'addressBook') ||
    !isObject(addressBookControllerState.addressBook)
  ) {
    captureException(
      new Error(
        `Migration 29: Invalid AddressBookController addressBook: '${JSON.stringify(
          addressBookControllerState.addressBook,
        )}'`,
      ),
    );
    return state;
  }

  // Address book controller chain id identifier changed for hexadecimal
  if (addressBookControllerState.addressBook) {
    const addressBook = addressBookControllerState.addressBook;
    Object.keys(addressBook).forEach((chainId) => {
      if (!isHexString(chainId)) {
        const hexChainId = toHex(chainId);
        const tempNewAddressBook: {
          [hexChainId: Hex]: { [address: string]: AddressBookEntry };
        } = {};
        let newAddress: AddressBookEntry;
        if (isObject(addressBook) && typeof chainId === 'string') {
          const addressBookChainId = addressBook[chainId];
          if (isObject(addressBookChainId)) {
            Object.keys(addressBookChainId).forEach((address) => {
              const addressBookChainIdAddress = addressBookChainId[address];
              if (addressBookChainIdAddress) {
                newAddress = addressBookChainIdAddress as AddressBookEntry;

                if (isObject(addressBookChainIdAddress)) {
                  newAddress.chainId = toHex(
                    addressBookChainIdAddress.chainId as string,
                  );
                }
                tempNewAddressBook[hexChainId] = {
                  ...tempNewAddressBook[hexChainId],
                  [address]: newAddress,
                };
              }
            });
          }
        }
        newAddressBookControllerState.addressBook[hexChainId] =
          tempNewAddressBook[hexChainId];
        if (isObject(addressBookControllerState.addressBook)) {
          delete addressBookControllerState.addressBook[chainId];
        }
      }
    });
  }

  const swapsControllerState = state?.engine?.backgroundState?.SwapsController;

  if (!isObject(swapsControllerState)) {
    captureException(
      new Error(
        `Migration 29: Invalid SwapsController state: '${JSON.stringify(
          swapsControllerState,
        )}'`,
      ),
    );
    return state;
  }

  // Swaps controller chain cache property now is on hexadecimal format
  if (swapsControllerState.chainCache) {
    Object.keys(swapsControllerState.chainCache).forEach((chainId) => {
      if (!isHexString(chainId)) {
        const hexChainId = toHex(chainId);
        if (isObject(swapsControllerState.chainCache)) {
          swapsControllerState.chainCache[hexChainId] =
            swapsControllerState.chainCache[chainId];
        }

        if (
          isObject(swapsControllerState) &&
          isObject(swapsControllerState.chainCache)
        ) {
          delete swapsControllerState.chainCache[chainId];
        }
      }
    });
  }

  const nftControllerState = state?.engine?.backgroundState?.NftController;
  const newNftControllerState = state?.engine?.backgroundState
    ?.NftController as NftState;

  if (!isObject(nftControllerState)) {
    captureException(
      new Error(
        `Migration 29: Invalid NftController state: '${JSON.stringify(
          nftControllerState,
        )}'`,
      ),
    );
    return state;
  }

  if (
    !hasProperty(nftControllerState, 'allNftContracts') ||
    !isObject(nftControllerState.allNftContracts)
  ) {
    captureException(
      new Error(
        `Migration 29: Invalid nftControllerState allNftsContracts: '${JSON.stringify(
          nftControllerState.allNftContracts,
        )}'`,
      ),
    );
    return state;
  }

  // NftController allNfts, allNftsContracts chain Id now is on hexadecimal format
  if (nftControllerState.allNftContracts) {
    Object.keys(nftControllerState.allNftContracts).forEach(
      (nftContractsAddress) => {
        if (isObject(nftControllerState.allNftContracts)) {
          const nftContractAddress =
            nftControllerState.allNftContracts[nftContractsAddress];

          if (isObject(nftContractAddress)) {
            Object.keys(nftContractAddress).forEach((chainId) => {
              if (!isHexString(chainId)) {
                const hexChainId = toHex(chainId);
                if (Array.isArray(nftContractAddress[chainId])) {
                  const nftsChainId = nftContractAddress[
                    chainId
                  ] as NftContract[];

                  newNftControllerState.allNftContracts[nftContractsAddress][
                    hexChainId
                  ] = nftsChainId;
                }

                if (
                  isObject(nftControllerState.allNftContracts) &&
                  isObject(
                    nftControllerState.allNftContracts[nftContractsAddress],
                  )
                ) {
                  // Need to type cast because typescript is static typed
                  // and typescript is
                  delete (
                    nftControllerState.allNftContracts[
                      nftContractsAddress
                    ] as Record<string, unknown>
                  )[chainId];
                }
              }
            });
          }
        }
      },
    );
  }

  if (
    !hasProperty(nftControllerState, 'allNfts') ||
    !isObject(nftControllerState.allNfts)
  ) {
    captureException(
      new Error(
        `Migration 29: Invalid nftControllerState allNfts: '${JSON.stringify(
          nftControllerState.allNfts,
        )}'`,
      ),
    );
    return state;
  }

  if (nftControllerState.allNfts) {
    const allNfts = nftControllerState.allNfts;
    Object.keys(nftControllerState.allNfts).forEach((allNftsByAddress) => {
      const nftsByAddress = allNfts[allNftsByAddress];
      if (isObject(nftsByAddress)) {
        Object.keys(nftsByAddress).forEach((chainId) => {
          if (!isHexString(chainId)) {
            const hexChainId = toHex(chainId);
            if (Array.isArray(nftsByAddress[chainId])) {
              const nftsChainId = nftsByAddress[chainId] as Nft[];

              newNftControllerState.allNfts[allNftsByAddress][hexChainId] =
                nftsChainId;
            }

            if (
              isObject(nftControllerState.allNfts) &&
              isObject(nftControllerState.allNfts[allNftsByAddress])
            ) {
              // Need to type cast because typescript is static typed
              // and typescript is
              delete (
                nftControllerState.allNfts[allNftsByAddress] as Record<
                  string,
                  unknown
                >
              )[chainId];
            }
          }
        });
      }
    });
  }

  const transactionControllerState =
    state?.engine?.backgroundState?.TransactionController;

  if (!isObject(transactionControllerState)) {
    captureException(
      new Error(
        `Migration 29: Invalid TransactionController state: '${JSON.stringify(
          transactionControllerState,
        )}'`,
      ),
    );
    return state;
  }

  // Transaction Controller transactions object chain id property to hexadecimal
  if (Array.isArray(transactionControllerState.transactions)) {
    transactionControllerState.transactions.forEach(
      (transaction: Transaction, index: number) => {
        if (transaction && !isHexString(transaction.chainId)) {
          if (
            Array.isArray(transactionControllerState.transactions) &&
            isObject(transactionControllerState.transactions[index])
          ) {
            transactionControllerState.transactions[index].chainId = toHex(
              transaction.chainId as string,
            );
          }
        }
      },
    );
  }

  return state;
}
