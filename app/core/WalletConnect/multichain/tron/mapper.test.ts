import {
  extractTronRawDataHex,
  extractTronType,
  mapRequestInbound,
  mapRequestOutbound,
} from './mapper';

describe('multichain/tron - mapper', () => {
  describe('extractTronRawDataHex', () => {
    it('extracts raw_data_hex, rawDataHex, or nested transaction values', () => {
      expect(extractTronRawDataHex({ raw_data_hex: '0xabc' })).toBe('0xabc');
      expect(extractTronRawDataHex({ rawDataHex: '0xdef' })).toBe('0xdef');
      expect(
        extractTronRawDataHex({
          tx: { transaction: { raw_data_hex: '0x123' } },
        }),
      ).toBe('0x123');
    });
  });

  describe('extractTronType', () => {
    it('extracts top-level or raw_data contract type values', () => {
      expect(extractTronType({ type: 'TransferContract' })).toBe(
        'TransferContract',
      );
      expect(
        extractTronType({
          tx: {
            raw_data: {
              contract: [{ type: 'TriggerSmartContract' }],
            },
          },
        }),
      ).toBe('TriggerSmartContract');
    });
  });

  describe('mapRequestInbound', () => {
    it('maps tron_signMessage to canonical signMessage with a base64 message', () => {
      const result = mapRequestInbound({
        method: 'tron_signMessage',
        params: [{ address: 'TAddress', message: 'hello' }],
      });

      expect(result).toStrictEqual({
        method: 'signMessage',
        params: { address: 'TAddress', message: 'aGVsbG8=' },
      });
    });

    it('omits non-string fields when mapping tron_signMessage', () => {
      const result = mapRequestInbound({
        method: 'tron_signMessage',
        params: [{ address: 42, message: 'hello' }],
      });

      expect(result).toStrictEqual({
        method: 'signMessage',
        params: { message: 'aGVsbG8=' },
      });
    });

    it('maps tron_signTransaction and renames raw_data_hex to rawDataHex', () => {
      const result = mapRequestInbound({
        method: 'tron_signTransaction',
        params: [
          {
            address: 'TAddress',
            transaction: {
              raw_data_hex: '0xabc',
              type: 'TransferContract',
            },
          },
        ],
      });

      expect(result).toStrictEqual({
        method: 'signTransaction',
        params: {
          address: 'TAddress',
          transaction: { rawDataHex: '0xabc', type: 'TransferContract' },
        },
      });
    });

    it('maps tron_signTransaction when params is a single object', () => {
      const result = mapRequestInbound({
        method: 'tron_signTransaction',
        params: {
          address: 'TAddress',
          transaction: {
            raw_data_hex: '0xdef',
            type: 'TriggerSmartContract',
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

    it('extracts type from raw_data.contract[0].type when top-level type is missing', () => {
      const result = mapRequestInbound({
        method: 'tron_signTransaction',
        params: {
          address: 'TAddress',
          tx: {
            raw_data_hex: '0x999',
            raw_data: {
              contract: [{ type: 'TriggerSmartContract' }],
            },
          },
        },
      });

      expect(result).toStrictEqual({
        method: 'signTransaction',
        params: {
          address: 'TAddress',
          transaction: {
            rawDataHex: '0x999',
            type: 'TriggerSmartContract',
          },
        },
      });
    });

    it('omits address and type when missing in input', () => {
      const result = mapRequestInbound({
        method: 'tron_signTransaction',
        params: [{ transaction: { raw_data_hex: '0xabc' } }],
      });

      expect(result).toStrictEqual({
        method: 'signTransaction',
        params: { transaction: { rawDataHex: '0xabc' } },
      });
    });

    it('throws for recognized unsupported Tron methods', () => {
      expect(() =>
        mapRequestInbound({
          method: 'tron_sendTransaction',
          params: [{ transaction: { raw_data_hex: '0xabc' } }],
        }),
      ).toThrow(
        'WalletConnect Tron method tron_sendTransaction is not supported',
      );

      expect(() =>
        mapRequestInbound({
          method: 'tron_getBalance',
          params: [{ address: 'TAddress' }],
        }),
      ).toThrow('WalletConnect Tron method tron_getBalance is not supported');
    });

    it('passes unknown methods through unchanged', () => {
      const input = {
        method: 'tron_someFutureMethod',
        params: [{ foo: 'bar' }],
      };

      expect(mapRequestInbound(input)).toStrictEqual(input);
    });
  });

  describe('mapRequestOutbound', () => {
    it('returns the result unchanged for non tron_signTransaction methods', () => {
      const result = mapRequestOutbound({
        method: 'tron_signMessage',
        params: [{ address: 'T' }],
        result: { signature: '0xsig' },
      });

      expect(result).toStrictEqual({ signature: '0xsig' });
    });

    it('merges signature into the original transaction object for tron_signTransaction', () => {
      const original = { raw_data_hex: '0xabc', visible: false };
      const params = [
        { address: 'TAddr', transaction: { transaction: original } },
      ];

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

    it('keeps an array signature as-is when the snap returns multiple signatures', () => {
      const original = { raw_data_hex: '0xabc' };
      const params = [{ transaction: { transaction: original } }];

      const result = mapRequestOutbound({
        method: 'tron_signTransaction',
        params,
        result: { signature: ['0xsig1', '0xsig2'] },
      });

      expect(result).toStrictEqual({
        raw_data_hex: '0xabc',
        signature: ['0xsig1', '0xsig2'],
      });
    });

    it('returns the snap result unchanged when it has txID or no original transaction', () => {
      const snapResult = { txID: 'tx-123', signature: '0xsig' };

      expect(
        mapRequestOutbound({
          method: 'tron_signTransaction',
          params: [{ transaction: { raw_data_hex: '0xabc' } }],
          result: snapResult,
        }),
      ).toBe(snapResult);

      const signatureOnlyResult = { signature: '0xsig' };

      expect(
        mapRequestOutbound({
          method: 'tron_signTransaction',
          params: [{ address: 'TAddr' }],
          result: signatureOnlyResult,
        }),
      ).toBe(signatureOnlyResult);
    });
  });
});
