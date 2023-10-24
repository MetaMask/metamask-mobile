import { WalletDevice } from '@metamask/transaction-controller';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootState } from 'app/reducers';
import { ParseOutput, parse } from 'eth-url-parser';
import qs from 'qs';
import { Alert, InteractionManager } from 'react-native';
import { AnyAction, Dispatch, Store } from 'redux';
import UrlParser from 'url-parse';
import { strings } from '../../locales/i18n';
import { showAlert } from '../actions/alert';
import { isNetworkBuySupported } from '../components/UI/Ramp/utils';
import {
  ACTIONS,
  ETH_ACTIONS,
  PREFIXES,
  PROTOCOLS,
} from '../constants/deeplinks';
import { NetworkSwitchErrorType } from '../constants/error';
import Routes from '../constants/navigation/Routes';
import { chainIdSelector, getRampNetworks } from '../reducers/fiatOrders';
import Logger from '../util/Logger';
import { getAddress } from '../util/address';
import { getNetworkTypeById, handleNetworkSwitch } from '../util/networks';
import { generateApproveData } from '../util/transactions';
import AppConstants from './AppConstants';
import Engine from './Engine';
import { Minimizer } from './NativeModules';
import NotificationManager from './NotificationManager';
import SDKConnect, {
  DEFAULT_SESSION_TIMEOUT_MS,
} from './SDKConnect/SDKConnect';
import DevLogger from './SDKConnect/utils/DevLogger';
import WC2Manager from './WalletConnect/WalletConnectV2';

class DeeplinkManager {
  public navigation: NavigationProp<ParamListBase>;
  public pendingDeeplink: string | null;
  public dispatch: Dispatch<any>;

  constructor({
    navigation,
    dispatch,
  }: {
    navigation: StackNavigationProp<{
      [route: string]: { screen: string };
    }>;
    dispatch: Store<any, AnyAction>['dispatch'];
  }) {
    this.navigation = navigation;
    this.pendingDeeplink = null;
    this.dispatch = dispatch;
  }

  setDeeplink = (url: string) => (this.pendingDeeplink = url);

  getPendingDeeplink = () => this.pendingDeeplink;

  expireDeeplink = () => (this.pendingDeeplink = null);

