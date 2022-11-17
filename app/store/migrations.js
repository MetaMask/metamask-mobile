import { NetworksChainId } from '@metamask/controller-utils';
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
        type: 'rinkeby',
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
    const isDecimalString = /^[1-9]\d*$/u.test(storedChainId);
    const hasInvalidChainId =
      !isDecimalString || !isSafeChainId(parseInt(storedChainId, 10));

    if (hasInvalidChainId) {
      // If the current network does not have a chainId, switch to testnet.
      state.engine.backgroundState.NetworkController.provider = {
        ticker: 'ETH',
        type: 'rinkeby',
        chainId: NetworksChainId.rinkeby,
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
};

export const version = 12;
