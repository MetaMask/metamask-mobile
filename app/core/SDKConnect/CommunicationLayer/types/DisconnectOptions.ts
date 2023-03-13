export interface DisconnectOptions {
  terminate?: boolean;
  channelId?: string;
  /**
   * Flag used only on terminated disconnection to send a TERMINATE message on the channel.
   * Default to true.
   */
  sendMessage?: boolean;
}
