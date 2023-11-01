import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { ParseOutput } from 'eth-url-parser';
import { AnyAction, Dispatch, Store } from 'redux';
import parseDeeplink from './ParseManager/parseDeeplink';
import approveTransaction from './TransactionsManger/approveTransaction';
import handleBrowserUrl from './handlers/handleBrowserUrl';
import handleBuyCrypto from './handlers/handleBuyCrypto';
import handleEthereumUrl from './handlers/handleEthereumUrl';
import handleNetworkSwitch from './handlers/handleNetworkSwitch';

class DeeplinkManager {
  navigation: NavigationProp<ParamListBase>;
  pendingDeeplink: string | null;
  dispatch: Dispatch<any>;

  constructor({
    navigation,
    dispatch,
  }: {
    navigation: NavigationProp<ParamListBase>;
    dispatch: Store<any, AnyAction>['dispatch'];
  }) {
    this.navigation = navigation;
    this.pendingDeeplink = null;
    this.dispatch = dispatch;
  }

  setDeeplink(url: string) {
    this.pendingDeeplink = url;
  }

  getPendingDeeplink() {
    return this.pendingDeeplink;
  }

  expireDeeplink() {
    this.pendingDeeplink = null;
  }

  /**
   * Method in charge of changing network if is needed
   *
   * @param switchToChainId - Corresponding chain id for new network
   */
  _handleNetworkSwitch(switchToChainId: `${number}` | undefined) {
    return handleNetworkSwitch({ deeplinkManager: this, switchToChainId });
  }

  async _approveTransaction(ethUrl: ParseOutput, origin: string) {
    return approveTransaction({ deeplinkManager: this, ethUrl, origin });
  }

  async _handleEthereumUrl(url: string, origin: string) {
    return handleEthereumUrl({ deeplinkManager: this, url, origin });
  }

  _handleBrowserUrl(url: string, callback: (url: string) => void) {
    return handleBrowserUrl({ deeplinkManager: this, url, callback });
  }

  _handleBuyCrypto() {
    return handleBuyCrypto({ deeplinkManager: this });
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
    return parseDeeplink({
      deeplinkManager: this,
      url,
      origin,
      browserCallBack,
      onHandled,
    });
  }
}

export default DeeplinkManager;