  /**
   * Method in charge of changing network if is needed
   *
   * @param switchToChainId - Corresponding chain id for new network
   */
  _handleNetworkSwitch = (switchToChainId: `${number}` | undefined) => {
    const networkName = handleNetworkSwitch(switchToChainId as string);

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

  _approveTransaction = async (ethUrl: ParseOutput, origin: string) => {
    const { parameters, target_address, chain_id } = ethUrl;
    const { TransactionController, PreferencesController, NetworkController } =
      Engine.context;

    if (chain_id) {
      const newNetworkType = getNetworkTypeById(chain_id);
      NetworkController.setProviderType(newNetworkType);
    }

    const uint256Number = Number(parameters?.uint256);

    if (Number.isNaN(uint256Number))
      throw new Error('The parameter uint256 should be a number');
    if (!Number.isInteger(uint256Number))
      throw new Error('The parameter uint256 should be an integer');

    const value = uint256Number.toString(16);

    const spenderAddress = await getAddress(
      parameters?.address as string,
      chain_id as string,
    );
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

  async _handleEthereumUrl(url: string, origin: string) {
    let ethUrl: ParseOutput;
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
    } catch (e: any) {
      let alertMessage;
      switch (e.message) {
        case NetworkSwitchErrorType.missingNetworkId:
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

  _handleBrowserUrl(url: string, callback: (url: string) => void) {
    InteractionManager.runAfterInteractions(() => {
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
  }

  _handleBuyCrypto() {
    this.dispatch((_: any, getState: Store<RootState, any>['getState']) => {
      const state = getState();
      // Do nothing for now if use is not in a supported network
      if (
        isNetworkBuySupported(chainIdSelector(state), getRampNetworks(state))
      ) {
        this.navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.ID);
      }
    });
  }

  parse(
    url: string,
    {
      browserCallBack,
      origin,
      onHandled,
    }: {
      browserCallBack: (url: string) => void;
      origin: string;
      onHandled?: () => void;
    },
  ) {
    const urlObj = new UrlParser(
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
    let params: {
      uri: string;
      redirect: string;
      channelId: string;
      comm: string;
      pubkey: string;
    } = {
      pubkey: '',
      uri: '',
      redirect: '',
      channelId: '',
      comm: '',
    };

    if (urlObj.query.length) {
      try {
        params = qs.parse(urlObj.query.substring(1)) as {
          uri: string;
          redirect: string;
          channelId: string;
          comm: string;
          pubkey: string;
        };
      } catch (e) {
        if (e) Alert.alert(strings('deeplink.invalid'), e.toString());
      }
    }

    // Double log entry because the Logger is too slow and display the message in incorrect order.
    Logger.log(`DeepLinkManager: parsing url=${url} origin=${origin}`);
    DevLogger.log(`DeepLinkManager: parsing url=${url} origin=${origin}`);

    const handled = () => (onHandled ? onHandled() : false);

    const { MM_UNIVERSAL_LINK_HOST, MM_DEEP_ITMS_APP_LINK } = AppConstants;
    const DEEP_LINK_BASE = `${PROTOCOLS.HTTPS}://${MM_UNIVERSAL_LINK_HOST}`;
    const wcURL = params?.uri || urlObj.href;
    switch (urlObj.protocol.replace(':', '')) {
      case PROTOCOLS.HTTP:
      case PROTOCOLS.HTTPS:
        // Universal links
        handled();

        if (urlObj.hostname === MM_UNIVERSAL_LINK_HOST) {
          // action is the first part of the pathname
          const action: ACTIONS = urlObj.pathname.split('/')[1] as ACTIONS;

          if (action === ACTIONS.ANDROID_SDK) {
            DevLogger.log(
              `DeeplinkManager:: metamask launched via android sdk universal link`,
            );
            SDKConnect.getInstance().bindAndroidSDK();
            return;
          }

          if (action === ACTIONS.CONNECT) {
            if (params.redirect) {
              Minimizer.goBack();
            } else if (params.channelId) {
              const connections = SDKConnect.getInstance().getConnections();
              const channelExists = connections[params.channelId] !== undefined;

              if (channelExists) {
                if (origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK) {
                  // Automatically re-approve hosts.
                  SDKConnect.getInstance().revalidateChannel({
                    channelId: params.channelId,
                  });
                }
                SDKConnect.getInstance().reconnect({
                  channelId: params.channelId,
                  otherPublicKey: params.pubkey,
                  context: 'deeplink (universal)',
                  initialConnection: false,
                });
              } else {
                SDKConnect.getInstance().connectToChannel({
                  id: params.channelId,
                  origin,
                  otherPublicKey: params.pubkey,
                  validUntil: Date.now() + DEFAULT_SESSION_TIMEOUT_MS,
                });
              }
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
            const deeplinkUrl = urlObj.href.replace(
              `${DEEP_LINK_BASE}/${action}/`,
              PREFIXES[action],
            );
            // loops back to open the link with the right protocol
            this.parse(deeplinkUrl, { browserCallBack, origin });
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
        if (url.startsWith(`${PREFIXES.METAMASK}${ACTIONS.ANDROID_SDK}`)) {
          DevLogger.log(
            `DeeplinkManager:: metamask launched via android sdk deeplink`,
          );
          SDKConnect.getInstance().bindAndroidSDK();
          return;
        }

        if (url.startsWith(`${PREFIXES.METAMASK}${ACTIONS.CONNECT}`)) {
          if (params.redirect) {
            Minimizer.goBack();
          } else if (params.channelId) {
            const channelExists =
              SDKConnect.getInstance().getApprovedHosts()[params.channelId];

            if (channelExists) {
              if (origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK) {
                // Automatically re-approve hosts.
                SDKConnect.getInstance().revalidateChannel({
                  channelId: params.channelId,
                });
              }
              SDKConnect.getInstance().reconnect({
                channelId: params.channelId,
                otherPublicKey: params.pubkey,
                context: 'deeplink (metamask)',
                initialConnection: false,
              });
            } else {
              SDKConnect.getInstance().connectToChannel({
                id: params.channelId,
                origin,
                otherPublicKey: params.pubkey,
                validUntil: Date.now() + DEFAULT_SESSION_TIMEOUT_MS,
              });
            }
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

let instance: DeeplinkManager;

const SharedDeeplinkManager = {
  init: ({
    navigation,
    dispatch,
  }: {
    navigation: StackNavigationProp<{
      [route: string]: { screen: string };
    }>;
    dispatch: Dispatch<any>;
  }) => {
    if (instance) {
      return;
    }
    instance = new DeeplinkManager({
      navigation,
      dispatch,
    });
  },
  parse: (url: string, args: any) => instance.parse(url, args),
  setDeeplink: (url: string) => instance.setDeeplink(url),
  getPendingDeeplink: () => instance.getPendingDeeplink(),
  expireDeeplink: () => instance.expireDeeplink(),
};

export default SharedDeeplinkManager;
