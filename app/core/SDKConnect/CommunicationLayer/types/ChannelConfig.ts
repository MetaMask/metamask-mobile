export interface ChannelConfig {
  channelId: string;
  validUntil: number;
  /**
   * lastActive: ms value of the last time connection was ready CLIENTS_READY event.
   * */
  lastActive?: number;
}
