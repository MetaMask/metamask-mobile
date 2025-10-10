import { MutableRefObject } from 'react';
import { Alert, ImageSourcePropType } from 'react-native';
import { getVersion } from 'react-native-device-info';
import { createAsyncMiddleware } from '@metamask/json-rpc-engine';
import { providerErrors, rpcErrors } from '@metamask/rpc-errors';
import { SetFlowLoadingTextOptions } from '@metamask/approval-controller';
import { recoverPersonalSignature } from '@metamask/eth-sig-util';
import { rejectOriginPendingApprovals } from '../../util/permissions';
import { Hex } from '@metamask/utils';
import {
  getPermissionsHandler,
  requestPermissionsHandler,
  revokePermissionsHandler,
} from '@metamask/eip1193-permission-middleware';
import RPCMethods from './index.js';
import { RPC } from '../../constants/network';
import { ChainId, NetworkType } from '@metamask/controller-utils';
import {
  PermissionController,
  PermissionDoesNotExistError,
  RequestedPermissions,
} from '@metamask/permission-controller';
import {
  blockTagParamIndex,
  getAllNetworks,
  isPerDappSelectedNetworkEnabled,
} from '../../util/networks';
import { polyfillGasPrice } from './utils';
import ImportedEngine from '../Engine';
import { strings } from '../../../locales/i18n';
import { resemblesAddress, safeToChecksumAddress } from '../../util/address';
import { store } from '../../store';
import { removeBookmark } from '../../actions/bookmarks';
import { v1 as random } from 'uuid';
import { getPermittedAccounts } from '../Permissions';
import AppConstants from '../AppConstants';
import PPOMUtil from '../../lib/ppom/ppom-util';
import {
  selectEvmChainId,
  selectProviderConfig,
} from '../../selectors/networkController';
import { setEventStageError, setEventStage } from '../../actions/rpcEvents';
import { isWhitelistedRPC, RPCStageTypes } from '../../reducers/rpcEvents';
import { regex } from '../../../app/util/regex';
import Logger from '../../../app/util/Logger';
import DevLogger from '../SDKConnect/utils/DevLogger';
import { addTransaction } from '../../util/transaction-controller';
import Routes from '../../constants/navigation/Routes';
import { endTrace, trace, TraceName } from '../../util/trace';
import {
  MessageParamsTyped,
  SignatureController,
} from '@metamask/signature-controller';
import { selectPerOriginChainId } from '../../selectors/selectedNetworkController';
import requestEthereumAccounts from './eth-request-accounts';
import {
  getCaip25PermissionFromLegacyPermissions,
  requestPermittedChainsPermissionIncremental,
} from '@metamask/chain-agnostic-permission';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Engine = ImportedEngine as any;

let appVersion = '';

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
export const SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES = {
  confirmAccountCreation: 'snap_manageAccounts:confirmAccountCreation',
  confirmAccountRemoval: 'snap_manageAccounts:confirmAccountRemoval',
  showSnapAccountRedirect: 'snap_manageAccounts:showSnapAccountRedirect',
  showNameSnapAccount: 'snap_manageAccounts:showNameSnapAccount',
};
///: END:ONLY_INCLUDE_IF

export enum ApprovalTypes {
  CONNECT_ACCOUNTS = 'CONNECT_ACCOUNTS',
  SIGN_MESSAGE = 'SIGN_MESSAGE',
  ADD_ETHEREUM_CHAIN = 'ADD_ETHEREUM_CHAIN',
  SWITCH_ETHEREUM_CHAIN = 'SWITCH_ETHEREUM_CHAIN',
  REQUEST_PERMISSIONS = 'wallet_requestPermissions',
  WALLET_CONNECT = 'WALLET_CONNECT',
  PERSONAL_SIGN = 'personal_sign',
  ETH_SIGN_TYPED_DATA = 'eth_signTypedData',
  WATCH_ASSET = 'wallet_watchAsset',
  TRANSACTION = 'transaction',
  RESULT_ERROR = 'result_error',
  RESULT_SUCCESS = 'result_success',
  SMART_TRANSACTION_STATUS = 'smart_transaction_status',
  ///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
  INSTALL_SNAP = 'wallet_installSnap',
  UPDATE_SNAP = 'wallet_updateSnap',
  SNAP_DIALOG = 'snap_dialog',
  ///: END:ONLY_INCLUDE_IF
}

