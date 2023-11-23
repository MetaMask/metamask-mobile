'use strict';

import { WalletDevice } from '@metamask/transaction-controller';
import { parse } from 'eth-url-parser';
import qs from 'qs';
import { Alert, InteractionManager } from 'react-native';
import URL from 'url-parse';
import { strings } from '../../locales/i18n';
import { showAlert } from '../actions/alert';
import {
  ACTIONS,
  ETH_ACTIONS,
  PREFIXES,
  PROTOCOLS,
} from '../constants/deeplinks';
import { NETWORK_ERROR_MISSING_NETWORK_ID } from '../constants/error';
import Routes from '../constants/navigation/Routes';
import NotificationManager from '../core/NotificationManager';
import SDKConnect from '../core/SDKConnect/SDKConnect';
import { getAddress } from '../util/address';
import { getNetworkTypeById, handleNetworkSwitch } from '../util/networks';
import { generateApproveData } from '../util/transactions';
import AppConstants from './AppConstants';
import Engine from './Engine';
import { Minimizer } from './NativeModules';
import DevLogger from './SDKConnect/utils/DevLogger';
import WC2Manager from './WalletConnect/WalletConnectV2';
import handleDeeplink from './SDKConnect/handlers/handleDeeplink';
import Logger from '../../app/util/Logger';

class DeeplinkManager {
  constructor({ navigation, dispatch }) {
    this.navigation = navigation;
    this.pendingDeeplink = null;
    this.dispatch = dispatch;
  }

  setDeeplink = (url) => (this.pendingDeeplink = url);

  getPendingDeeplink = () => this.pendingDeeplink;

  expireDeeplink = () => (this.pendingDeeplink = null);

  /**
   * Method in charge of changing network if is needed
   *
   * @param switchToChainId - Corresponding chain id for new network
   */
  _handleNetworkSwitch = (switchToChainId) => {
    const networkName = handleNetworkSwitch(switchToChainId);

    if (!networkName) return;

    this.dispatch(
      showAlert({
        isVisible: true,
        autodismiss: 5000,
        content: 'clipboard-alert',
        data: { msg: strings('send.warn_network_change') + networkName },
      }),
    );
  };

  _approveTransaction = async (ethUrl, origin) => {
    const {
      parameters: { address, uint256 },
      target_address,
      chain_id,
    } = ethUrl;
    const { TransactionController, PreferencesController, NetworkController } =
      Engine.context;

    if (chain_id) {
      const newNetworkType = getNetworkTypeById(chain_id);
      NetworkController.setProviderType(newNetworkType);
    }

    const uint256Number = Number(uint256);

    if (Number.isNaN(uint256Number))
      throw new Error('The parameter uint256 should be a number');
    if (!Number.isInteger(uint256Number))
      throw new Error('The parameter uint256 should be an integer');

    const value = uint256Number.toString(16);

    const spenderAddress = await getAddress(address, chain_id);
    if (!spenderAddress) {
      NotificationManager.showSimpleNotification({
        status: 'simple_notification_rejected',
        duration: 5000,
        title: strings('transaction.invalid_recipient'),
        description: strings('transaction.invalid_recipient_description'),
      });
      this.navigation.navigate('WalletView');
    }

    const txParams = {
      to: target_address.toString(),
      from: PreferencesController.state.selectedAddress.toString(),
      value: '0x0',
      data: generateApproveData({ spender: spenderAddress, value }),
    };

    TransactionController.addTransaction(txParams, {
      deviceConfirmedOn: WalletDevice.MM_MOBILE,
      origin,
    });
  };

  async _handleEthereumUrl(url, origin) {
    let ethUrl = '';
    try {
      ethUrl = parse(url);
    } catch (e) {
      if (e) Alert.alert(strings('deeplink.invalid'), e.toString());
      return;
    }

    const txMeta = { ...ethUrl, source: url };

    try {
      /**
       * Validate and switch network before performing any other action
       */
      this._handleNetworkSwitch(ethUrl.chain_id);

      switch (ethUrl.function_name) {
        case ETH_ACTIONS.TRANSFER: {
          this.navigation.navigate('SendView', {
            screen: 'Send',
            params: { txMeta: { ...txMeta, action: 'send-token' } },
          });
          break;
        }
        case ETH_ACTIONS.APPROVE: {
          await this._approveTransaction(ethUrl, origin);
          break;
        }
        default: {
          if (ethUrl.parameters?.value) {
            this.navigation.navigate('SendView', {
              screen: 'Send',
              params: { txMeta: { ...txMeta, action: 'send-eth' } },
            });
          } else {
            this.navigation.navigate('SendFlowView', {
              screen: 'SendTo',
              params: { txMeta },
            });
          }
        }
      }
    } catch (e) {
      let alertMessage;
      switch (e.message) {
        case NETWORK_ERROR_MISSING_NETWORK_ID:
          alertMessage = strings('send.network_missing_id');
          break;
        default:
          alertMessage = strings('send.network_not_found_description', {
            chain_id: ethUrl.chain_id,
          });
      }
      Alert.alert(strings('send.network_not_found_title'), alertMessage);
    }
  }

