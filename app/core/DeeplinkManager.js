'use strict';

import URL from 'url-parse';
import qs from 'qs';
import { InteractionManager, Alert } from 'react-native';
import { parse } from 'eth-url-parser';
import WalletConnect from '../core/WalletConnect';
import AppConstants from './AppConstants';
import Engine from './Engine';
import { generateApproveData } from '../util/transactions';
import { NETWORK_ERROR_MISSING_NETWORK_ID } from '../constants/error';
import { strings } from '../../locales/i18n';
import { getNetworkTypeById } from '../util/networks';
import { WalletDevice } from '@metamask/controllers/';
import {
  ACTIONS,
  ETH_ACTIONS,
  PROTOCOLS,
  PREFIXES,
} from '../constants/deeplinks';
import { showAlert } from '../actions/alert';
import Routes from '../constants/navigation/Routes';

class DeeplinkManager {
  constructor({ navigation, frequentRpcList, dispatch }) {
    this.navigation = navigation;
    this.pendingDeeplink = null;
    this.frequentRpcList = frequentRpcList;
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
    const { NetworkController, CurrencyRateController } = Engine.context;

    // If not specified, use the current network
    if (!switchToChainId) {
      return;
    }

    // If current network is the same as the one we want to switch to, do nothing
    if (
      NetworkController?.state?.provider?.chainId === String(switchToChainId)
    ) {
      return;
    }

    const rpc = this.frequentRpcList.find(
      ({ chainId }) => chainId === switchToChainId,
    );

    if (rpc) {
      const { rpcUrl, chainId, ticker, nickname } = rpc;
      CurrencyRateController.setNativeCurrency(ticker);
      NetworkController.setRpcTarget(rpcUrl, chainId, ticker, nickname);
      this.dispatch(
        showAlert({
          isVisible: true,
          autodismiss: 5000,
          content: 'clipboard-alert',
          data: { msg: strings('send.warn_network_change') + nickname },
        }),
      );
      return;
    }

    const networkType = getNetworkTypeById(switchToChainId);

    if (networkType) {
      CurrencyRateController.setNativeCurrency('ETH');
      NetworkController.setProviderType(networkType);
      this.dispatch(
        showAlert({
          isVisible: true,
          autodismiss: 5000,
          content: 'clipboard-alert',
          data: { msg: strings('send.warn_network_change') + networkType },
        }),
      );
    }
  };

  _approveTransaction = (ethUrl, origin) => {
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

    const txParams = {
      to: target_address.toString(),
      from: PreferencesController.state.selectedAddress.toString(),
      value: '0x0',
      data: generateApproveData({ spender: address, value }),
    };

    TransactionController.addTransaction(
      txParams,
      origin,
      WalletDevice.MM_MOBILE,
    );
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
          this._approveTransaction(ethUrl, origin);
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
    InteractionManager.runAfterInteractions(() => {
      if (callback) {
        callback(url);
      } else {
        this.navigation.navigate(Routes.BROWSER_TAB_HOME, {
          screen: Routes.BROWSER_VIEW,
          params: {
            newTabUrl: url,
            timestamp: Date.now(),
          },
        });
      }
    });
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
    let wcCleanUrl;

    if (urlObj.query.length) {
      try {
        params = qs.parse(urlObj.query.substring(1));
      } catch (e) {
        if (e) Alert.alert(strings('deeplink.invalid'), e.toString());
      }
    }

    const handled = () => (onHandled ? onHandled() : false);

    const { MM_UNIVERSAL_LINK_HOST, MM_DEEP_ITMS_APP_LINK } = AppConstants;
    const DEEP_LINK_BASE = `${PROTOCOLS.HTTPS}://${MM_UNIVERSAL_LINK_HOST}`;

    switch (urlObj.protocol.replace(':', '')) {
      case PROTOCOLS.HTTP:
      case PROTOCOLS.HTTPS:
        // Universal links
        handled();

        if (urlObj.hostname === MM_UNIVERSAL_LINK_HOST) {
          // action is the first part of the pathname
          const action = urlObj.pathname.split('/')[1];

          if (action === ACTIONS.WC && params?.uri) {
            WalletConnect.newSession(
              params.uri,
              params.redirectUrl,
              false,
              origin,
            );
          } else if (action === ACTIONS.WC) {
            // This is called from WC just to open the app and it's not supposed to do anything
            return;
          } else if (PREFIXES[action]) {
            const url = urlObj.href.replace(
              `${DEEP_LINK_BASE}/${action}/`,
              PREFIXES[action],
            );
            // loops back to open the link with the right protocol
            this.parse(url, { browserCallBack });
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

        wcCleanUrl = url.replace('wc://wc?uri=', '');
        if (!WalletConnect.isValidUri(wcCleanUrl)) return;

        WalletConnect.newSession(
          wcCleanUrl,
          params?.redirect,
          params?.autosign,
          origin,
        );
        break;

      case PROTOCOLS.ETHEREUM:
        handled();
        this._handleEthereumUrl(url, origin);
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

        if (url.startsWith('metamask://wc')) {
          const cleanUrlObj = new URL(urlObj.query.replace('?uri=', ''));
          const href = cleanUrlObj.href;

          if (!WalletConnect.isValidUri(href)) return;

          WalletConnect.newSession(
            href,
            params?.redirect,
            params?.autosign,
            origin,
          );
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
  init: ({ navigation, frequentRpcList, dispatch }) => {
    instance = new DeeplinkManager({ navigation, frequentRpcList, dispatch });
  },
  parse: (url, args) => instance.parse(url, args),
  setDeeplink: (url) => instance.setDeeplink(url),
  getPendingDeeplink: () => instance.getPendingDeeplink(),
  expireDeeplink: () => instance.expireDeeplink(),
};

export default SharedDeeplinkManager;
