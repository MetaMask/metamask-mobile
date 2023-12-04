import { v1 as random, v4 } from 'uuid';
import { isObject, hasProperty } from '@metamask/utils';
import { NetworksChainId } from '@metamask/controller-utils';
import { captureException } from '@sentry/react-native';
import { mapValues } from 'lodash';
import AppConstants from '../core/AppConstants';
import { getAllNetworks, isSafeChainId } from '../util/networks';
import { toLowerCaseEquals } from '../util/general';
import DefaultPreference from 'react-native-default-preference';
import {
  ONBOARDING_WIZARD,
  METRICS_OPT_IN,
  AGREED,
  DENIED,
  EXPLORED,
} from '../constants/storage';
import { GOERLI, IPFS_DEFAULT_GATEWAY_URL } from '../../app/constants/network';
import { regex } from '../../app/util/regex';

// Generated using this script: https://gist.github.com/Gudahtt/7a8a9e452bd2efdc5ceecd93610a25d3
import ambiguousNetworks from './migration-data/amibiguous-networks.json';
import { NetworkStatus } from '@metamask/network-controller';

export const migrations = {
  // Needed after https://github.com/MetaMask/controllers/pull/152
  0: (state) => {
    const addressBook =
      state.engine.backgroundState.AddressBookController.addressBook;
    const migratedAddressBook = {};
    Object.keys(addressBook).forEach((address) => {
      const chainId = addressBook[address].chainId.toString();
      migratedAddressBook[chainId]
        ? (migratedAddressBook[chainId] = {
            ...migratedAddressBook[chainId],
            [address]: addressBook[address],
          })
        : (migratedAddressBook[chainId] = { [address]: addressBook[address] });
    });
    state.engine.backgroundState.AddressBookController.addressBook =
      migratedAddressBook;
    return state;
  },
  // MakerDAO DAI => SAI
  1: (state) => {
    const tokens = state.engine.backgroundState.TokensController.tokens;
    const migratedTokens = [];
    tokens.forEach((token) => {
      if (
        token.symbol === 'DAI' &&
        toLowerCaseEquals(token.address, AppConstants.SAI_ADDRESS)
      ) {
        token.symbol = 'SAI';
      }
      migratedTokens.push(token);
    });
    state.engine.backgroundState.TokensController.tokens = migratedTokens;

    return state;
  },
  2: (state) => {
    const provider = state.engine.backgroundState.NetworkController.provider;

    // Check if the current network is one of the initial networks
    const isInitialNetwork =
      provider.type && getAllNetworks().includes(provider.type);

    // Check if the current network has a valid chainId
    const chainIdNumber = parseInt(provider.chainId, 10);
    const isCustomRpcWithInvalidChainId = !isSafeChainId(chainIdNumber);

    if (!isInitialNetwork && isCustomRpcWithInvalidChainId) {
      // If the current network does not have a chainId, switch to testnet.
      state.engine.backgroundState.NetworkController.provider = {
        ticker: 'ETH',
        type: GOERLI,
      };
    }
    return state;
  },
  3: (state) => {
    const provider = state.engine.backgroundState.NetworkController.provider;
    const chainId = NetworksChainId[provider.type];
    // if chainId === '' is a rpc
    if (chainId) {
      state.engine.backgroundState.NetworkController.provider = {
        ...provider,
        chainId,
      };
      return state;
    }

    // If provider is rpc, check if the current network has a valid chainId
    const storedChainId =
      typeof provider.chainId === 'string' ? provider.chainId : '';
    const isDecimalString = regex.decimalStringMigrations.test(storedChainId);
    const hasInvalidChainId =
      !isDecimalString || !isSafeChainId(parseInt(storedChainId, 10));

    if (hasInvalidChainId) {
      // If the current network does not have a chainId, switch to testnet.
      state.engine.backgroundState.NetworkController.provider = {
        ticker: 'ETH',
        type: GOERLI,
        chainId: NetworksChainId.goerli,
      };
    }
    return state;
  },
  4: (state) => {
    const { allTokens } = state.engine.backgroundState.TokensController;
    const { allCollectibleContracts, allCollectibles } =
      state.engine.backgroundState.CollectiblesController;
    const { frequentRpcList } =
      state.engine.backgroundState.PreferencesController;

    const newAllCollectibleContracts = {};
    const newAllCollectibles = {};
    const newAllTokens = {};

    Object.keys(allTokens).forEach((address) => {
      newAllTokens[address] = {};
      Object.keys(allTokens[address]).forEach((networkType) => {
        if (NetworksChainId[networkType]) {
          newAllTokens[address][NetworksChainId[networkType]] =
            allTokens[address][networkType];
        } else {
          frequentRpcList.forEach(({ chainId }) => {
            newAllTokens[address][chainId] = allTokens[address][networkType];
          });
        }
      });
    });

    Object.keys(allCollectibles).forEach((address) => {
      newAllCollectibles[address] = {};
      Object.keys(allCollectibles[address]).forEach((networkType) => {
        if (NetworksChainId[networkType]) {
          newAllCollectibles[address][NetworksChainId[networkType]] =
            allCollectibles[address][networkType];
        } else {
          frequentRpcList.forEach(({ chainId }) => {
            newAllCollectibles[address][chainId] =
              allCollectibles[address][networkType];
          });
        }
      });
    });

    Object.keys(allCollectibleContracts).forEach((address) => {
      newAllCollectibleContracts[address] = {};
      Object.keys(allCollectibleContracts[address]).forEach((networkType) => {
        if (NetworksChainId[networkType]) {
          newAllCollectibleContracts[address][NetworksChainId[networkType]] =
            allCollectibleContracts[address][networkType];
        } else {
          frequentRpcList.forEach(({ chainId }) => {
            newAllCollectibleContracts[address][chainId] =
              allCollectibleContracts[address][networkType];
          });
        }
      });
    });

    state.engine.backgroundState.TokensController = {
      ...state.engine.backgroundState.TokensController,
      allTokens: newAllTokens,
    };
    state.engine.backgroundState.CollectiblesController = {
      ...state.engine.backgroundState.CollectiblesController,
      allCollectibles: newAllCollectibles,
      allCollectibleContracts: newAllCollectibleContracts,
    };
    return state;
  },
  5: (state) => {
    state.engine.backgroundState.TokensController = {
      allTokens: state.engine.backgroundState.AssetsController.allTokens,
      ignoredTokens:
        state.engine.backgroundState.AssetsController.ignoredTokens,
    };

    state.engine.backgroundState.CollectiblesController = {
      allCollectibles:
        state.engine.backgroundState.AssetsController.allCollectibles,
      allCollectibleContracts:
        state.engine.backgroundState.AssetsController.allCollectibleContracts,
      ignoredCollectibles:
        state.engine.backgroundState.AssetsController.ignoredCollectibles,
    };

    delete state.engine.backgroundState.AssetsController;

    return state;
  },
  6: (state) => {
    state.analytics?.enabled
      ? DefaultPreference.set(METRICS_OPT_IN, AGREED)
      : DefaultPreference.set(METRICS_OPT_IN, DENIED);
    DefaultPreference.set(ONBOARDING_WIZARD, EXPLORED);

    return state;
  },
  7: (state) => {
    const allTokens = state.engine.backgroundState.TokensController.allTokens;
    const newAllTokens = {};
    if (allTokens) {
      Object.keys(allTokens).forEach((accountAddress) => {
        Object.keys(allTokens[accountAddress]).forEach((chainId) => {
          const tokensArray = allTokens[accountAddress][chainId];
          if (newAllTokens[chainId] === undefined) {
            newAllTokens[chainId] = { [accountAddress]: tokensArray };
          } else {
            newAllTokens[chainId] = {
              ...newAllTokens[chainId],
              [accountAddress]: tokensArray,
            };
          }
        });
      });
    }

    const ignoredTokens =
      state.engine.backgroundState.TokensController.ignoredTokens;
    const newAllIgnoredTokens = {};
    Object.keys(allTokens).forEach((accountAddress) => {
      Object.keys(allTokens[accountAddress]).forEach((chainId) => {
        if (newAllIgnoredTokens[chainId] === undefined) {
          newAllIgnoredTokens[chainId] = {
            [accountAddress]: ignoredTokens,
          };
        } else {
          newAllIgnoredTokens[chainId] = {
            ...newAllIgnoredTokens[chainId],
            [accountAddress]: ignoredTokens,
          };
        }
      });
    });

    state.engine.backgroundState.TokensController = {
      allTokens: newAllTokens,
      allIgnoredTokens: newAllIgnoredTokens,
    };

    return state;
  },
  8: (state) => {
    // This migration ensures that ignored tokens are in the correct form
    const allIgnoredTokens =
      state.engine.backgroundState.TokensController.allIgnoredTokens || {};
    const ignoredTokens =
      state.engine.backgroundState.TokensController.ignoredTokens || [];

    const reduceTokens = (tokens) =>
      tokens.reduce((final, token) => {
        const tokenAddress =
          (typeof token === 'string' && token) || token?.address || '';
        tokenAddress && final.push(tokenAddress);
        return final;
      }, []);

    const newIgnoredTokens = reduceTokens(ignoredTokens);

    const newAllIgnoredTokens = {};
    Object.entries(allIgnoredTokens).forEach(
      ([chainId, tokensByAccountAddress]) => {
        Object.entries(tokensByAccountAddress).forEach(
          ([accountAddress, tokens]) => {
            const newTokens = reduceTokens(tokens);
            if (newAllIgnoredTokens[chainId] === undefined) {
              newAllIgnoredTokens[chainId] = { [accountAddress]: newTokens };
            } else {
              newAllIgnoredTokens[chainId] = {
                ...newAllIgnoredTokens[chainId],
                [accountAddress]: newTokens,
              };
            }
          },
        );
      },
    );

    state.engine.backgroundState.TokensController = {
      ...state.engine.backgroundState.TokensController,
      allIgnoredTokens: newAllIgnoredTokens,
      ignoredTokens: newIgnoredTokens,
    };

    return state;
  },
  9: (state) => {
    state.engine.backgroundState.PreferencesController = {
      ...state.engine.backgroundState.PreferencesController,
      useStaticTokenList: true,
    };
    return state;
  },
  10: (state) => {
    state.engine.backgroundState.PreferencesController = {
      ...state.engine.backgroundState.PreferencesController,
      useCollectibleDetection: false,
      openSeaEnabled: false,
    };
    return state;
  },
  11: (state) => {
    state.engine.backgroundState.PreferencesController = {
      ...state.engine.backgroundState.PreferencesController,
      useTokenDetection: true,
    };
    return state;
  },
  12: (state) => {
    const {
      allCollectibles,
      allCollectibleContracts,
      ignoredCollectibles,
      ...unexpectedCollectiblesControllerState
    } = state.engine.backgroundState.CollectiblesController;
    state.engine.backgroundState.NftController = {
      ...unexpectedCollectiblesControllerState,
      allNfts: allCollectibles,
      allNftContracts: allCollectibleContracts,
      ignoredNfts: ignoredCollectibles,
    };
    delete state.engine.backgroundState.CollectiblesController;

    state.engine.backgroundState.NftDetectionController =
      state.engine.backgroundState.CollectibleDetectionController;
    delete state.engine.backgroundState.CollectibleDetectionController;

    state.engine.backgroundState.PreferencesController.useNftDetection =
      state.engine.backgroundState.PreferencesController.useCollectibleDetection;
    delete state.engine.backgroundState.PreferencesController
      .useCollectibleDetection;

    return state;
  },
  13: (state) => {
    // If for some reason we already have PermissionController state, bail out.
    const hasPermissionControllerState = Boolean(
      state.engine.backgroundState.PermissionController?.subjects,
    );
    if (hasPermissionControllerState) return state;

    const { approvedHosts } = state.privacy;
    const { selectedAddress } =
      state.engine.backgroundState.PreferencesController;

    const hosts = Object.keys(approvedHosts);
    // If no dapps connected, bail out.
    if (hosts.length < 1) return state;

    const { subjects } = hosts.reduce(
      (accumulator, host, index) => ({
        subjects: {
          ...accumulator.subjects,
          [host]: {
            origin: host,
            permissions: {
              eth_accounts: {
                id: random(),
                parentCapability: 'eth_accounts',
                invoker: host,
                caveats: [
                  {
                    type: 'restrictReturnedAccounts',
                    value: [
                      {
                        address: selectedAddress,
                        lastUsed: Date.now() - index,
                      },
                    ],
                  },
                ],
                date: Date.now(),
              },
            },
          },
        },
      }),
      {},
    );

    const newState = { ...state };

    newState.engine.backgroundState.PermissionController = {
      subjects,
    };

    return newState;
  },
  14: (state) => {
    if (state.engine.backgroundState.NetworkController.provider) {
      state.engine.backgroundState.NetworkController.providerConfig =
        state.engine.backgroundState.NetworkController.provider;
      delete state.engine.backgroundState.NetworkController.provider;
    }

    return state;
  },
  15: (state) => {
    const chainId =
      state.engine.backgroundState.NetworkController.providerConfig.chainId;
    // Deprecate rinkeby, ropsten and Kovan, any user that is on those we fallback to goerli
    if (chainId === '4' || chainId === '3' || chainId === '42') {
      state.engine.backgroundState.NetworkController.providerConfig = {
        chainId: NetworksChainId.goerli,
        ticker: 'GoerliETH',
        type: GOERLI,
      };
    }
    return state;
  },
  16: (state) => {
    if (state.engine.backgroundState.NetworkController.properties) {
      state.engine.backgroundState.NetworkController.networkDetails =
        state.engine.backgroundState.NetworkController.properties;
      delete state.engine.backgroundState.NetworkController.properties;
    }
    return state;
  },
  17: (state) => {
    if (
      state.networkOnboarded &&
      state.networkOnboarded.networkOnboardedState
    ) {
      state.networkOnboarded.networkOnboardedState = {};
    }
    return state;
  },
  18: (state) => {
    if (state.engine.backgroundState.TokensController.suggestedAssets) {
      delete state.engine.backgroundState.TokensController.suggestedAssets;
    }
    return state;
  },
  19: (state) => {
    if (state.recents) {
      delete state.recents;
    }
    return state;
  },
  /**
   * Migrate network configuration from Preferences controller to Network controller.
   * See this changelog for details: https://github.com/MetaMask/core/releases/tag/v44.0.0
   *
   * Note: the type is wrong here because it conflicts with `redux-persist`
   * types, due to a bug in that package.
   * See: https://github.com/rt2zz/redux-persist/issues/1065
   * TODO: Use `unknown` as the state type, and silence or work around the
   * redux-persist bug somehow.
   *
   * @param {any} state - Redux state.
   * @returns Migrated Redux state.
   */
  20: (state) => {
    const preferencesControllerState =
      state.engine.backgroundState.PreferencesController;
    const networkControllerState =
      state.engine.backgroundState.NetworkController;
    const frequentRpcList = preferencesControllerState?.frequentRpcList;
    if (networkControllerState && frequentRpcList?.length) {
      const networkConfigurations = frequentRpcList.reduce(
        (networkConfigs, networkConfig) => {
          const networkConfigurationId = v4();
          return {
            ...networkConfigs,
            [networkConfigurationId]: {
              ...networkConfig,
              // Explicitly convert number chain IDs to decimal strings
              // Likely we've only ever used string chain IDs here, but this
              // is a precaution because the type describes it as a number.
              chainId: String(networkConfig.chainId),
            },
          };
        },
        {},
      );
      delete preferencesControllerState.frequentRpcList;

      networkControllerState.networkConfigurations = networkConfigurations;
    }
    return state;
  },
  21: (state) => {
    const outdatedIpfsGateways = [
      'https://hardbin.com/ipfs/',
      'https://ipfs.greyh.at/ipfs/',
      'https://ipfs.fooock.com/ipfs/',
      'https://cdn.cwinfo.net/ipfs/',
    ];

    const isUsingOutdatedGateway = outdatedIpfsGateways.includes(
      state.engine.backgroundState?.PreferencesController?.ipfsGateway,
    );

    if (isUsingOutdatedGateway) {
      state.engine.backgroundState.PreferencesController.ipfsGateway =
        IPFS_DEFAULT_GATEWAY_URL;
    }
    return state;
  },

  22: (state) => {
    if (state?.engine?.backgroundState?.PreferencesController?.openSeaEnabled) {
      state.engine.backgroundState.PreferencesController.displayNftMedia =
        state.engine.backgroundState.PreferencesController.openSeaEnabled ??
        true;

      delete state.engine.backgroundState.PreferencesController.openSeaEnabled;
    }
    if (state?.user?.nftDetectionDismissed) {
      delete state.user.nftDetectionDismissed;
    }

    return state;
  },

  /**
   * Migrate address book state to be keyed by chain ID rather than network ID.
   *
   * When choosing which chain ID to migrate each address book entry to, we
   * consider only networks that the user has configured locally. Any entries
   * for chains not configured locally are discarded.
   *
   * If there are multiple chain ID candidates for a given network ID (even
   * after filtering to include just locally configured networks), address
   * entries are duplicated on all potentially matching chains. These cases are
   * also stored in the `user.ambiguousAddressEntries` state so that we can
   * warn the user in the UI about these addresses.
   *
   * Note: the type is wrong here because it conflicts with `redux-persist`
   * types, due to a bug in that package.
   * See: https://github.com/rt2zz/redux-persist/issues/1065
   * TODO: Use `unknown` as the state type, and silence or work around the
   * redux-persist bug somehow.
   *
   * @param {any} state - Redux state.
   * @returns Migrated Redux state.
   */
  23: (state) => {
    const networkControllerState =
      state.engine.backgroundState.NetworkController;
    const addressBookControllerState =
      state.engine.backgroundState.AddressBookController;

    if (!isObject(networkControllerState)) {
      captureException(
        new Error(
          `Migration 23: Invalid network controller state: '${typeof networkControllerState}'`,
        ),
      );
      return state;
    } else if (
      !hasProperty(networkControllerState, 'networkConfigurations') ||
      !isObject(networkControllerState.networkConfigurations)
    ) {
      captureException(
        new Error(
          `Migration 23: Invalid network configuration state: '${typeof networkControllerState.networkConfigurations}'`,
        ),
      );
      return state;
    } else if (
      Object.values(networkControllerState.networkConfigurations).some(
        (networkConfiguration) => !hasProperty(networkConfiguration, 'chainId'),
      )
    ) {
      const [invalidConfigurationId, invalidConfiguration] = Object.entries(
        networkControllerState.networkConfigurations,
      ).find(
        ([_networkConfigId, networkConfiguration]) =>
          !hasProperty(networkConfiguration, 'chainId'),
      );
      captureException(
        new Error(
          `Migration 23: Network configuration missing chain ID, id '${invalidConfigurationId}', keys '${Object.keys(
            invalidConfiguration,
          )}'`,
        ),
      );
      return state;
    } else if (!isObject(addressBookControllerState)) {
      captureException(
        new Error(
          `Migration 23: Invalid address book controller state: '${typeof addressBookControllerState}'`,
        ),
      );
      return state;
    } else if (
      !hasProperty(addressBookControllerState, 'addressBook') ||
      !isObject(addressBookControllerState.addressBook)
    ) {
      captureException(
        new Error(
          `Migration 23: Invalid address book state: '${typeof addressBookControllerState.addressBook}'`,
        ),
      );
      return state;
    } else if (
      Object.values(addressBookControllerState.addressBook).some(
        (addressEntries) => !isObject(addressEntries),
      )
    ) {
      const [networkId, invalidEntries] = Object.entries(
        addressBookControllerState.addressBook,
      ).find(([_networkId, addressEntries]) => !isObject(addressEntries));
      captureException(
        new Error(
          `Migration 23: Address book configuration invalid, network id '${networkId}', type '${typeof invalidEntries}'`,
        ),
      );
      return state;
    } else if (
      Object.values(addressBookControllerState.addressBook).some(
        (addressEntries) =>
          Object.values(addressEntries).some(
            (addressEntry) => !hasProperty(addressEntry, 'chainId'),
          ),
      )
    ) {
      const [networkId, invalidEntries] = Object.entries(
        addressBookControllerState.addressBook,
      ).find(([_networkId, addressEntries]) =>
        Object.values(addressEntries).some(
          (addressEntry) => !hasProperty(addressEntry, 'chainId'),
        ),
      );
      const invalidEntry = Object.values(invalidEntries).find(
        (addressEntry) => !hasProperty(addressEntry, 'chainId'),
      );
      captureException(
        new Error(
          `Migration 23: Address book configuration entry missing chain ID, network id '${networkId}', keys '${Object.keys(
            invalidEntry,
          )}'`,
        ),
      );
      return state;
    } else if (!isObject(state.user)) {
      captureException(
        new Error(`Migration 23: Invalid user state: '${typeof state.user}'`),
      );
      return state;
    }

    const localChainIds = Object.values(
      networkControllerState.networkConfigurations,
    ).reduce((customChainIds, networkConfiguration) => {
      customChainIds.add(networkConfiguration.chainId);
      return customChainIds;
    }, new Set());
    const builtInNetworkChainIdsAsOfMigration22 = [
      '1',
      '5',
      '11155111',
      '59140',
      '59144',
    ];
    for (const builtInChainId of builtInNetworkChainIdsAsOfMigration22) {
      localChainIds.add(builtInChainId);
    }

    const migratedAddressBook = {};
    const ambiguousAddressEntries = {};
    for (const [networkId, addressEntries] of Object.entries(
      addressBookControllerState.addressBook,
    )) {
      if (ambiguousNetworks[networkId]) {
        const chainIdCandidates = ambiguousNetworks[networkId].chainIds;
        const recognizedChainIdCandidates = chainIdCandidates.filter(
          (chainId) => localChainIds.has(chainId),
        );

        for (const chainId of recognizedChainIdCandidates) {
          if (recognizedChainIdCandidates.length > 1) {
            ambiguousAddressEntries[chainId] = Object.keys(addressEntries);
          }
          migratedAddressBook[chainId] = mapValues(addressEntries, (entry) => ({
            ...entry,
            chainId,
          }));
        }
      } else {
        migratedAddressBook[networkId] = addressEntries;
      }
    }

    addressBookControllerState.addressBook = migratedAddressBook;

    // Store ambiguous entries so that we can warn about them in the UI
    if (Object.keys(ambiguousAddressEntries).length > 1) {
      state.user.ambiguousAddressEntries = ambiguousAddressEntries;
    }

    return state;
  },
  /**
   * Migrate NetworkController state, splitting old `network` property into
   * `networkId` and `networkStatus`. This is required to update to v8 of the
   * NetworkController package.
   *
   * @see {@link https://github.com/MetaMask/core/blob/main/packages/network-controller/CHANGELOG.md#800}
   *
   * Note: the type is wrong here because it conflicts with `redux-persist`
   * types, due to a bug in that package.
   * See: https://github.com/rt2zz/redux-persist/issues/1065
   * TODO: Use `unknown` as the state type, and silence or work around the
   * redux-persist bug somehow.
   *
   * @param {any} state - Redux state.
   * @returns Migrated Redux state.
   */
  24: (state) => {
    const networkControllerState =
      state.engine.backgroundState.NetworkController;

    if (!isObject(networkControllerState)) {
      captureException(
        new Error(
          `Migration 24: Invalid network controller state: '${typeof networkControllerState}'`,
        ),
      );
      return state;
    } else if (typeof networkControllerState.network !== 'string') {
      captureException(
        new Error(
          `Migration 24: Invalid network state: '${typeof networkControllerState.network}'`,
        ),
      );
      return state;
    }

    if (networkControllerState.network === 'loading') {
      networkControllerState.networkId = null;
      networkControllerState.networkStatus = NetworkStatus.Unknown;
    } else {
      networkControllerState.networkId = networkControllerState.network;
      networkControllerState.networkStatus = NetworkStatus.Available;
    }
    delete networkControllerState.network;

    return state;
  },
  25: (state) => {
    const transactions =
      state.engine.backgroundState?.TransactionController?.transactions;

    // Check if transactions is an array
    if (Array.isArray(transactions)) {
      for (const transaction of transactions) {
        // Rename rawTransaction to rawTx if it exists
        if (transaction.rawTransaction) {
          transaction.rawTx = transaction.rawTransaction;
          delete transaction.rawTransaction;
        }
      }
    }

    return state;
  },
  26: (state) => {
    const transactions =
      state.engine.backgroundState?.TransactionController?.transactions;

    // Check if transactions is an array
    if (Array.isArray(transactions)) {
      for (const transaction of transactions) {
        // Rename transactionHash to hash if it exists
        if (transaction.transactionHash) {
          transaction.hash = transaction.transactionHash;
          delete transaction.transactionHash;
        }
      }
    }

    return state;
  },
  27: (state) => {
    const transactions =
      state.engine.backgroundState?.TransactionController?.transactions;

    // Check if transactions is an array
    if (Array.isArray(transactions)) {
      for (const transaction of transactions) {
        // Rename transaction to txParams if it exists
        if (transaction.transaction) {
          transaction.txParams = transaction.transaction;
          delete transaction.transaction;
        }
      }
    }

    return state;
  },
  // If you are implementing a migration it will break the migration tests,
  // please write a unit for your specific migration version
};

export const version = Object.keys(migrations).length - 1;
