'use strict';

import { ParseOutput } from 'eth-url-parser';
import { Dispatch } from 'redux';
import handleBrowserUrl from './handlers/handleBrowserUrl';
import handleEthereumUrl from './handlers/handleEthereumUrl';
import handleRampUrl from './handlers/handleRampUrl';
import handleDepositCashUrl from './handlers/handleDepositCashUrl';
import switchNetwork from './handlers/switchNetwork';
import parseDeeplink from './parse/parseDeeplink';
import approveTransaction from './TransactionManager/approveTransaction';
import { RampType } from '../../../reducers/fiatOrders/types';
import { handleSwapUrl } from './handlers/handleSwapUrl';
import { navigateToHomeUrl } from './handlers/handleHomeUrl';
import Routes from '../../../constants/navigation/Routes';
import { handleCreateAccountUrl } from './handlers/handleCreateAccountUrl';
import { handlePerpsUrl } from './handlers/handlePerpsUrl';
import { store } from '../../../store';
import NavigationService from '../../NavigationService';
import branch from 'react-native-branch';
import { Linking } from 'react-native';
import Logger from '../../../util/Logger';
import { handleDeeplink } from './handlers/handleDeeplink';
import SharedDeeplinkManager from '../SharedDeeplinkManager';
import FCMService from '../../../util/notifications/services/FCMService';
import { handleRewardsUrl } from './handlers/handleRewardsUrl';
import { handlePredictUrl } from './handlers/handlePredictUrl';
import handleFastOnboarding from './handlers/handleFastOnboarding';
import { handleEnableCardButton } from './handlers/handleEnableCardButton';

class DeeplinkManager {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public navigation: any;
  public pendingDeeplink: string | null;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public dispatch: Dispatch<any>;

  constructor() {
    const navigation = NavigationService.navigation;
    const dispatch = store.dispatch;
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
    switchNetwork({
      deeplinkManager: this,
      switchToChainId,
    });

  _approveTransaction = async (ethUrl: ParseOutput, origin: string) =>
    approveTransaction({
      deeplinkManager: this,
      ethUrl,
      origin,
    });

  async _handleEthereumUrl(url: string, origin: string) {
    return handleEthereumUrl({
      deeplinkManager: this,
      url,
      origin,
    });
  }

  _handleBrowserUrl(url: string, callback?: (url: string) => void) {
    return handleBrowserUrl({
      deeplinkManager: this,
      url,
      callback,
    });
  }

  _handleBuyCrypto(rampPath: string) {
    handleRampUrl({
      rampPath,
      navigation: this.navigation,
      rampType: RampType.BUY,
    });
  }

  _handleSellCrypto(rampPath: string) {
    handleRampUrl({
      rampPath,
      navigation: this.navigation,
      rampType: RampType.SELL,
    });
  }

  _handleDepositCash(depositCashPath: string) {
    handleDepositCashUrl({
      depositPath: depositCashPath,
      navigation: this.navigation,
    });
  }

  _handleRewards(rewardsPath: string) {
    handleRewardsUrl({
      rewardsPath,
    });
  }

  // NOTE: open the home screen for new subdomain
  _handleOpenHome(homePath?: string) {
    navigateToHomeUrl({ homePath });
  }

  // NOTE: this will be used for new deeplink subdomain
  _handleSwap(swapPath: string) {
    handleSwapUrl({
      swapPath,
    });
  }

  _handleCreateAccount(createAccountPath: string) {
    handleCreateAccountUrl({
      path: createAccountPath,
      navigation: this.navigation,
    });
  }

  _handlePerps(perpsPath: string) {
    handlePerpsUrl({
      perpsPath,
    });
  }

  _handlePredict(predictPath: string, origin?: string) {
    handlePredictUrl({
      predictPath,
      origin,
    });
  }

  // NOTE: keeping this for backwards compatibility
  _handleOpenSwap() {
    this.navigation.navigate(Routes.SWAPS);
  }

  _handleFastOnboarding(onboardingPath: string) {
    handleFastOnboarding({ onboardingPath });
  }

  _handleEnableCardButton() {
    handleEnableCardButton();
  }

  async parse(
    url: string,
    {
      browserCallBack,
      origin,
      onHandled,
    }: {
      browserCallBack?: (url: string) => void;
      origin: string;
      onHandled?: () => void;
    },
  ) {
    return await parseDeeplink({
      deeplinkManager: this,
      url,
      origin,
      browserCallBack,
      onHandled,
    });
  }

  static start() {
    SharedDeeplinkManager.init();

    const getBranchDeeplink = async (uri?: string) => {
      if (uri) {
        handleDeeplink({ uri });
        return;
      }

      try {
        const latestParams = await branch.getLatestReferringParams();
        const deeplink = latestParams?.['+non_branch_link'] as string;
        if (deeplink) {
          handleDeeplink({ uri: deeplink });
        }
      } catch (error) {
        Logger.error(error as Error, 'Error getting Branch deeplink');
      }
    };

    FCMService.onClickPushNotificationWhenAppClosed().then((deeplink) => {
      if (deeplink) {
        handleDeeplink({ uri: deeplink });
      }
    });

    FCMService.onClickPushNotificationWhenAppSuspended((deeplink) => {
      if (deeplink) {
        handleDeeplink({ uri: deeplink });
      }
    });

    Linking.getInitialURL().then((url) => {
      if (!url) {
        return;
      }
      Logger.log(`handleDeeplink:: got initial URL ${url}`);
      handleDeeplink({ uri: url });
    });

    Linking.addEventListener('url', (params) => {
      const { url } = params;
      handleDeeplink({ uri: url });
    });

    // branch.subscribe is not called for iOS cold start after the new RN architecture upgrade.
    // This is a workaround to ensure that the deeplink is processed for iOS cold start.
    // TODO: Remove this once branch.subscribe is called for iOS cold start.
    getBranchDeeplink();

    branch.subscribe((opts) => {
      const { error } = opts;
      if (error) {
        const branchError = new Error(error);
        Logger.error(branchError, 'Error subscribing to branch.');
      }
      getBranchDeeplink(opts.uri);
      //TODO: that async call in the subscribe doesn't look good to me
      branch.getLatestReferringParams().then((val) => {
        const deeplink = opts.uri || (val['+non_branch_link'] as string);
        handleDeeplink({ uri: deeplink });
      });
    });
  }
}

export default DeeplinkManager;
