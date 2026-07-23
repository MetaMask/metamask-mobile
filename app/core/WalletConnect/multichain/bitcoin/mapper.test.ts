import { BtcScope } from '@metamask/keyring-api';
import type { CaipAccountId } from '@metamask/utils';
import {
  mapAccountAddressesRequest,
  mapSendTransferRequest,
  mapSendTransferResponse,
  mapSignMessageRequest,
  mapSignMessageResponse,
  mapSignPsbtRequest,
  mapSignPsbtResponse,
} from './mapper';

const MAINNET_CAIP_ACCOUNT_A = `${BtcScope.Mainnet}:bc1qaddrA` as CaipAccountId;
const MAINNET_CAIP_ACCOUNT_B = `${BtcScope.Mainnet}:bc1qaddrB` as CaipAccountId;

describe('multichain/bitcoin - mapper', () => {
  describe('mapAccountAddressesRequest', () => {
    it('maps CAIP-10 account ids to WalletConnect Bitcoin address objects', () => {
      expect(
        mapAccountAddressesRequest({
          connectedAddresses: [MAINNET_CAIP_ACCOUNT_A, MAINNET_CAIP_ACCOUNT_B],
        }),
      ).toStrictEqual([{ address: 'bc1qaddrA' }, { address: 'bc1qaddrB' }]);
    });
  });

  describe('inbound request mappers', () => {
    it('maps bitcoin_signMessage to the canonical signMessage payload', () => {
      expect(
        mapSignMessageRequest({
          params: {
            account: 'bc1qaddrA',
            message: 'hello world',
            address: 'bc1qaddrA',
            protocol: 'bip322',
          },
        }),
      ).toStrictEqual({
        method: 'signMessage',
        params: {
          message: 'hello world',
        },
      });
    });

    it('maps bitcoin_signPsbt to the canonical signPsbt payload with fill disabled', () => {
      expect(
        mapSignPsbtRequest({
          params: {
            account: 'bc1qaddrA',
            psbt: 'base64-psbt',
            signInputs: [{ address: 'bc1qaddrA', index: 0 }],
            broadcast: true,
          },
        }),
      ).toStrictEqual({
        method: 'signPsbt',
        params: {
          psbt: 'base64-psbt',
          options: {
            fill: false,
            broadcast: true,
          },
        },
      });
    });

    it('defaults broadcast to false when bitcoin_signPsbt omits it', () => {
      expect(
        mapSignPsbtRequest({
          params: {
            account: 'bc1qaddrA',
            psbt: 'base64-psbt',
            signInputs: [],
          },
        }),
      ).toStrictEqual({
        method: 'signPsbt',
        params: {
          psbt: 'base64-psbt',
          options: {
            fill: false,
            broadcast: false,
          },
        },
      });
    });

    it('maps bitcoin_sendTransfer to a single-recipient sendTransfer payload', () => {
      expect(
        mapSendTransferRequest({
          params: {
            account: 'bc1qaddrA',
            recipientAddress: 'bc1qrecipient',
            amount: '10000',
            changeAddress: 'bc1qchange',
            memo: 'deadbeef',
          },
        }),
      ).toStrictEqual({
        method: 'sendTransfer',
        params: {
          recipients: [{ address: 'bc1qrecipient', amount: '10000' }],
        },
      });
    });
  });

  describe('outbound response mappers', () => {
    it('maps the Snap signature and connected account to the signMessage response', () => {
      expect(
        mapSignMessageResponse({
          connectedAddresses: [MAINNET_CAIP_ACCOUNT_A],
          result: { signature: 'hex-signature' },
        }),
      ).toStrictEqual({
        address: 'bc1qaddrA',
        signature: 'hex-signature',
      });
    });

    it('includes txid in the signPsbt response only when broadcast', () => {
      expect(
        mapSignPsbtResponse({ psbt: 'signed-psbt', txid: 'tx-id' }),
      ).toStrictEqual({ psbt: 'signed-psbt', txid: 'tx-id' });

      expect(
        mapSignPsbtResponse({ psbt: 'signed-psbt', txid: null }),
      ).toStrictEqual({ psbt: 'signed-psbt' });
    });

    it('maps the Snap txid to the sendTransfer response', () => {
      expect(mapSendTransferResponse({ txid: 'tx-id' })).toStrictEqual({
        txid: 'tx-id',
      });
    });
  });
});
