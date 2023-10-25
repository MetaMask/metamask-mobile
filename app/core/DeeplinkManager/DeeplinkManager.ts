import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ParseOutput } from 'eth-url-parser';
import { AnyAction, Dispatch, Store } from 'redux';
import approveTransaction from './TransactionsManger/approveTransaction';
import parseDeeplink from './ParseManager/parseDeeplink';
import handleBrowserUrl from './handlers/handleBrowserUrl';
import handleBuyCrypto from './handlers/handleBuyCrypto';
import handleEthereumUrl from './handlers/handleEthereumUrl';
import handleNetworkSwitch from './handlers/handleNetworkSwitch';

export class DeeplinkManager {
  navigation: NavigationProp<ParamListBase>;
  pendingDeeplink: string | null;
  dispatch: Dispatch<any>;

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
  _handleNetworkSwitch = (switchToChainId: `${number}` | undefined) =>
    handleNetworkSwitch({ deeplinkManager: this, switchToChainId });

  _approveTransaction = async (ethUrl: ParseOutput, origin: string) =>
    approveTransaction({ deeplinkManager: this, ethUrl, origin });

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

let deeplinkManagerInstance: DeeplinkManager;

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
    if (deeplinkManagerInstance) {
      return;
    }

    deeplinkManagerInstance = new DeeplinkManager({
      navigation,
      dispatch,
    });
  },
  parse: (url: string, args: any) => deeplinkManagerInstance.parse(url, args),
  setDeeplink: (url: string) => deeplinkManagerInstance.setDeeplink(url),
  getPendingDeeplink: () => deeplinkManagerInstance.getPendingDeeplink(),
  expireDeeplink: () => deeplinkManagerInstance.expireDeeplink(),
};

export default SharedDeeplinkManager;
