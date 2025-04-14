import { NavigationContainerRef } from '@react-navigation/native';
import { IWalletKit } from '@reown/walletkit';
import DevLogger from '../SDKConnect/utils/DevLogger';

import WalletConnect2Session from './WalletConnect2Session';
export class WC2Manager {
  private constructor(
    web3Wallet: IWalletKit,
    deeplinkSessions: {
      [topic: string]: { redirectUrl?: string; origin: string };
    },
    navigation: NavigationContainerRef,
    sessions: { [topic: string]: WalletConnect2Session } = {},
  ) {
    DevLogger.log(`[MOCK] WC2Manager::constructor()`, {
      web3Wallet,
      deeplinkSessions,
      navigation,
      sessions,
    });

  }

  protected static async initCore(projectId: string | undefined) {
    DevLogger.log(`[MOCK] WC2Manager::initCore()`);
    return;
  }

  public static async init({
    navigation,
    sessions = {},
  }: {
    navigation: NavigationContainerRef;
    sessions?: { [topic: string]: WalletConnect2Session };
  }) {
    DevLogger.log(`[MOCK] WC2Manager::init() `, {
      navigation,
      sessions,
    });
    return;
  }
}

export default WC2Manager;
