import {
  mapSignTransactionRequest,
  mapSignTransactionResponse,
} from './mapper';

describe('multichain/stellar - mapper', () => {
  describe('inbound request mappers', () => {
    it('maps stellar_signXDR to the canonical signTransaction payload', () => {
      expect(
        mapSignTransactionRequest({
          params: { xdr: 'base64-xdr' },
        }),
      ).toStrictEqual({
        method: 'signTransaction',
        params: {
          xdr: 'base64-xdr',
        },
      });
    });
  });

  describe('outbound response mappers', () => {
    it('maps the Snap signedTxXdr to the WalletConnect stellar_signXDR response', () => {
      expect(
        mapSignTransactionResponse({ signedTxXdr: 'signed-base64-xdr' }),
      ).toStrictEqual({ signedXDR: 'signed-base64-xdr' });
    });
  });
});