export interface RPCMethodsMiddleParameters {
  hostname: string;
  channelId?: string; // Used for remote connections
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getProviderState: (origin?: string, networkClientId?: string) => any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
  url: MutableRefObject<string>;
  title: MutableRefObject<string>;
  icon: MutableRefObject<ImageSourcePropType | undefined>;
  // Bookmarks
  isHomepage: () => boolean;
  // Show autocomplete
  fromHomepage: { current: boolean };
  toggleUrlModal: (shouldClearUrlInput: boolean) => void;
  // For the browser
  tabId: number | '' | false;
  // For WalletConnect
  isWalletConnect: boolean;
  // For MM SDK
  isMMSDK: boolean;
  injectHomePageScripts: (bookmarks?: []) => void;
  analytics: { [key: string]: string | boolean };
}

// Also used by WalletConnect.js.
export const checkActiveAccountAndChainId = async ({
  address,
  chainId,
  channelId,
  hostname,
  isWalletConnect,
}: {
  address?: string;
  chainId?: number;
  channelId?: string;
  hostname: string;
  isWalletConnect: boolean;
}) => {
  let isInvalidAccount = false;
  const origin = channelId ?? hostname;

  if (address) {
    const formattedAddress = safeToChecksumAddress(address);
    DevLogger.log('checkActiveAccountAndChainId', {
      address,
      chainId,
      channelId,
      hostname,
      formattedAddress,
    });

    const permissionsController = (
      Engine.context as {
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        PermissionController: PermissionController<any, any>;
      }
    ).PermissionController;
    DevLogger.log(
      `checkActiveAccountAndChainId channelId=${channelId} isWalletConnect=${isWalletConnect} hostname=${hostname}`,
      permissionsController.state,
    );

    const accounts = getPermittedAccounts(origin);
    const normalizedAccounts = accounts.map(safeToChecksumAddress);

    if (!normalizedAccounts.includes(formattedAddress)) {
      DevLogger.log(`invalid accounts ${formattedAddress}`, normalizedAccounts);
      isInvalidAccount = true;
      if (accounts.length > 0) {
        // Permissions issue --- requesting incorrect address
        throw rpcErrors.invalidParams({
          message: `Invalid parameters: must provide a permitted Ethereum address.`,
        });
      }
    }

    if (isInvalidAccount) {
      throw rpcErrors.invalidParams({
        message: `Invalid parameters: must provide an Ethereum address.`,
      });
    }
  }

  DevLogger.log(
    `checkActiveAccountAndChainId isInvalidAccount=${isInvalidAccount}`,
  );

  if (chainId) {
    const providerConfig = selectProviderConfig(store.getState());
    const providerConfigChainId = selectEvmChainId(store.getState());
    const networkType = providerConfig.type as NetworkType;
    const isInitialNetwork =
      networkType && getAllNetworks().includes(networkType);
    let activeChainId;

    if (origin && isPerDappSelectedNetworkEnabled()) {
      const perOriginChainId = selectPerOriginChainId(store.getState(), origin);

      activeChainId = perOriginChainId;
    } else if (isInitialNetwork) {
      activeChainId = ChainId[networkType as keyof typeof ChainId];
    } else if (networkType === RPC) {
      activeChainId = providerConfigChainId;
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
      throw rpcErrors.invalidParams({
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
  isWalletConnect,
  checkTabActive,
}: {
  version: string;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: any;
  hostname: string;
  url: MutableRefObject<string>;
  title: MutableRefObject<string>;
  icon: MutableRefObject<ImageSourcePropType | undefined>;
  analytics: { [key: string]: string | boolean };
  chainId: number;
  isMMSDK: boolean;
  channelId?: string;
  getSource: () => string;
  isWalletConnect: boolean;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  checkTabActive: any;
}) => {
  endTrace({ name: TraceName.Middleware, id: req.id });

  const signatureController = Engine.context
    .SignatureController as SignatureController;

  const pageMeta = {
    meta: {
      url: url.current,
      title: title.current,
      icon: icon.current,
      channelId,
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
    isWalletConnect,
  });

  const rawSig = await signatureController.newUnsignedTypedMessage(
    {
      data: req.params[1],
      from: req.params[0],
      requestId: req.id,
      ...pageMeta,
      channelId,
      origin: hostname,
      securityAlertResponse: req.securityAlertResponse,
    } as MessageParamsTyped,
    req,
    version,
    {
      parseJsonData: false,
    },
    { traceContext: req.traceContext },
  );

  endTrace({ name: TraceName.Signature, id: req.id });

  return rawSig;
};

/**
 * Gets the dependency hooks used by methods from {@link getRpcMethodMiddleware}
 * @param origin - The origin of the connection.
 * @returns The hooks object.
 */
export const getRpcMethodMiddlewareHooks = (origin: string) => ({
  getCaveat: ({
    target,
    caveatType,
  }: {
    target: string;
    caveatType: string;
  }) => {
    try {
      return Engine.context.PermissionController.getCaveat(
        origin,
        target,
        caveatType,
      );
    } catch (e) {
      if (e instanceof PermissionDoesNotExistError) {
        // suppress expected error in case that the origin
        // does not have the target permission yet
      } else {
        throw e;
      }
    }

    return undefined;
  },
  requestPermittedChainsPermissionIncrementalForOrigin: (options: {
    origin: string;
    chainId: Hex;
    autoApprove: boolean;
  }) =>
    requestPermittedChainsPermissionIncremental({
      ...options,
      origin,
      hooks: {
        grantPermissionsIncremental:
          Engine.context.PermissionController.grantPermissionsIncremental.bind(
            Engine.context.PermissionController,
          ),
        requestPermissionsIncremental:
          Engine.context.PermissionController.requestPermissionsIncremental.bind(
            Engine.context.PermissionController,
          ),
      },
    }),
  hasApprovalRequestsForOrigin: () =>
    Engine.context.ApprovalController.has({ origin }),
  toNetworkConfiguration: Engine.controllerMessenger.call.bind(
    Engine.controllerMessenger,
    'NetworkController:getNetworkConfigurationByChainId',
  ),
  getCurrentChainIdForDomain: (domain: string) => {
    const networkClientId =
      Engine.context.SelectedNetworkController.getNetworkClientIdForDomain(
        domain,
      );
    const { chainId } =
      Engine.context.NetworkController.getNetworkConfigurationByNetworkClientId(
        networkClientId,
      );
    return chainId;
  },
  getNetworkConfigurationByChainId:
    Engine.context.NetworkController.getNetworkConfigurationByChainId.bind(
      Engine.context.NetworkController,
    ),
  rejectApprovalRequestsForOrigin: () => rejectOriginPendingApprovals(origin),
});

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
  // For the browser
  tabId,
  // For WalletConnect
  isWalletConnect,
  // For MM SDK
  isMMSDK,
  injectHomePageScripts,
  // For analytics
  analytics,
}: RPCMethodsMiddleParameters) => {
  // Make sure to always have the correct origin
  hostname = hostname
    .replace(AppConstants.MM_SDK.SDK_REMOTE_ORIGIN, '')
    .replace(AppConstants.MM_SDK.SDK_CONNECT_V2_ORIGIN, '');
  const origin = channelId ?? hostname;
  const hooks = getRpcMethodMiddlewareHooks(origin);

  DevLogger.log(
    `getRpcMethodMiddleware hostname=${hostname} channelId=${channelId}`,
  );
  // all user facing RPC calls not implemented by the provider
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createAsyncMiddleware(async (req: any, res: any, next: any) => {
    // Used by eth_accounts and eth_coinbase RPCs.
    const getEthAccounts = async () => {
      const accounts = getPermittedAccounts(origin);
      res.result = accounts;
    };

    const checkTabActive = () => {
      if (!tabId) return true;
      const { browser } = store.getState();
      if (tabId !== browser.activeTab)
        throw providerErrors.userRejectedRequest();
    };

    const getSource = () => {
      if (analytics?.isRemoteConn)
        return AppConstants.REQUEST_SOURCES.SDK_REMOTE_CONN;
      if (isWalletConnect) return AppConstants.REQUEST_SOURCES.WC;
      return AppConstants.REQUEST_SOURCES.IN_APP_BROWSER;
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const setApprovalFlowLoadingText = (opts: SetFlowLoadingTextOptions) => {
      Engine.context.ApprovalController.setFlowLoadingText(opts);
    };

    const requestUserApproval = async ({ type = '', requestData = {} }) => {
      checkTabActive();
      await Engine.context.ApprovalController.clear(
        providerErrors.userRejectedRequest(),
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
            channelId,
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

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rpcMethods: any = {
      wallet_revokePermissions: async () =>
        await revokePermissionsHandler.implementation(
          req,
          res,
          next,
          (err) => {
            if (err) {
              throw err;
            }
          },
          {
            revokePermissionsForOrigin: (permissionKeys) => {
              try {
                Engine.context.PermissionController.revokePermissions({
                  [origin]: permissionKeys,
                });
              } catch (e) {
                // we dont want to handle errors here because
                // the revokePermissions api method should just
                // return `null` if the permissions were not
                // successfully revoked or if the permissions
                // for the origin do not exist
              }
            },
          },
        ),
      wallet_getPermissions: async () =>
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new Promise<any>((resolve) => {
          const handle = getPermissionsHandler.implementation(
            req,
            res,
            next,
            () => {
              resolve(undefined);
            },
            {
              getAccounts: (...args) => getPermittedAccounts(origin, ...args),
              getPermissionsForOrigin:
                Engine.context.PermissionController.getPermissions.bind(
                  Engine.context.PermissionController,
                  channelId ?? hostname,
                ),
            },
          );
          handle?.catch((error) => {
            Logger.error(error as Error, 'Failed to get permissions');
          });
        }),
      wallet_requestPermissions: async () =>
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new Promise<any>((resolve, reject) => {
          requestPermissionsHandler
            .implementation(
              req,
              res,
              next,
              (err) => {
                if (err) {
                  return reject(err);
                }
                resolve(undefined);
              },
              {
                getAccounts: (...args) => getPermittedAccounts(origin, ...args),
                getCaip25PermissionFromLegacyPermissionsForOrigin: (
                  requestedPermissions?: RequestedPermissions,
                ) =>
                  getCaip25PermissionFromLegacyPermissions(
                    requestedPermissions,
                  ) as unknown as RequestedPermissions,
                requestPermissionsForOrigin: (requestedPermissions) =>
                  Engine.context.PermissionController.requestPermissions(
                    { origin: channelId ?? hostname },
                    requestedPermissions,
                    {
                      metadata: {
                        isEip1193Request: true,
                      },
                    },
                  ),
              },
            )
            ?.then(resolve)
            .catch(reject);
        }),
      eth_getTransactionByHash: async () => {
        res.result = await polyfillGasPrice(
          'getTransactionByHash',
          origin,
          req.params,
        );
      },
      eth_getTransactionByBlockHashAndIndex: async () => {
        res.result = await polyfillGasPrice(
          'getTransactionByBlockHashAndIndex',
          origin,
          req.params,
        );
      },
      eth_getTransactionByBlockNumberAndIndex: async () => {
        res.result = await polyfillGasPrice(
          'getTransactionByBlockNumberAndIndex',
          origin,
          req.params,
        );
      },
      eth_chainId: () => {
        const networkConfiguration =
          Engine.context.NetworkController.getNetworkConfigurationByNetworkClientId(
            req.networkClientId,
          );
        res.result = networkConfiguration.chainId;
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
        const networkProviderState = await getProviderState(
          origin,
          req.networkClientId,
        );
        res.result = networkProviderState.networkVersion;
      },
      eth_requestAccounts: async () =>
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new Promise<any>((resolve, reject) => {
          requestEthereumAccounts
            .implementation(
              req,
              res,
              next,
              (err: Error) => {
                if (err) {
                  return reject(err);
                }
                resolve(undefined);
              },
              {
                getAccounts: (opts?: { ignoreLock?: boolean }) =>
                  getPermittedAccounts(origin, opts),
                getCaip25PermissionFromLegacyPermissionsForOrigin: (
                  requestedPermissions?: RequestedPermissions,
                ) =>
                  getCaip25PermissionFromLegacyPermissions(
                    requestedPermissions,
                  ),
                requestPermissionsForOrigin: (
                  requestedPermissions: RequestedPermissions,
                ) =>
                  Engine.context.PermissionController.requestPermissions(
                    { origin: channelId ?? hostname },
                    requestedPermissions,
                    {
                      metadata: {
                        isEip1193Request: true,
                      },
                    },
                  ),
                getUnlockPromise: () => {
                  if (Engine.context.KeyringController.isUnlocked()) {
                    return Promise.resolve();
                  }
                  return new Promise((resolveUnlock) => {
                    Engine.controllerMessenger.subscribeOnceIf(
                      'KeyringController:unlock',
                      resolveUnlock,
                      () => true,
                    );
                  });
                },
              },
            )
            ?.then(resolve)
            .catch(reject);
        }),
      eth_accounts: getEthAccounts,
      eth_coinbase: getEthAccounts,
      parity_defaultAccount: getEthAccounts,
      eth_sendTransaction: async () => {
        checkTabActive();
        const transactionAnalytics = {
          dapp_url: url.current,
          request_source: getSource(),
        };
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
            // TODO this needs to be modified for per dapp selected network
            await checkActiveAccountAndChainId({
              hostname,
              address: from,
              channelId,
              chainId,
              isWalletConnect,
            });
          },
          analytics: transactionAnalytics,
        });
      },

      personal_sign: async () => {
        const firstParam = req.params[0];
        const secondParam = req.params[1];
        const params = {
          data: firstParam,
          from: secondParam,
          requestId: req.id,
        };

        if (resemblesAddress(firstParam) && !resemblesAddress(secondParam)) {
          params.data = secondParam;
          params.from = firstParam;
        }

        const pageMeta = {
          meta: {
            url: url.current,
            channelId,
            title: title.current,
            icon: icon.current,
            analytics: {
              request_source: getSource(),
              request_platform: analytics?.platform,
            },
          },
        };

        const signatureController = Engine.context
          .SignatureController as SignatureController;

        checkTabActive();
        await checkActiveAccountAndChainId({
          hostname,
          channelId,
          address: params.from,
          isWalletConnect,
        });

        DevLogger.log(`personal_sign`, params, pageMeta, hostname);

        trace(
          { name: TraceName.PPOMValidation, parentContext: req.traceContext },
          () => PPOMUtil.validateRequest(req),
        );

        const rawSig = await signatureController.newUnsignedPersonalMessage(
          {
            ...params,
            ...pageMeta,
            origin: hostname,
          },
          req,
          { traceContext: req.traceContext },
        );

        endTrace({ name: TraceName.Signature, id: req.id });

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
        endTrace({ name: TraceName.Middleware, id: req.id });

        const pageMeta = {
          meta: {
            url: url.current,
            title: title.current,
            icon: icon.current,
            channelId,
            analytics: {
              request_source: getSource(),
              request_platform: analytics?.platform,
            },
          },
        };

        const signatureController = Engine.context
          .SignatureController as SignatureController;

        checkTabActive();
        await checkActiveAccountAndChainId({
          hostname,
          channelId,
          address: req.params[1],
          isWalletConnect,
        });

        trace(
          { name: TraceName.PPOMValidation, parentContext: req.traceContext },
          () => PPOMUtil.validateRequest(req),
        );

        const rawSig = await signatureController.newUnsignedTypedMessage(
          {
            data: req.params[0],
            from: req.params[1],
            requestId: req.id,
            ...pageMeta,
            origin: hostname,
          },
          req,
          'V1',
          { parseJsonData: false },
          { traceContext: req.traceContext },
        );

        endTrace({ name: TraceName.Signature, id: req.id });

        res.result = rawSig;
      },

      eth_signTypedData_v3: async () => {
        const data =
          typeof req.params[1] === 'string'
            ? JSON.parse(req.params[1])
            : req.params[1];
        const chainId = data.domain.chainId;

        trace(
          { name: TraceName.PPOMValidation, parentContext: req.traceContext },
          () => PPOMUtil.validateRequest(req),
        );

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
        const data =
          typeof req.params[1] === 'string'
            ? JSON.parse(req.params[1])
            : req.params[1];
        const chainId = data.domain.chainId;

        trace(
          { name: TraceName.PPOMValidation, parentContext: req.traceContext },
          () => PPOMUtil.validateRequest(req),
        );

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
          navigation.navigate(Routes.QR_TAB_SWITCHER, {
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onScanError: (e: { toString: () => any }) => {
              throw rpcErrors.internal(e.toString());
            },
          });
        }),

      wallet_watchAsset: async () =>
        RPCMethods.wallet_watchAsset({ req, res, hostname, checkTabActive }),

      metamask_removeFavorite: async () => {
        checkTabActive();

        if (!isHomepage()) {
          throw providerErrors.unauthorized('Forbidden.');
        }

        const { bookmarks } = store.getState();

        return new Promise<void>((resolve) => {
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
                  resolve();
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
                  resolve();
                },
              },
            ],
          );
        });
      },

      metamask_showAutocomplete: async () => {
        checkTabActive();
        if (!isHomepage()) {
          throw providerErrors.unauthorized('Forbidden.');
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
       * This method is used by the inpage provider or sdk to get its state on
       * initialization.
       */
      metamask_getProviderState: async () => {
        const accounts = getPermittedAccounts(origin);
        res.result = {
          ...(await getProviderState(origin, req.networkClientId)),
          accounts,
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
          hooks,
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
          hooks,
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
    } catch (error: unknown) {
      isWhiteListedMethod &&
        store.dispatch(setEventStageError(req.method, error));
      throw error;
    }
  });
};
export default getRpcMethodMiddleware;
