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
  _handleNetworkSwitch = (switchToChainId: `${number}` | undefined) =>
    handleNetworkSwitch({ instance: this, switchToChainId });

  _approveTransaction = async (ethUrl: ParseOutput, origin: string) =>
    approveTransaction({ instance: this, ethUrl, origin });

  async _handleEthereumUrl(url: string, origin: string) {
    return handleEthereumUrl({ instance: this, url, origin });
  }

  _handleBrowserUrl(url: string, callback: (url: string) => void) {
    return handleBrowserUrl({ instance: this, url, callback });
  }

  _handleBuyCrypto() {
    return handleBuyCrypto({ instance: this });
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
      instance: this,
      url,
      origin,
      browserCallBack,
      onHandled,
    });
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
