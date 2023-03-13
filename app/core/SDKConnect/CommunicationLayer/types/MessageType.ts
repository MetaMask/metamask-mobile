export enum MessageType {
  // TERMINATE: used to inform the other side that connection is terminating and channel id needs to be changed.
  TERMINATE = 'terminate',
  ANSWER = 'answer',
  OFFER = 'offer',
  CANDIDATE = 'candidate',
  JSONRPC = 'jsonrpc',
  WALLET_INFO = 'wallet_info',
  ORIGINATOR_INFO = 'originator_info',
  PAUSE = 'pause',
  OTP = 'otp',
  /**
   * Used for debugging purpose and check channel validity.
   */
  PING = 'ping',
  // READY is sent when the connection is linked
  READY = 'ready',
}
