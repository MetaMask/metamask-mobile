import { toHex } from '@metamask/controller-utils';
import { Hex, hasProperty, isObject } from '@metamask/utils';
import { regex } from '../../../app/util/regex';

//@ts-expect-error - This error is expected, but ethereumjs-util exports this function
import { isHexString } from 'ethereumjs-util';
import { TransactionParams } from '@metamask/transaction-controller';
import { captureException } from '@sentry/react-native';
import {
  AddressBookEntry,
  AddressBookControllerState,
} from '@metamask/address-book-controller';
import {
  Nft,
  NftContract,
  NftControllerState,
  TokenListState,
  TokenRatesControllerState,
  TokensControllerState,
} from '@metamask/assets-controllers';

interface NetworkState {
  selectedNetworkClientId: string;
  networkConfigurations: Record<
    string,
    {
      id: string;
      rpcUrl: string;
      chainId: string;
      ticker: string;
      nickname: string;
      rpcPrefs: {
        blockExplorerUrl: string;
      };
    }
  >;
}

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
export default async function migrate(stateAsync: unknown) {
  const state = await stateAsync;
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
  // Addressing networkDetails property change
  const isEIP1559Compatible =
    !!networkControllerState.networkDetails.isEIP1559Compatible;

  networkControllerState.networkDetails = {
    EIPS: {
      1559: isEIP1559Compatible,
    },
  };
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
    ?.AddressBookController as AddressBookControllerState;

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
    ?.NftController as NftControllerState;

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
      (transaction: TransactionParams, index: number) => {
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

  const tokenListControllerState =
    state?.engine?.backgroundState?.TokenListController;
  const newTokenListControllerState = state?.engine?.backgroundState
    ?.TokenListController as TokenListState;

  if (!isObject(tokenListControllerState)) {
    captureException(
      new Error(
        `Migration 29: Invalid TokenListController state: '${JSON.stringify(
          tokenListControllerState,
        )}'`,
      ),
    );
    return state;
  }

  if (
    !hasProperty(tokenListControllerState, 'tokensChainsCache') ||
    !isObject(tokenListControllerState.tokensChainsCache)
  ) {
    captureException(
      new Error(
        `Migration 29: Invalid tokenListControllerState tokensChainsCache: '${JSON.stringify(
          tokenListControllerState.tokensChainsCache,
        )}'`,
      ),
    );
    return state;
  }

  if (Object.keys(tokenListControllerState.tokensChainsCache).length) {
    Object.keys(tokenListControllerState.tokensChainsCache).forEach(
      (chainId) => {
        if (!isHexString(chainId)) {
          const hexChainId = toHex(chainId);
          newTokenListControllerState.tokensChainsCache[hexChainId] =
            //@ts-expect-error Is verified on Line 508 that tokenChainsCache is a property
            tokenListControllerState.tokensChainsCache[chainId];

          if (isObject(tokenListControllerState.tokensChainsCache)) {
            delete tokenListControllerState.tokensChainsCache[chainId];
          }
        }
      },
    );
  }

  const tokenRatesControllerState =
    state?.engine?.backgroundState?.TokenRatesController;
  const newTokenRatesControllerState = state?.engine?.backgroundState
    ?.TokenRatesController as TokenRatesControllerState;

  if (!isObject(tokenRatesControllerState)) {
    captureException(
      new Error(
        `Migration 29: Invalid TokenRatesController state: '${JSON.stringify(
          tokenRatesControllerState,
        )}'`,
      ),
    );
    return state;
  }

  if (
    isObject(tokenRatesControllerState.contractExchangeRatesByChainId) &&
    Object.keys(tokenRatesControllerState.contractExchangeRatesByChainId).length
  ) {
    Object.keys(
      tokenRatesControllerState.contractExchangeRatesByChainId,
    ).forEach((chainId) => {
      if (!isHexString(chainId)) {
        const hexChainId = toHex(chainId);
        //@ts-expect-error At the time of that migrations assets controllers version had those properties, so those users will have that property on their phone storage, the migration was casted and that where it's wrong, we shouldn't cast migrations because the structure and property names change over time.
        newTokenRatesControllerState.contractExchangeRatesByChainId[
          hexChainId
        ] =
          //@ts-expect-error Is verified on Line 558 that contractExchangeRatesByChainId is a property
          tokenRatesControllerState.contractExchangeRatesByChainId[chainId];

        if (
          isObject(tokenRatesControllerState.contractExchangeRatesByChainId)
        ) {
          delete tokenRatesControllerState.contractExchangeRatesByChainId[
            chainId
          ];
        }
      }
    });
  }

  const tokensControllerState =
    state?.engine?.backgroundState?.TokensController;
  const newTokensControllerState = state?.engine?.backgroundState
    ?.TokensController as TokensControllerState;

  if (!isObject(tokensControllerState)) {
    captureException(
      new Error(
        `Migration 29: Invalid TokensController state: '${JSON.stringify(
          tokensControllerState,
        )}'`,
      ),
    );
    return state;
  }

  if (
    !hasProperty(tokensControllerState, 'allTokens') ||
    !isObject(tokensControllerState.allTokens)
  ) {
    captureException(
      new Error(
        `Migration 29: Invalid TokensController allTokens: '${JSON.stringify(
          tokensControllerState.allTokens,
        )}'`,
      ),
    );
    return state;
  }

  if (Object.keys(tokensControllerState.allTokens).length) {
    Object.keys(tokensControllerState.allTokens).forEach((chainId) => {
      if (!isHexString(chainId)) {
        const hexChainId = toHex(chainId);
        newTokensControllerState.allTokens[hexChainId] =
          //@ts-expect-error Is verified on Line 613 that allTokens is a property
          tokensControllerState.allTokens[chainId];

        if (isObject(tokensControllerState.allTokens)) {
          delete tokensControllerState.allTokens[chainId];
        }
      }
    });
  }

  if (
    !hasProperty(tokensControllerState, 'allIgnoredTokens') ||
    !isObject(tokensControllerState.allIgnoredTokens)
  ) {
    captureException(
      new Error(
        `Migration 29: Invalid TokensController allIgnoredTokens: '${JSON.stringify(
          tokensControllerState.allIgnoredTokens,
        )}'`,
      ),
    );
    return state;
  }

  if (Object.keys(tokensControllerState.allIgnoredTokens).length) {
    Object.keys(tokensControllerState.allIgnoredTokens).forEach((chainId) => {
      if (!isHexString(chainId)) {
        const hexChainId = toHex(chainId);
        newTokensControllerState.allIgnoredTokens[hexChainId] =
          //@ts-expect-error Is verified on Line 643 that allIgnoredTokens is a property
          tokensControllerState.allIgnoredTokens[chainId];

        if (isObject(tokensControllerState.allIgnoredTokens)) {
          delete tokensControllerState.allIgnoredTokens[chainId];
        }
      }
    });
  }

  if (
    !hasProperty(tokensControllerState, 'allDetectedTokens') ||
    !isObject(tokensControllerState.allDetectedTokens)
  ) {
    captureException(
      new Error(
        `Migration 29: Invalid TokensController allDetectedTokens: '${JSON.stringify(
          tokensControllerState.allDetectedTokens,
        )}'`,
      ),
    );
    return state;
  }

  if (Object.keys(tokensControllerState.allDetectedTokens).length) {
    Object.keys(tokensControllerState.allDetectedTokens).forEach((chainId) => {
      if (!isHexString(chainId)) {
        const hexChainId = toHex(chainId);
        newTokensControllerState.allDetectedTokens[hexChainId] =
          //@ts-expect-error Is verified on Line 671 that allIgnoredTokens is a property
          tokensControllerState.allDetectedTokens[chainId];

        if (isObject(tokensControllerState.allDetectedTokens)) {
          delete tokensControllerState.allDetectedTokens[chainId];
        }
      }
    });
  }

  return state;
}
