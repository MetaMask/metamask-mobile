import { Alert } from 'react-native';
import { getVersion } from 'react-native-device-info';
import { createAsyncMiddleware } from 'json-rpc-engine';
import { ethErrors } from 'eth-json-rpc-errors';
import RPCMethods from './index.js';
import { RPC } from '../../constants/network';
import { NetworksChainId, NetworkType } from '@metamask/controller-utils';
import Networks, {
  blockTagParamIndex,
  getAllNetworks,
} from '../../util/networks';
import { polyfillGasPrice } from './utils';
import ImportedEngine from '../Engine';
import { strings } from '../../../locales/i18n';
import { resemblesAddress, safeToChecksumAddress } from '../../util/address';
import { store } from '../../store';
import { removeBookmark } from '../../actions/bookmarks';
import setOnboardingWizardStep from '../../actions/wizard';
import { v1 as random } from 'uuid';
import { getPermittedAccounts } from '../Permissions';
import AppConstants from '../AppConstants.js';
const Engine = ImportedEngine as any;

let appVersion = '';

export enum ApprovalTypes {
  CONNECT_ACCOUNTS = 'CONNECT_ACCOUNTS',
  SIGN_MESSAGE = 'SIGN_MESSAGE',
  ADD_ETHEREUM_CHAIN = 'ADD_ETHEREUM_CHAIN',
  SWITCH_ETHEREUM_CHAIN = 'SWITCH_ETHEREUM_CHAIN',
  REQUEST_PERMISSIONS = 'wallet_requestPermissions',
}

interface RPCMethodsMiddleParameters {
  hostname: string;
  getProviderState: () => any;
  navigation: any;
  url: { current: string };
  title: { current: string };
  icon: { current: string | undefined };
  // Bookmarks
  isHomepage: () => boolean;
  // Show autocomplete
  fromHomepage: { current: boolean };
  toggleUrlModal: (shouldClearUrlInput: boolean) => void;
  // Wizard
  wizardScrollAdjusted: { current: boolean };
  // For the browser
  tabId: string;
  // For WalletConnect
  isWalletConnect: boolean;
  // For MM SDK
  isMMSDK: boolean;
  getApprovedHosts: any;
  setApprovedHosts: (approvedHosts: any) => void;
  approveHost: (fullHostname: string) => void;
  injectHomePageScripts: (bookmarks?: []) => void;
  analytics: { [key: string]: string | boolean };
}

// Also used by WalletConnect.js.
export const checkActiveAccountAndChainId = async ({
  address,
  chainId,
  checkSelectedAddress,
  hostname,
}: any) => {
  let isInvalidAccount = false;
  if (address) {
    const formattedAddress = safeToChecksumAddress(address);
    if (checkSelectedAddress) {
      const selectedAddress =
        Engine.context.PreferencesController.state.selectedAddress;
      if (formattedAddress !== safeToChecksumAddress(selectedAddress)) {
        isInvalidAccount = true;
      }
    } else {
      // For Browser use permissions
      const accounts = await getPermittedAccounts(hostname);
      const normalizedAccounts = accounts.map(safeToChecksumAddress);

      if (!normalizedAccounts.includes(formattedAddress)) {
        isInvalidAccount = true;
      }
    }
    if (isInvalidAccount) {
      throw ethErrors.rpc.invalidParams({
        message: `Invalid parameters: must provide an Ethereum address.`,
      });
    }
  }

  if (chainId) {
    const { provider } = Engine.context.NetworkController.state;
    const networkProvider = provider;
    const networkType = provider.type as NetworkType;
    const isInitialNetwork =
      networkType && getAllNetworks().includes(networkType);
    let activeChainId;

    if (isInitialNetwork) {
      activeChainId = NetworksChainId[networkType];
    } else if (networkType === RPC) {
      activeChainId = networkProvider.chainId;
    }

    if (activeChainId && !activeChainId.startsWith('0x')) {
      // Convert to hex
      activeChainId = `0x${parseInt(activeChainId, 10).toString(16)}`;
    }

    let chainIdRequest = String(chainId);
    if (chainIdRequest && !chainIdRequest.startsWith('0x')) {
      // Convert to hex
      chainIdRequest = `0x${parseInt(chainIdRequest, 10).toString(16)}`;
    }

    if (activeChainId !== chainIdRequest) {
      Alert.alert(
        `Active chainId is ${activeChainId} but received ${chainIdRequest}`,
      );
      throw ethErrors.rpc.invalidParams({
        message: `Invalid parameters: active chainId is different than the one provided.`,
      });
    }
  }
};

