import { toHex } from '@metamask/controller-utils';
import { hasProperty, isObject } from '@metamask/utils';
import { regex } from '../../../app/util/regex';

//@ts-expect-error - This error is expected, but ethereumjs-util exports this function
import { isHexString } from 'ethereumjs-util';
import { NetworkConfiguration } from '@metamask/network-controller';
import { Transaction } from '@metamask/transaction-controller';
import { captureException } from '@sentry/react-native';

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
      new Error(`Migration 28: Invalid state: '${typeof state}'`),
    );
    return state;
  }
  if (!isObject(state.engine)) {
    captureException(
      new Error(`Migration 28: Invalid engine state: '${typeof state.engine}'`),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `Migration 28: Invalid engine backgroundState: '${typeof state.engine
          .backgroundState}'`,
      ),
    );
    return state;
  }

  const networkControllerState = state.engine.backgroundState.NetworkController;

  if (!isObject(networkControllerState)) {
    captureException(
      new Error(
        `Migration 28: Invalid NetworkController state: '${typeof networkControllerState}'`,
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
        `Migration 28: Invalid NetworkController providerConfig: '${typeof networkControllerState.providerConfig}'`,
      ),
    );
    return state;
  }

  if (!networkControllerState.providerConfig.chainId) {
    captureException(
      new Error(
        `Migration 28: Invalid NetworkController providerConfig chainId: '${JSON.stringify(
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
        `Migration 28: Invalid NetworkController networkDetails: '${JSON.stringify(
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
        `Migration 28: Invalid NetworkController networkDetails isEIP1559Compatible: '${JSON.stringify(
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

  delete networkControllerState.networkDetails.isEIP1559Compatible;

  if (
    !hasProperty(networkControllerState, 'networkConfigurations') ||
    !isObject(networkControllerState.networkConfigurations)
  ) {
    captureException(
      new Error(
        `Migration 28: Invalid NetworkController networkConfigurations: '${JSON.stringify(
          networkControllerState.networkConfigurations,
        )}'`,
      ),
    );
    return state;
  }

  // Addressing networkConfigurations chainId property change to hexadecimal
  if (networkControllerState.networkConfigurations) {
    Object.values<NetworkConfiguration>(
      networkControllerState.networkConfigurations,
    ).forEach((networkConfiguration: NetworkConfiguration) => {
      if (networkConfiguration) {
        const newHexChainId = toHex(networkConfiguration.chainId);
        networkConfiguration.chainId = newHexChainId;
      }
    });
  }

  // Validating if the networks were already onboarded
  // This property can be undefined
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

  // Swaps on the state initial state key chain id changed for hexadecimal
  // This property can be undefined
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

  const addressBookControllerState =
    state?.engine?.backgroundState?.AddressBookController;

  if (!isObject(addressBookControllerState)) {
    captureException(
      new Error(
        `Migration 28: Invalid AddressBookController state: '${JSON.stringify(
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
        `Migration 28: Invalid AddressBookController addressBook: '${JSON.stringify(
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
        const newAddressBook: {
          [key: string]: (typeof addressBook)[string];
        } = { [hexChainId]: {} };
        let newAddress: {
          [key: string]: (typeof addressBook)[string];
        } = {};
        Object.keys(addressBook[chainId]).forEach((address) => {
          newAddress = addressBook[chainId][address];
          newAddress.chainId = toHex(
            addressBookControllerState.addressBook[chainId][address].chainId,
          );

          newAddressBook[hexChainId][address] = newAddress;
        });
        addressBookControllerState.addressBook[hexChainId] =
          newAddressBook[hexChainId];
        delete addressBookControllerState.addressBook[chainId];
      }
    });
  }

  const swapsControllerState = state?.engine?.backgroundState?.SwapsController;

  if (!isObject(swapsControllerState)) {
    captureException(
      new Error(
        `Migration 28: Invalid SwapsController state: '${JSON.stringify(
          swapsControllerState,
        )}'`,
      ),
    );
    return state;
  }

  if (
    !hasProperty(swapsControllerState, 'chainCache') ||
    !isObject(swapsControllerState.chainCache)
  ) {
    captureException(
      new Error(
        `Migration 28: Invalid swapsControllerState chainCache: '${JSON.stringify(
          swapsControllerState.chainCache,
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
        swapsControllerState.chainCache[hexChainId] =
          swapsControllerState.chainCache[chainId];
        delete state.engine.backgroundState.SwapsController.chainCache[chainId];
      }
    });
  }

  const nftControllerState = state?.engine?.backgroundState?.NftController;

  if (!isObject(nftControllerState)) {
    captureException(
      new Error(
        `Migration 28: Invalid NftController state: '${JSON.stringify(
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
        `Migration 28: Invalid nftControllerState allNftsContracts: '${JSON.stringify(
          nftControllerState.allNftContracts,
        )}'`,
      ),
    );
    return state;
  }

  // NftController allNfts, allNftsContracts chain Id now is on hexadecimal format
  if (nftControllerState.allNftContracts) {
    const allNftContracts = nftControllerState.allNftContracts;
    Object.keys(nftControllerState.allNftContracts).forEach(
      (nftContractsAddress) => {
        Object.keys(allNftContracts[nftContractsAddress]).forEach((chainId) => {
          if (!isHexString(chainId)) {
            const hexChainId = toHex(chainId);
            nftControllerState.allNftContracts[nftContractsAddress][
              hexChainId
            ] =
              nftControllerState.allNftContracts[nftContractsAddress][chainId];

            delete nftControllerState.allNftContracts[nftContractsAddress][
              chainId
            ];
          }
        });
      },
    );
  }

  if (
    !hasProperty(nftControllerState, 'allNfts') ||
    !isObject(nftControllerState.allNfts)
  ) {
    captureException(
      new Error(
        `Migration 28: Invalid nftControllerState allNfts: '${JSON.stringify(
          nftControllerState.allNfts,
        )}'`,
      ),
    );
    return state;
  }

  if (nftControllerState.allNfts) {
    const allNfts = nftControllerState.allNfts;
    Object.keys(nftControllerState.allNfts).forEach((allNftsByAddress) => {
      Object.keys(allNfts[allNftsByAddress]).forEach((chainId) => {
        if (!isHexString(chainId)) {
          const hexChainId = toHex(chainId);
          nftControllerState.allNfts[allNftsByAddress][hexChainId] =
            nftControllerState.allNfts[allNftsByAddress][chainId];

          delete nftControllerState.allNfts[allNftsByAddress][chainId];
        }
      });
    });
  }

  const transactionControllerState =
    state?.engine?.backgroundState?.TransactionController;

  if (!isObject(transactionControllerState)) {
    captureException(
      new Error(
        `Migration 28: Invalid TransactionController state: '${JSON.stringify(
          transactionControllerState,
        )}'`,
      ),
    );
    return state;
  }

  // Transaction Controller transactions object chain id property to hexadecimal
  if (transactionControllerState.transactions) {
    transactionControllerState.transactions.forEach(
      (transaction: Transaction, index: number) => {
        if (transaction && !isHexString(transaction.chainId)) {
          transactionControllerState.transactions[index].chainId = toHex(
            transaction.chainId as string,
          );
        }
      },
    );
  }

  return state;
}
