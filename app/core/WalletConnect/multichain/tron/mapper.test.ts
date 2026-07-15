import {
  extractTronRawDataHex,
  extractTronType,
  mapSignMessageRequest,
  mapSignMessageResponse,
  mapSignTransactionRequest,
  mapSignTransactionResponse,
} from './mapper';

describe('multichain/tron - mapper', () => {
  describe('extractTronRawDataHex', () => {
    it('extracts raw_data_hex directly on a v1 transaction', () => {
      expect(extractTronRawDataHex({ raw_data_hex: '0xabc' })).toBe('0xabc');
    });

    it('extracts raw_data_hex from a legacy double-wrapped transaction', () => {
      expect(
        extractTronRawDataHex({
          transaction: { raw_data_hex: '0x123' },
        }),
      ).toBe('0x123');
    });

    it('returns undefined when called with undefined', () => {
      expect(extractTronRawDataHex(undefined)).toBeUndefined();
    });
  });

  describe('extractTronType', () => {
    it('extracts the contract type from raw_data.contract[0].type', () => {
      expect(
        extractTronType({
          raw_data: {
            contract: [{ type: 'TriggerSmartContract' }],
          },
        }),
      ).toBe('TriggerSmartContract');
    });

    it('extracts the contract type from a legacy double-wrapped transaction', () => {
      expect(
        extractTronType({
          transaction: {
            raw_data: {
              contract: [{ type: 'TransferContract' }],
            },
          },
        }),
      ).toBe('TransferContract');
    });

    it('returns undefined when no contract type is present', () => {
      expect(extractTronType({})).toBeUndefined();
      expect(extractTronType({ raw_data: { contract: [] } })).toBeUndefined();
    });
  });

  describe('inbound request mappers', () => {
    it('maps tron_signMessage to canonical signMessage with a base64 message', () => {
      const result = mapSignMessageRequest({
        params: { address: 'TAddress', message: 'hello' },
      });

      expect(result).toStrictEqual({
        method: 'signMessage',
        params: { address: 'TAddress', message: 'aGVsbG8=' },
      });
    });

    it('maps tron_signTransaction in the legacy double-wrap format', () => {
      const result = mapSignTransactionRequest({
        params: {
          address: 'TAddress',
          transaction: {
            transaction: {
              raw_data_hex: '0xabc',
              raw_data: { contract: [{ type: 'TriggerSmartContract' }] },
            },
          },
        },
      });

      expect(result).toStrictEqual({
        method: 'signTransaction',
        params: {
          address: 'TAddress',
          transaction: { rawDataHex: '0xabc', type: 'TriggerSmartContract' },
        },
      });
    });

    it('maps tron_signTransaction in the v1 flat format', () => {
      const result = mapSignTransactionRequest({
        params: {
          address: 'TAddress',
          transaction: {
            raw_data_hex: '0xdef',
            raw_data: { contract: [{ type: 'TriggerSmartContract' }] },
          },
        },
      });

      expect(result).toStrictEqual({
        method: 'signTransaction',
        params: {
          address: 'TAddress',
          transaction: { rawDataHex: '0xdef', type: 'TriggerSmartContract' },
        },
      });
    });

    it('omits the contract type when missing in input', () => {
      const result = mapSignTransactionRequest({
        params: { address: 'TAddress', transaction: { raw_data_hex: '0xabc' } },
      });

      expect(result).toStrictEqual({
        method: 'signTransaction',
        params: { address: 'TAddress', transaction: { rawDataHex: '0xabc' } },
      });
    });
  });

  describe('outbound response mappers', () => {
    it('forwards the snap message signature unchanged', () => {
      const result = mapSignMessageResponse({ signature: '0xsig' });

      expect(result).toStrictEqual({ signature: '0xsig' });
    });

    it('merges the signature into the legacy double-wrapped transaction', () => {
      const original = { raw_data_hex: '0xabc', visible: false };
      const params = {
        address: 'TAddr',
        transaction: { transaction: original },
      };

      const result = mapSignTransactionResponse({
        params,
        result: { signature: '0xsig' },
      });

      expect(result).toStrictEqual({
        raw_data_hex: '0xabc',
        visible: false,
        signature: ['0xsig'],
      });
    });

    it('merges the signature into the v1 flat transaction', () => {
      const original = { raw_data_hex: '0xabc', visible: false };
      const params = { address: 'TAddr', transaction: original };

      const result = mapSignTransactionResponse({
        params,
        result: { signature: '0xsig' },
      });

      expect(result).toStrictEqual({
        raw_data_hex: '0xabc',
        visible: false,
        signature: ['0xsig'],
      });
    });
  });
});
