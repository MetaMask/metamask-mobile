import {
  ChannelConfig,
  OriginatorInfo,
  StorageManager,
} from '@metamask/sdk-communication-layer';
import DefaultPreference from 'react-native-default-preference';
import Logger from '../../util/Logger';
import AppConstants from '../AppConstants';
import SDKConnect, { ConnectionProps } from './SDKConnect';

export interface SDKSession {
  connectionSettings: ConnectionProps;
  channelConfig?: ChannelConfig;
  originatorInfo?: OriginatorInfo;
}

export interface SDKSessions {
  [chanelId: string]: ConnectionProps;
}

/**
 * Custom implementation of the StorageManager to handle session persistence.
 */
export class SDKStorageManager implements StorageManager {
  private connectionSettings: ConnectionProps;
  private originatorInfo?: OriginatorInfo;
  private channelConfig?: ChannelConfig;

  constructor(connection: ConnectionProps) {
    this.connectionSettings = connection;
  }

  async persistChannelConfig(channelConfig: ChannelConfig): Promise<void> {
    console.debug(
      `SDKStorageManager::persistChannelConfig channelConfig`,
      channelConfig,
    );
    this.channelConfig = channelConfig;
    this.persist();
  }

  async setOriginator(originatorInfo: OriginatorInfo) {
    this.originatorInfo = originatorInfo;
  }

  getOriginator() {
    return this.originatorInfo;
  }

  getChannelConfig() {
    return this.channelConfig;
  }

  async persist() {
    const session = {
      originatorInfo: this.originatorInfo,
      connectionSettings: this.connectionSettings,
      channelConfig: this.channelConfig,
    };
    SDKStorageManager.saveSession(session);
  }

  async getPersistedChannelConfig(
    channelId: string,
  ): Promise<ChannelConfig | undefined> {
    console.debug(`channelId=${channelId}`);
    // const sdkSessions = await SDKStorageManager.getCurrentSessions();
    // return sdkSessions[channelId]?.channelConfig;
    return undefined;
  }

  async terminate(channelId: string): Promise<void> {
    const allSessions = await SDKStorageManager.getCurrentSessions();
    if (allSessions[channelId]) {
      delete allSessions[channelId];
      DefaultPreference.set(
        AppConstants.MM_SDK.SDK_CONNECTIONS,
        JSON.stringify(allSessions),
      );
      SDKConnect.getInstance().setSDKSessions(allSessions);
    }
  }

  public static async getCurrentSessions(): Promise<SDKSessions> {
    try {
      const sdkSessions = await DefaultPreference.get(
        AppConstants.MM_SDK.SDK_CONNECTIONS,
      );
      if (sdkSessions) {
        return JSON.parse(sdkSessions);
      }
    } catch (err) {
      console.warn(`SDKStorageManager::getCurrentSessions error`, err);
    }

    return {};
  }

  public static async reset() {
    console.debug(`SDKStorageManager::reset()`);
    DefaultPreference.clear(AppConstants.MM_SDK.SDK_CONNECTIONS);
  }

  public static async saveSession(session: SDKSession): Promise<void> {
    console.debug(
      `SDKStorageManager::saveSession`,
      JSON.stringify(session, null, 4),
    );

    // const allSessions = await this.getCurrentSessions();
    // const mergedValues = allSessions[session.connectionSettings.id] || {};
    // // Only overwrite existing values to prevent
    // if (session.originatorInfo) {
    //   mergedValues.originatorInfo = session.originatorInfo;
    // }
    // if (session.channelConfig) {
    //   mergedValues.channelConfig = session.channelConfig;
    // }
    // if (session.connectionSettings) {
    //   mergedValues.connectionSettings = session.connectionSettings;
    // }
    // allSessions[session.connectionSettings.id] = mergedValues;
    // DefaultPreference.set(
    //   AppConstants.MM_SDK.SDK_CONNECTIONS,
    //   JSON.stringify(allSessions),
    // );
    // SDKConnect.getInstance().setSDKSessions(allSessions);
    // console.debug(`new sessions stored: `, JSON.stringify(allSessions, null, 4))
  }
}

export default SDKStorageManager;
