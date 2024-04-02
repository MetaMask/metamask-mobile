import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';
import DevLogger from '../utils/DevLogger';

export default class DeeplinkProtocolService {
  private bridgeByClientId: { [clientId: string]: BackgroundBridge } = {};

  public handleConnection(_: {
    dappPublicKey: string;
    url: string;
    scheme: string;
    channelId: string;
  }) {
    // TODO implement deeplink callback
    DevLogger.log('handleDepplinkProtocol:: ', _);
    // copy logic from AndroidService.setupOnClientsConnectedListener

    // Check if existing previous connection for this channelId
    // If not, create a new connection, otherwise update the connection
    // - check permissions
    // - setup background bridge
    // - send message response to the dapp
    // link to the RPCManager
  }

  public handleMessage(_: {
    dappPublicKey: string;
    url: string;
    scheme: string;
    message: string;
    channelId: string;
  }) {
    DevLogger.log('handleDepplinkProtocol:: ', _);
    // TODO
  }
}
