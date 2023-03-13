import { ChannelConfig } from './ChannelConfig';

export interface StorageManagerProps {
  debug?: boolean;
  duration?: number;
  storageManager?: StorageManager;
}
export interface StorageManager {
  persistChannelConfig(channelConfig: ChannelConfig): Promise<void>;
  getPersistedChannelConfig(
    channelId: string,
  ): Promise<ChannelConfig | undefined>;
  terminate(channelId: string): Promise<void>;
}
