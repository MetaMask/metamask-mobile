import {
  extractTronRawDataHex,
  extractTronType,
  mapRequestInbound,
  mapRequestOutbound,
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

  describe('mapRequestInbound', () => {
    it('maps tron_signMessage to canonical signMessage with a base64 message', () => {
      const result = mapRequestInbound({
        method: 'tron_signMessage',
        params: { address: 'TAddress', message: 'hello' },
      });

      expect(result).toStrictEqual({
        method: 'signMessage',
        params: { address: 'TAddress', message: 'aGVsbG8=' },
      });
    });

    it('omits non-string fields when mapping tron_signMessage', () => {
      const result = mapRequestInbound({
        method: 'tron_signMessage',
        params: { address: 42, message: 'hello' },
      });

      expect(result).toStrictEqual({
        method: 'signMessage',
        params: { message: 'aGVsbG8=' },
      });
    });

    it('maps tron_signTransaction in the legacy double-wrap format', () => {
      const result = mapRequestInbound({
        method: 'tron_signTransaction',
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
      const result = mapRequestInbound({
        method: 'tron_signTransaction',
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

    it('omits address and type when missing in input', () => {
      const result = mapRequestInbound({
        method: 'tron_signTransaction',
        params: { transaction: { raw_data_hex: '0xabc' } },
      });

      expect(result).toStrictEqual({
        method: 'signTransaction',
        params: { transaction: { rawDataHex: '0xabc' } },
      });
    });

    it('throws for any non-supported Tron method', () => {
      expect(() =>
        mapRequestInbound({
          method: 'tron_sendTransaction',
          params: { transaction: { raw_data_hex: '0xabc' } },
        }),
      ).toThrow(
        'WalletConnect Tron method tron_sendTransaction is not supported',
      );

      expect(() =>
        mapRequestInbound({
          method: 'tron_someFutureMethod',
          params: { foo: 'bar' },
        }),
      ).toThrow(
        'WalletConnect Tron method tron_someFutureMethod is not supported',
      );
    });
  });

  describe('mapRequestOutbound', () => {
    it('returns the result unchanged for non tron_signTransaction methods', () => {
      const result = mapRequestOutbound({
        method: 'tron_signMessage',
        params: { address: 'T', message: 'hello' },
        result: { signature: '0xsig' },
      });

      expect(result).toStrictEqual({ signature: '0xsig' });
    });

    it('merges the signature into the legacy double-wrapped transaction', () => {
      const original = { raw_data_hex: '0xabc', visible: false };
      const params = {
        address: 'TAddr',
        transaction: { transaction: original },
      };

      const result = mapRequestOutbound({
        method: 'tron_signTransaction',
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

      const result = mapRequestOutbound({
        method: 'tron_signTransaction',
        params,
        result: { signature: '0xsig' },
      });

      expect(result).toStrictEqual({
        raw_data_hex: '0xabc',
        visible: false,
        signature: ['0xsig'],
      });
    });

    it('returns the snap result unchanged when no original transaction is present', () => {
      const snapResult = { signature: '0xsig' };

      expect(
        mapRequestOutbound({
          method: 'tron_signTransaction',
          params: { address: 'TAddr' },
          result: snapResult,
        }),
      ).toBe(snapResult);
    });

    it('returns the snap result unchanged when the signature is missing', () => {
      const snapResult = {};

      expect(
        mapRequestOutbound({
          method: 'tron_signTransaction',
          params: { transaction: { raw_data_hex: '0xabc' } },
          result: snapResult,
        }),
      ).toBe(snapResult);
    });
  });
});
