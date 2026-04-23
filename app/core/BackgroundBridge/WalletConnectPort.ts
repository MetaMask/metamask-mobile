import Engine from '../Engine';
import AppConstants from '../AppConstants';
import { selectEvmChainId } from '../../selectors/networkController';
import { store } from '../../store';

// eslint-disable-next-line import-x/no-nodejs-modules, import-x/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const EventEmitter = require('events').EventEmitter;

const { NOTIFICATION_NAMES } = AppConstants;

/**
 * Port adapter used **only for EVM (EIP-155)** WalletConnect sessions.
 *
 * It bridges EIP-1193 notifications (`chainChanged`, `accountsChanged`) from
 * BackgroundBridge's engine stream to {@link WalletConnect2Session.updateSession},
 * and routes JSON-RPC results/errors back to the dapp.
 *
 * Non-EVM chains (Solana, Tron, …) do not flow through this port. Their
 * account-change propagation is handled directly by
 * {@link WalletConnect2Session} which subscribes to
 * `AccountsController:selectedAccountChange` and rebuilds the session
 * namespaces when a non-EVM account is selected.
 */
class WalletConnectPort extends EventEmitter {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(wcRequestActions: any) {
    super();
    this._wcRequestActions = wcRequestActions;
  }

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postMessage = (msg: any) => {
    try {
      if (msg?.data?.method === NOTIFICATION_NAMES.chainChanged) {
        const { internalAccounts } = Engine.context.AccountsController.state;
        const selectedAddress =
          internalAccounts.accounts[internalAccounts.selectedAccount]?.address;
        this._wcRequestActions?.updateSession?.({
          chainId: parseInt(msg.data.params.chainId, 16),
          accounts: [selectedAddress],
        });
      } else if (msg?.data?.method === NOTIFICATION_NAMES.accountsChanged) {
        const chainId = selectEvmChainId(store.getState());
        this._wcRequestActions?.updateSession?.({
          chainId: parseInt(chainId),
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
