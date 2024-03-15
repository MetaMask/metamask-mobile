import { Alert } from 'react-native';
import { getVersion } from 'react-native-device-info';
import {
  createAsyncMiddleware,
  JsonRpcEngineCallbackError,
} from 'json-rpc-engine';
import { ethErrors } from 'eth-json-rpc-errors';
import {
  EndFlowOptions,
  StartFlowOptions,
  SetFlowLoadingTextOptions,
} from '@metamask/approval-controller';
import { recoverPersonalSignature } from '@metamask/eth-sig-util';
import RPCMethods from './index.js';
import { RPC } from '../../constants/network';
import { ChainId, NetworkType, toHex } from '@metamask/controller-utils';
import { permissionRpcMethods } from '@metamask/permission-controller';
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
import AppConstants from '../AppConstants';
import PPOMUtil from '../../lib/ppom/ppom-util';
import {
  selectProviderConfig,
  selectProviderType,
} from '../../selectors/networkController';
import { setEventStageError, setEventStage } from '../../actions/rpcEvents';
import { isWhitelistedRPC, RPCStageTypes } from '../../reducers/rpcEvents';
import { regex } from '../../../app/util/regex';
import Logger from '../../../app/util/Logger';
import DevLogger from '../SDKConnect/utils/DevLogger';
import { addTransaction } from '../../util/transaction-controller';

const Engine = ImportedEngine as any;

let appVersion = '';

export enum ApprovalTypes {
  CONNECT_ACCOUNTS = 'CONNECT_ACCOUNTS',
  SIGN_MESSAGE = 'SIGN_MESSAGE',
  ADD_ETHEREUM_CHAIN = 'ADD_ETHEREUM_CHAIN',
  SWITCH_ETHEREUM_CHAIN = 'SWITCH_ETHEREUM_CHAIN',
  REQUEST_PERMISSIONS = 'wallet_requestPermissions',
  WALLET_CONNECT = 'WALLET_CONNECT',
  ETH_SIGN = 'eth_sign',
  PERSONAL_SIGN = 'personal_sign',
  ETH_SIGN_TYPED_DATA = 'eth_signTypedData',
  WATCH_ASSET = 'wallet_watchAsset',
  TRANSACTION = 'transaction',
  RESULT_ERROR = 'result_error',
  RESULT_SUCCESS = 'result_success',
  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
  INSTALL_SNAP = 'wallet_installSnap',
  UPDATE_SNAP = 'wallet_updateSnap',
  ///: END:ONLY_INCLUDE_IF
}

