import { NavigationContainerRef } from '@react-navigation/native';
import Client from '@walletconnect/se-sdk';
import DevLogger from '../SDKConnect/utils/DevLogger';

export class WC2Manager {
  private constructor(
    web3Wallet: Client,
    deeplinkSessions: {
      [topic: string]: { redirectUrl?: string; origin: string };
    },
    navigation: NavigationContainerRef,
  ) {
    DevLogger.log(`[MOCK] WC2Manager::constructor()`, {
      web3Wallet,
      deeplinkSessions,
      navigation,
    });
  }

  public static async init({
    navigation,
  }: {
    navigation: NavigationContainerRef;
  }) {
    DevLogger.log(`[MOCK] WC2Manager::init()`, {
      navigation,
    });
    return;
  }
}

export default WC2Manager;
