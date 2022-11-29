import Engine from '../Engine';
import AppConstants from '../AppConstants';

// eslint-disable-next-line import/no-nodejs-modules, import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const EventEmitter = require('events').EventEmitter;

const { NOTIFICATION_NAMES } = AppConstants;

class WalletConnectPort extends EventEmitter {
  constructor(wcRequestActions: any) {
    super();
    this._wcRequestActions = wcRequestActions;
  }

  postMessage = (msg: any) => {
    try {
      if (msg?.data?.method === NOTIFICATION_NAMES.chainChanged) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const { selectedAddress } = Engine.datamodel.flatState;
        this._wcRequestActions?.updateSession?.({
          chainId: parseInt(msg.data.params.chainId, 16),
          accounts: [selectedAddress],
        });
      } else if (msg?.data?.method === NOTIFICATION_NAMES.accountsChanged) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const chainId = Engine.context.NetworkController.state.provider.chainId;
        this._wcRequestActions?.updateSession?.({
          chainId: parseInt(chainId, 10),
          accounts: msg.data.params,
        });
      } else if (msg?.data?.method === NOTIFICATION_NAMES.unlockStateChanged) {
        // WC DOESN'T NEED THIS EVENT
      } else if (msg?.data?.error) {
        this._wcRequestActions?.rejectRequest?.({
          id: msg.data.id,
          error: msg.data.error,
        });
      } else {
        this._wcRequestActions?.approveRequest?.({
          id: msg.data.id,
          result: msg.data.result,
        });
      }
    } catch (e) {
      console.warn(e);
    }
  };
}

export default WalletConnectPort;