  _handleBrowserUrl(url, callback) {
    const handle = InteractionManager.runAfterInteractions(() => {
      if (callback) {
        callback(url);
      } else {
        this.navigation.navigate(Routes.BROWSER.HOME, {
          screen: Routes.BROWSER.VIEW,
          params: {
            newTabUrl: url,
            timestamp: Date.now(),
          },
        });
      }
    });
    if (handle && handle.done) {
      handle.done();
    }
  }

  _handleBuyCrypto() {
    this.navigation.navigate(Routes.RAMP.BUY);
  }

  parse(url, { browserCallBack, origin, onHandled }) {
    const urlObj = new URL(
      url
        .replace(
          `${PROTOCOLS.DAPP}/${PROTOCOLS.HTTPS}://`,
          `${PROTOCOLS.DAPP}/`,
        )
        .replace(
          `${PROTOCOLS.DAPP}/${PROTOCOLS.HTTP}://`,
          `${PROTOCOLS.DAPP}/`,
        ),
    );
    let params;

    if (urlObj.query.length) {
      try {
        params = qs.parse(urlObj.query.substring(1));
      } catch (e) {
        if (e) Alert.alert(strings('deeplink.invalid'), e.toString());
      }
    }

    const sdkConnect = SDKConnect.getInstance();

    const protocol = urlObj.protocol.replace(':', '');
    DevLogger.log(
      `DeepLinkManager:parse sdkInit=${sdkConnect.hasInitialized()} origin=${origin} protocol=${protocol}`,
      url,
    );

    const handled = () => (onHandled ? onHandled() : false);

    const { MM_UNIVERSAL_LINK_HOST, MM_DEEP_ITMS_APP_LINK } = AppConstants;
    const DEEP_LINK_BASE = `${PROTOCOLS.HTTPS}://${MM_UNIVERSAL_LINK_HOST}`;
    const wcURL = params?.uri || urlObj.href;
    switch (protocol) {
      case PROTOCOLS.HTTP:
      case PROTOCOLS.HTTPS:
        // Universal links
        handled();

        if (urlObj.hostname === MM_UNIVERSAL_LINK_HOST) {
          // action is the first part of the pathname
          const action = urlObj.pathname.split('/')[1];

          if (action === ACTIONS.ANDROID_SDK) {
            DevLogger.log(
              `DeeplinkManager:: metamask launched via android sdk universal link`,
            );
            sdkConnect.bindAndroidSDK().catch((err) => {
              Logger.error(`DeepLinkManager failed to connect`, err);
            });
            return;
          }

          if (action === ACTIONS.CONNECT) {
            if (params.redirect) {
              Minimizer.goBack();
            } else if (params.channelId) {
              handleDeeplink({
                channelId: params.channelId,
                origin,
                context: 'deeplink_universal',
                url,
                otherPublicKey: params.pubkey,
                sdkConnect,
              }).catch((err) => {
                Logger.error(`DeepLinkManager failed to connect`, err);
              });
            }
            return true;
          } else if (action === ACTIONS.WC && wcURL) {
            WC2Manager.getInstance()
              .then((instance) =>
                instance.connect({
                  wcUri: wcURL,
                  origin,
                  redirectUrl: params?.redirect,
                }),
              )
              .catch((err) => {
                console.warn(`DeepLinkManager failed to connect`, err);
              });
            return;
          } else if (action === ACTIONS.WC) {
            // This is called from WC just to open the app and it's not supposed to do anything
            return;
          } else if (PREFIXES[action]) {
            const url = urlObj.href.replace(
              `${DEEP_LINK_BASE}/${action}/`,
              PREFIXES[action],
            );
            // loops back to open the link with the right protocol
            this.parse(url, { browserCallBack, origin });
          } else if (action === ACTIONS.BUY_CRYPTO) {
            this._handleBuyCrypto();
          } else {
            // If it's our universal link or Apple store deep link don't open it in the browser
            if (
              (!action &&
                (urlObj.href === `${DEEP_LINK_BASE}/` ||
                  urlObj.href === DEEP_LINK_BASE)) ||
              urlObj.href === MM_DEEP_ITMS_APP_LINK
            )
              return;

            // Fix for Apple Store redirect even when app is installed
            if (urlObj.href.startsWith(`${DEEP_LINK_BASE}/`)) {
              this._handleBrowserUrl(
                `${PROTOCOLS.HTTPS}://${urlObj.href.replace(
                  `${DEEP_LINK_BASE}/`,
                  '',
                )}`,
                browserCallBack,
              );

              return;
            }

            // Normal links (same as dapp)
            this._handleBrowserUrl(urlObj.href, browserCallBack);
          }
        } else {
          // Normal links (same as dapp)
          this._handleBrowserUrl(urlObj.href, browserCallBack);
        }
        break;

      // walletconnect related deeplinks
      // address, transactions, etc
      case PROTOCOLS.WC:
        handled();

        WC2Manager.getInstance()
          .then((instance) =>
            instance.connect({
              wcUri: wcURL,
              origin,
              redirectUrl: params?.redirect,
            }),
          )
          .catch((err) => {
            console.warn(`DeepLinkManager failed to connect`, err);
          });

        break;

      case PROTOCOLS.ETHEREUM:
        handled();
        this._handleEthereumUrl(url, origin).catch((err) => {
          Logger.error(err, 'Error handling ethereum url');
        });
        break;

      // Specific to the browser screen
      // For ex. navigate to a specific dapp
      case PROTOCOLS.DAPP:
        // Enforce https
        handled();
        urlObj.set('protocol', 'https:');
        this._handleBrowserUrl(urlObj.href, browserCallBack);
        break;

      // Specific to the MetaMask app
      // For ex. go to settings
      case PROTOCOLS.METAMASK:
        handled();
        if (url.startsWith(`${PREFIXES.METAMASK}${ACTIONS.ANDROID_SDK}`)) {
          DevLogger.log(
            `DeeplinkManager:: metamask launched via android sdk deeplink`,
          );
          sdkConnect.bindAndroidSDK().catch((err) => {
            Logger.error(err);
          });
          return;
        }

        if (url.startsWith(`${PREFIXES.METAMASK}${ACTIONS.CONNECT}`)) {
          if (params.redirect) {
            Minimizer.goBack();
          } else if (params.channelId) {
            handleDeeplink({
              channelId: params.channelId,
              origin,
              url,
              context: 'deeplink_scheme',
              otherPublicKey: params.pubkey,
              sdkConnect,
            }).catch((err) => {
              Logger.error(err);
            });
          }
          return true;
        } else if (
          url.startsWith(`${PREFIXES.METAMASK}${ACTIONS.WC}`) ||
          url.startsWith(`${PREFIXES.METAMASK}/${ACTIONS.WC}`)
        ) {
          // console.debug(`test now deeplink hack ${url}`);
          let fixedUrl = wcURL;
          if (url.startsWith(`${PREFIXES.METAMASK}/${ACTIONS.WC}`)) {
            fixedUrl = url.replace(
              `${PREFIXES.METAMASK}/${ACTIONS.WC}`,
              `${ACTIONS.WC}`,
            );
          } else {
            url.replace(`${PREFIXES.METAMASK}${ACTIONS.WC}`, `${ACTIONS.WC}`);
          }

          WC2Manager.getInstance()
            .then((instance) =>
              instance.connect({
                wcUri: fixedUrl,
                origin,
                redirectUrl: params?.redirect,
              }),
            )
            .catch((err) => {
              console.warn(`DeepLinkManager failed to connect`, err);
            });
        } else if (
          url.startsWith(`${PREFIXES.METAMASK}${ACTIONS.BUY_CRYPTO}`)
        ) {
          this._handleBuyCrypto();
        }
        break;
      default:
        return false;
    }

    return true;
  }
}

let instance = null;

const SharedDeeplinkManager = {
  init: ({ navigation, dispatch }) => {
    if (instance) {
      return;
    }
    instance = new DeeplinkManager({
      navigation,
      dispatch,
    });
    DevLogger.log(`DeeplinkManager initialized`);
  },
  parse: (url, args) => instance.parse(url, args),
  setDeeplink: (url) => instance.setDeeplink(url),
  getPendingDeeplink: () => instance.getPendingDeeplink(),
  expireDeeplink: () => instance.expireDeeplink(),
};

export default SharedDeeplinkManager;
