export interface CommunicationLayerLoggingOptions {
  eciesLayer?: boolean;
  keyExchangeLayer?: boolean;
  serviceLayer?: boolean;
  remoteLayer?: boolean;
  // logger?: (_msg: string) => void;
}
