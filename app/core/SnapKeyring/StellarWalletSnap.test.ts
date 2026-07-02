///: BEGIN:ONLY_INCLUDE_IF(stellar)
import { HandlerType } from '@metamask/snaps-utils';
import type { JsonRpcRequest } from '@metamask/utils';
import {
  STELLAR_WALLET_SNAP_ID,
  StellarWalletSnapSender,
} from './StellarWalletSnap';

jest.mock('../Engine', () => ({
  controllerMessenger: {},
}));

jest.mock('../Snaps/utils', () => ({
  handleSnapRequest: jest.fn().mockResolvedValue({ result: 'ok' }),
}));

describe('StellarWalletSnap', () => {
  it('exposes the canonical stellar wallet snap id', () => {
    expect(STELLAR_WALLET_SNAP_ID).toBe('npm:@metamask/stellar-wallet-snap');
  });

  it('routes keyring requests through handleSnapRequest', async () => {
    const { handleSnapRequest } = jest.requireMock('../Snaps/utils');
    const sender = new StellarWalletSnapSender();
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'ping',
    };

    await sender.send(request);

    expect(handleSnapRequest).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        origin: 'metamask',
        snapId: STELLAR_WALLET_SNAP_ID,
        handler: HandlerType.OnKeyringRequest,
        request,
      }),
    );
  });
});
///: END:ONLY_INCLUDE_IF