export interface RPCMethodsMiddleParameters {
  hostname: string;
  channelId?: string; // Used for remote connections
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
  tabId: number | '' | false;
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
  channelId,
  hostname,
}: {
  address?: string;
  chainId?: number;
  channelId?: string;
  hostname: string;
}) => {
  let isInvalidAccount = false;
  if (address) {
    const formattedAddress = safeToChecksumAddress(address);
    DevLogger.log('checkActiveAccountAndChainId', {
      address,
      chainId,
      channelId,
      hostname,
      formattedAddress,
    });
    const validHostname = hostname?.replace(
      AppConstants.MM_SDK.SDK_REMOTE_ORIGIN,
      '',
    );

    const accounts =
      (await getPermittedAccounts(channelId ?? validHostname)) ?? [];
    const normalizedAccounts = accounts.map(safeToChecksumAddress);

    if (!normalizedAccounts.includes(formattedAddress)) {
      isInvalidAccount = true;
      if (accounts.length > 0) {
        // Permissions issue --- requesting incorrect address
        throw ethErrors.rpc.invalidParams({
          message: `Invalid parameters: must provide a permitted Ethereum address.`,
        });
      }
    }

    if (isInvalidAccount) {
      throw ethErrors.rpc.invalidParams({
        message: `Invalid parameters: must provide an Ethereum address.`,
      });
    }
  }

  if (chainId) {
    const providerConfig = selectProviderConfig(store.getState());
    const networkType = providerConfig.type as NetworkType;
    const isInitialNetwork =
      networkType && getAllNetworks().includes(networkType);
    let activeChainId;

    if (isInitialNetwork) {
      activeChainId = ChainId[networkType as keyof typeof ChainId];
    } else if (networkType === RPC) {
      activeChainId = providerConfig.chainId;
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

const generateRawSignature = async ({
  version,
  req,
  hostname,
  url,
  title,
  icon,
  analytics,
  chainId,
  channelId,
  getSource,
  checkTabActive,
}: any) => {
  const { SignatureController } = Engine.context;

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
    channelId,
    address: req.params[0],
    chainId,
  });

  const rawSig = await SignatureController.newUnsignedTypedMessage(
    {
      data: req.params[1],
      from: req.params[0],
      ...pageMeta,
      origin: hostname,
      securityAlertResponse: req.securityAlertResponse,
    },
    req,
    version,
    {
      parseJsonData: false,
    },
  );

  return rawSig;
};

/**
 * Handle RPC methods called by dapps
 */
export const getRpcMethodMiddleware = ({
  hostname,
  channelId,
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
  injectHomePageScripts,
  // For analytics
  analytics,
}: RPCMethodsMiddleParameters) =>
  // all user facing RPC calls not implemented by the provider
  createAsyncMiddleware(async (req: any, res: any, next: any) => {
    // Used by eth_accounts and eth_coinbase RPCs.
    const getEthAccounts = async () => {
      res.result = await getPermittedAccounts(hostname);
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

    const startApprovalFlow = (opts: StartFlowOptions) => {
      checkTabActive();
      Engine.context.ApprovalController.clear(
        ethErrors.provider.userRejectedRequest(),
      );

      return Engine.context.ApprovalController.startFlow(opts);
    };

    const endApprovalFlow = (opts: EndFlowOptions) => {
      Engine.context.ApprovalController.endFlow(opts);
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const setApprovalFlowLoadingText = (opts: SetFlowLoadingTextOptions) => {
      Engine.context.ApprovalController.setFlowLoadingText(opts);
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

    const [requestPermissionsHandler, getPermissionsHandler] =
      permissionRpcMethods.handlers;

    const rpcMethods: any = {
      wallet_getPermissions: async () =>
        new Promise<any>((resolve) => {
          const handle = getPermissionsHandler.implementation(
            req,
            res,
            next,
            () => {
              resolve(undefined);
            },
            {
              getPermissionsForOrigin:
                Engine.context.PermissionController.getPermissions.bind(
                  Engine.context.PermissionController,
                  hostname,
                ),
            },
          );
          handle?.catch((error) => {
            Logger.error('Failed to get permissions', error);
          });
        }),
      wallet_requestPermissions: async () =>
        new Promise<any>((resolve, reject) => {
          let requestId: string | undefined;
          if (isMMSDK) {
            // Extract id from hostname
            requestId = hostname.replace(
              AppConstants.MM_SDK.SDK_REMOTE_ORIGIN,
              '',
            );
          }
          requestPermissionsHandler
            .implementation(
              req,
              res,
              next,
              (err: JsonRpcEngineCallbackError | undefined) => {
                if (err) {
                  return reject(err);
                }
                resolve(undefined);
              },
              {
                requestPermissionsForOrigin:
                  Engine.context.PermissionController.requestPermissions.bind(
                    Engine.context.PermissionController,
                    { origin: requestId ?? hostname },
                    req.params[0],
                    { id: requestId },
                  ),
              },
            )
            ?.then(resolve)
            .catch(reject);
        }),
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
        const providerConfig = selectProviderConfig(store.getState());
        const networkType = providerConfig.type as NetworkType;
        const isInitialNetwork =
          networkType && getAllNetworks().includes(networkType);
        let chainId;

        if (isInitialNetwork) {
          chainId = ChainId[networkType as keyof typeof ChainId];
        } else if (networkType === RPC) {
          chainId = providerConfig.chainId;
        }

        if (chainId && !chainId.startsWith('0x')) {
          chainId = toHex(chainId);
        }

        res.result = chainId;
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
        const networkType = selectProviderType(store.getState());

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
        const validHostname = hostname.replace(
          AppConstants.MM_SDK.SDK_REMOTE_ORIGIN,
          '',
        );
        const permittedAccounts = await getPermittedAccounts(
          channelId ?? validHostname,
        );

        if (!params?.force && permittedAccounts.length) {
          res.result = permittedAccounts;
        } else {
          try {
            checkTabActive();
            await Engine.context.PermissionController.requestPermissions(
              { origin: channelId ?? validHostname },
              { eth_accounts: {} },
              { id: channelId ?? validHostname },
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
      },
      eth_accounts: getEthAccounts,
      eth_coinbase: getEthAccounts,
      parity_defaultAccount: getEthAccounts,
      eth_sendTransaction: async () => {
        checkTabActive();

        if (isMMSDK) {
          // Append origin to the request so it can be parsed in UI TransactionHeader
          DevLogger.log(
            `SDK Transaction detected --- custom hostname -- ${hostname} --> ${
              AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + url.current
            }`,
          );
          hostname = AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + url.current;
        }

        return RPCMethods.eth_sendTransaction({
          hostname,
          req,
          res,
          sendTransaction: addTransaction,
          validateAccountAndChainId: async ({
            from,
            chainId,
          }: {
            from?: string;
            chainId?: number;
          }) => {
            await checkActiveAccountAndChainId({
              hostname,
              address: from,
              channelId,
              chainId,
            });
          },
        });
      },
      eth_signTransaction: async () => {
        // This is implemented later in our middleware stack – specifically, in
        // eth-json-rpc-middleware – but our UI does not support it.
        throw ethErrors.rpc.methodNotSupported();
      },
      eth_sign: async () => {
        const { SignatureController, PreferencesController } = Engine.context;
        const { disabledRpcMethodPreferences } = PreferencesController.state;
        const { eth_sign } = disabledRpcMethodPreferences;

        if (!eth_sign) {
          throw ethErrors.rpc.methodNotFound(
            'eth_sign has been disabled. You must enable it in the advanced settings',
          );
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

        if (req.params[1].length === 66 || req.params[1].length === 67) {
          await checkActiveAccountAndChainId({
            hostname,
            channelId,
            address: req.params[0].from,
          });
          PPOMUtil.validateRequest(req);
          const rawSig = await SignatureController.newUnsignedMessage({
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
        const { SignatureController } = Engine.context;
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
          channelId,
          address: params.from,
        });

        PPOMUtil.validateRequest(req);

        const rawSig = await SignatureController.newUnsignedPersonalMessage({
          ...params,
          ...pageMeta,
          origin: hostname,
        });

        res.result = rawSig;
      },

      personal_ecRecover: () => {
        const data = req.params[0];
        const signature = req.params[1];
        const address = recoverPersonalSignature({ data, signature });

        res.result = address;
      },

      parity_checkRequest: () => {
        // This method is retained for legacy reasons
        // It doesn't serve it's intended purpose anymore of checking parity requests,
        // because our API doesn't support parity requests.
        res.result = null;
      },

      eth_signTypedData: async () => {
        const { SignatureController } = Engine.context;
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
          channelId,
          address: req.params[1],
        });

        PPOMUtil.validateRequest(req);

        const rawSig = await SignatureController.newUnsignedTypedMessage(
          {
            data: req.params[0],
            from: req.params[1],
            ...pageMeta,
            origin: hostname,
          },
          req,
          'V1',
        );

        res.result = rawSig;
      },

      eth_signTypedData_v3: async () => {
        const data =
          typeof req.params[1] === 'string'
            ? JSON.parse(req.params[1])
            : req.params[1];
        const chainId = data.domain.chainId;
        PPOMUtil.validateRequest(req);
        res.result = await generateRawSignature({
          version: 'V3',
          req,
          hostname,
          url,
          title,
          icon,
          analytics,
          isMMSDK,
          channelId,
          isWalletConnect,
          chainId,
          getSource,
          checkTabActive,
        });
      },

      eth_signTypedData_v4: async () => {
        const data = JSON.parse(req.params[1]);
        const chainId = data.domain.chainId;
        PPOMUtil.validateRequest(req);
        res.result = await generateRawSignature({
          version: 'V4',
          req,
          hostname,
          url,
          title,
          icon,
          analytics,
          isMMSDK,
          channelId,
          isWalletConnect,
          chainId,
          getSource,
          checkTabActive,
        });
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
              if (!regex.exec(req.params[0], data)) {
                reject({ message: 'NO_REGEX_MATCH', data });
              } else if (regex.walletAddress.exec(data.target_address)) {
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

      wallet_watchAsset: async () =>
        RPCMethods.wallet_watchAsset({ req, res, hostname, checkTabActive }),

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
          startApprovalFlow,
          endApprovalFlow,
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

    const isWhiteListedMethod = isWhitelistedRPC(req.method);

    try {
      isWhiteListedMethod &&
        store.dispatch(setEventStage(req.method, RPCStageTypes.REQUEST_SEND));
      await rpcMethods[req.method]();

      isWhiteListedMethod &&
        store.dispatch(setEventStage(req.method, RPCStageTypes.COMPLETE));
    } catch (e) {
      isWhiteListedMethod && store.dispatch(setEventStageError(req.method, e));
      throw e;
    }
  });
export default getRpcMethodMiddleware;