/**
 * Handle RPC methods called by dapps
 */
export const getRpcMethodMiddleware = ({
  hostname,
  getProviderState,
  navigation,
  // Website info
  url,
  title,
  icon,
  // Bookmarks
  isHomepage,
  // Show autocomplete
  fromHomepage,
  toggleUrlModal,
  // Wizard
  wizardScrollAdjusted,
  // For the browser
  tabId,
  // For WalletConnect
  isWalletConnect,
  // For MM SDK
  isMMSDK,
  getApprovedHosts,
  approveHost,
  injectHomePageScripts,
  // For analytics
  analytics,
}: RPCMethodsMiddleParameters) =>
  // all user facing RPC calls not implemented by the provider
  createAsyncMiddleware(async (req: any, res: any, next: any) => {
    // Utility function for getting accounts for either WalletConnect or MetaMask SDK.
    const getAccounts = (): string[] => {
      const selectedAddress =
        Engine.context.PreferencesController.state.selectedAddress?.toLowerCase();
      const isEnabled = isWalletConnect || getApprovedHosts()[hostname];
      return isEnabled && selectedAddress ? [selectedAddress] : [];
    };

    // Used by eth_accounts and eth_coinbase RPCs.
    const getEthAccounts = async () => {
      if (isMMSDK || isWalletConnect) {
        res.result = getAccounts();
      } else {
        res.result = await getPermittedAccounts(hostname);
      }
    };

    const checkTabActive = () => {
      if (!tabId) return true;
      const { browser } = store.getState();
      if (tabId !== browser.activeTab)
        throw ethErrors.provider.userRejectedRequest();
    };

    const getSource = () => {
      if (analytics?.isRemoteConn)
        return AppConstants.REQUEST_SOURCES.SDK_REMOTE_CONN;
      if (isWalletConnect) return AppConstants.REQUEST_SOURCES.WC;
      return AppConstants.REQUEST_SOURCES.IN_APP_BROWSER;
    };

    const requestUserApproval = async ({ type = '', requestData = {} }) => {
      checkTabActive();
      await Engine.context.ApprovalController.clear(
        ethErrors.provider.userRejectedRequest(),
      );

      const responseData = await Engine.context.ApprovalController.add({
        origin: hostname,
        type,
        requestData: {
          ...requestData,
          pageMeta: {
            url: url.current,
            title: title.current,
            icon: icon.current,
            analytics: {
              request_source: getSource(),
              request_platform: analytics?.platform,
            },
          },
        },
        id: random(),
      });
      return responseData;
    };

    const rpcMethods: any = {
      eth_getTransactionByHash: async () => {
        res.result = await polyfillGasPrice('getTransactionByHash', req.params);
      },
      eth_getTransactionByBlockHashAndIndex: async () => {
        res.result = await polyfillGasPrice(
          'getTransactionByBlockHashAndIndex',
          req.params,
        );
      },
      eth_getTransactionByBlockNumberAndIndex: async () => {
        res.result = await polyfillGasPrice(
          'getTransactionByBlockNumberAndIndex',
          req.params,
        );
      },
      eth_chainId: async () => {
        const { provider } = Engine.context.NetworkController.state;
        const networkProvider = provider;
        const networkType = provider.type as NetworkType;
        const isInitialNetwork =
          networkType && getAllNetworks().includes(networkType);
        let chainId;

        if (isInitialNetwork) {
          chainId = NetworksChainId[networkType];
        } else if (networkType === RPC) {
          chainId = networkProvider.chainId;
        }

        if (chainId && !chainId.startsWith('0x')) {
          // Convert to hex
          res.result = `0x${parseInt(chainId, 10).toString(16)}`;
        }
      },
      eth_hashrate: () => {
        res.result = '0x00';
      },
      eth_mining: () => {
        res.result = false;
      },
      net_listening: () => {
        res.result = true;
      },
      net_version: async () => {
        const {
          provider: { type: networkType },
        } = Engine.context.NetworkController.state;

        const isInitialNetwork =
          networkType && getAllNetworks().includes(networkType);
        if (isInitialNetwork) {
          res.result = (Networks as any)[networkType].networkId;
        } else {
          return next();
        }
      },
      eth_requestAccounts: async () => {
        const { params } = req;
        if (isWalletConnect) {
          let { selectedAddress } = Engine.context.PreferencesController.state;
          selectedAddress = selectedAddress?.toLowerCase();
          res.result = [selectedAddress];
        } else if (isMMSDK) {
          try {
            let { selectedAddress } =
              Engine.context.PreferencesController.state;
            selectedAddress = selectedAddress?.toLowerCase();
            // Prompts user approval UI in RootRPCMethodsUI.js.
            await requestUserApproval({
              type: ApprovalTypes.CONNECT_ACCOUNTS,
              requestData: { hostname },
            });
            // Stores approvals in SDKConnect.ts.
            approveHost?.(hostname);
            res.result = selectedAddress ? [selectedAddress] : [];
          } catch (e) {
            throw ethErrors.provider.userRejectedRequest(
              'User denied account authorization.',
            );
          }
        } else {
          // Check against permitted accounts.
          const permittedAccounts = await getPermittedAccounts(hostname);
          if (!params?.force && permittedAccounts.length) {
            res.result = permittedAccounts;
          } else {
            try {
              checkTabActive();
              await Engine.context.ApprovalController.clear();
              await Engine.context.PermissionController.requestPermissions(
                { origin: hostname },
                { eth_accounts: {} },
                { id: random() },
              );
              const acc = await getPermittedAccounts(hostname);
              res.result = acc;
            } catch (error) {
              if (error) {
                throw ethErrors.provider.userRejectedRequest(
                  'User denied account authorization.',
                );
              }
            }
          }
        }
      },
      eth_accounts: getEthAccounts,
      eth_coinbase: getEthAccounts,
      eth_sendTransaction: async () => {
        checkTabActive();
        await checkActiveAccountAndChainId({
          hostname,
          address: req.params[0].from,
          chainId: req.params[0].chainId,
          checkSelectedAddress: isMMSDK || isWalletConnect,
        });
        next();
      },
      eth_signTransaction: async () => {
        // This is implemented later in our middleware stack – specifically, in
        // eth-json-rpc-middleware – but our UI does not support it.
        throw ethErrors.rpc.methodNotSupported();
      },
      eth_sign: async () => {
        const { MessageManager } = Engine.context;
        const pageMeta = {
          meta: {
            url: url.current,
            title: title.current,
            icon: icon.current,
            analytics: {
              request_source: getSource(),
              request_platform: analytics?.platform,
            },
          },
        };

        checkTabActive();

        if (req.params[1].length === 66 || req.params[1].length === 67) {
          await checkActiveAccountAndChainId({
            hostname,
            address: req.params[0].from,
            checkSelectedAddress: isMMSDK || isWalletConnect,
          });
          const rawSig = await MessageManager.addUnapprovedMessageAsync({
            data: req.params[1],
            from: req.params[0],
            ...pageMeta,
            origin: hostname,
          });

          res.result = rawSig;
        } else {
          res.result = AppConstants.ETH_SIGN_ERROR;
          throw ethErrors.rpc.invalidParams(AppConstants.ETH_SIGN_ERROR);
        }
      },

      personal_sign: async () => {
        const { PersonalMessageManager } = Engine.context;
        const firstParam = req.params[0];
        const secondParam = req.params[1];
        const params = {
          data: firstParam,
          from: secondParam,
        };

        if (resemblesAddress(firstParam) && !resemblesAddress(secondParam)) {
          params.data = secondParam;
          params.from = firstParam;
        }

        const pageMeta = {
          meta: {
            url: url.current,
            title: title.current,
            icon: icon.current,
            analytics: {
              request_source: getSource(),
              request_platform: analytics?.platform,
            },
          },
        };

        checkTabActive();
        await checkActiveAccountAndChainId({
          hostname,
          address: params.from,
          checkSelectedAddress: isMMSDK || isWalletConnect,
        });

        const rawSig = await PersonalMessageManager.addUnapprovedMessageAsync({
          ...params,
          ...pageMeta,
          origin: hostname,
        });

        res.result = rawSig;
      },

      eth_signTypedData: async () => {
        const { TypedMessageManager } = Engine.context;
        const pageMeta = {
          meta: {
            url: url.current,
            title: title.current,
            icon: icon.current,
            analytics: {
              request_source: getSource(),
              request_platform: analytics?.platform,
            },
          },
        };

        checkTabActive();
        await checkActiveAccountAndChainId({
          hostname,
          address: req.params[1],
          checkSelectedAddress: isMMSDK || isWalletConnect,
        });

        const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
          {
            data: req.params[0],
            from: req.params[1],
            ...pageMeta,
            origin: hostname,
          },
          'V1',
        );

        res.result = rawSig;
      },

      eth_signTypedData_v3: async () => {
        const { TypedMessageManager } = Engine.context;

        const data = JSON.parse(req.params[1]);
        const chainId = data.domain.chainId;

        const pageMeta = {
          meta: {
            url: url.current,
            title: title.current,
            icon: icon.current,
            analytics: {
              request_source: getSource(),
              request_platform: analytics?.platform,
            },
          },
        };

        checkTabActive();
        await checkActiveAccountAndChainId({
          hostname,
          address: req.params[0],
          chainId,
          checkSelectedAddress: isMMSDK || isWalletConnect,
        });

        const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
          {
            data: req.params[1],
            from: req.params[0],
            ...pageMeta,
            origin: hostname,
          },
          'V3',
        );

        res.result = rawSig;
      },

      eth_signTypedData_v4: async () => {
        const { TypedMessageManager } = Engine.context;

        const data = JSON.parse(req.params[1]);
        const chainId = data.domain.chainId;

        const pageMeta = {
          meta: {
            url: url.current,
            title: title.current,
            icon: icon.current,
            analytics: {
              request_source: getSource(),
              request_platform: analytics?.platform,
            },
          },
        };

        checkTabActive();
        await checkActiveAccountAndChainId({
          hostname,
          address: req.params[0],
          chainId,
          checkSelectedAddress: isMMSDK || isWalletConnect,
        });

        const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
          {
            data: req.params[1],
            from: req.params[0],
            ...pageMeta,
            origin: hostname,
          },
          'V4',
        );

        res.result = rawSig;
      },

      web3_clientVersion: async () => {
        if (!appVersion) {
          appVersion = await getVersion();
        }
        res.result = `MetaMask/${appVersion}/Mobile`;
      },

      wallet_scanQRCode: () =>
        new Promise<void>((resolve, reject) => {
          checkTabActive();
          navigation.navigate('QRScanner', {
            onScanSuccess: (data: any) => {
              const regex = new RegExp(req.params[0]);
              if (regex && !regex.exec(data)) {
                reject({ message: 'NO_REGEX_MATCH', data });
              } else if (
                !regex &&
                !/^(0x){1}[0-9a-fA-F]{40}$/i.exec(data.target_address)
              ) {
                reject({
                  message: 'INVALID_ETHEREUM_ADDRESS',
                  data: data.target_address,
                });
              }
              let result = data;
              if (data.target_address) {
                result = data.target_address;
              } else if (data.scheme) {
                result = JSON.stringify(data);
              }
              res.result = result;
              resolve();
            },
            onScanError: (e: { toString: () => any }) => {
              throw ethErrors.rpc.internal(e.toString());
            },
          });
        }),

      wallet_watchAsset: async () => {
        const {
          params: {
            options: { address, decimals, image, symbol },
            type,
          },
        } = req;
        const { TokensController } = Engine.context;

        checkTabActive();
        try {
          const permittedAccounts = await getPermittedAccounts(hostname);
          // This should return the current active account on the Dapp.
          const interactingAddress = permittedAccounts?.[0];
          const watchAssetResult = await TokensController.watchAsset(
            { address, symbol, decimals, image },
            type,
            interactingAddress,
          );
          await watchAssetResult.result;
          res.result = true;
        } catch (error) {
          if (
            (error as Error).message === 'User rejected to watch the asset.'
          ) {
            throw ethErrors.provider.userRejectedRequest();
          }
          throw error;
        }
      },

      metamask_removeFavorite: async () => {
        checkTabActive();
        if (!isHomepage()) {
          throw ethErrors.provider.unauthorized('Forbidden.');
        }

        const { bookmarks } = store.getState();

        Alert.alert(
          strings('browser.remove_bookmark_title'),
          strings('browser.remove_bookmark_msg'),
          [
            {
              text: strings('browser.cancel'),
              onPress: () => {
                res.result = {
                  favorites: bookmarks,
                };
              },
              style: 'cancel',
            },
            {
              text: strings('browser.yes'),
              onPress: () => {
                const bookmark = { url: req.params[0] };

                store.dispatch(removeBookmark(bookmark));

                const { bookmarks: updatedBookmarks } = store.getState();

                if (isHomepage()) {
                  injectHomePageScripts(updatedBookmarks);
                }

                res.result = {
                  favorites: bookmarks,
                };
              },
            },
          ],
        );
      },

      metamask_showTutorial: async () => {
        checkTabActive();
        if (!isHomepage()) {
          throw ethErrors.provider.unauthorized('Forbidden.');
        }
        wizardScrollAdjusted.current = false;

        store.dispatch(setOnboardingWizardStep(1));

        navigation.navigate('WalletView');

        res.result = true;
      },

      metamask_showAutocomplete: async () => {
        checkTabActive();
        if (!isHomepage()) {
          throw ethErrors.provider.unauthorized('Forbidden.');
        }
        fromHomepage.current = true;
        toggleUrlModal(true);

        setTimeout(() => {
          fromHomepage.current = false;
        }, 1500);

        res.result = true;
      },

      metamask_injectHomepageScripts: async () => {
        if (isHomepage()) {
          injectHomePageScripts();
        }
        res.result = true;
      },

      /**
       * This method is used by the inpage provider to get its state on
       * initialization.
       */
      metamask_getProviderState: async () => {
        res.result = {
          ...getProviderState(),
          accounts: await getPermittedAccounts(hostname),
        };
      },

      /**
       * This method is sent by the window.web3 shim. It can be used to
       * record web3 shim usage metrics. These metrics are already collected
       * in the extension, and can optionally be added to mobile as well.
       *
       * For now, we need to respond to this method to not throw errors on
       * the page, and we implement it as a no-op.
       */
      metamask_logWeb3ShimUsage: () => (res.result = null),
      wallet_addEthereumChain: () => {
        checkTabActive();
        return RPCMethods.wallet_addEthereumChain({
          req,
          res,
          requestUserApproval,
          analytics: {
            request_source: getSource(),
            request_platform: analytics?.platform,
          },
        });
      },

      wallet_switchEthereumChain: () => {
        checkTabActive();
        return RPCMethods.wallet_switchEthereumChain({
          req,
          res,
          requestUserApproval,
          analytics: {
            request_source: getSource(),
            request_platform: analytics?.platform,
          },
        });
      },
    };

    const blockRefIndex = blockTagParamIndex(req);
    if (blockRefIndex) {
      const blockRef = req.params?.[blockRefIndex];
      // omitted blockRef implies "latest"
      if (blockRef === undefined) {
        req.params[blockRefIndex] = 'latest';
      }
    }

    if (!rpcMethods[req.method]) {
      return next();
    }
    await rpcMethods[req.method]();
  });

export default getRpcMethodMiddleware;
