import { adaptWalletConnectRequestForSnap } from './multichain-connectors';
import { adaptWalletConnectRequestForSnap as adaptTronRequestForSnap } from './multichain-connectors/tron';
import {
  getCompatibleTronCaipChainIdsForWalletConnect,
  normalizeCaipChainIdInboundForWalletConnect,
  normalizeCaipChainIdOutboundForWalletConnect,
} from './wc-utils';

describe('WalletConnectMultiChainConnector', () => {
  describe('adaptWalletConnectRequestForSnap', () => {
    it('maps tron_signMessage to canonical signMessage', () => {
      const result = adaptWalletConnectRequestForSnap({
        method: 'tron_signMessage',
        params: [{ address: 'TAddress', message: '0x1234' }],
      });

      expect(result).toStrictEqual({
        method: 'signMessage',
        params: { address: 'TAddress', message: '0x1234' },
      });
    });

    it('maps tron_signTransaction to canonical signTransaction', () => {
      const result = adaptWalletConnectRequestForSnap({
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

    it('maps tron_signTransaction when params is an object', () => {
      const result = adaptWalletConnectRequestForSnap({
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
          transaction: {
            rawDataHex: '0xdef',
            type: 'TriggerSmartContract',
          },
        },
      });
    });

    it('extracts raw_data_hex from tx object shape', () => {
      const result = adaptWalletConnectRequestForSnap({
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

    it('omits undefined fields in mapped tron_signTransaction params', () => {
      const result = adaptWalletConnectRequestForSnap({
        method: 'tron_signTransaction',
        params: [
          {
            transaction: {
              raw_data_hex: '0xabc',
            },
          },
        ],
      });

      expect(result).toStrictEqual({
        method: 'signTransaction',
        params: {
          transaction: { rawDataHex: '0xabc' },
        },
      });
    });

    it('passes through non-Tron methods unchanged', () => {
      const result = adaptWalletConnectRequestForSnap({
        method: 'eth_sign',
        params: ['0x1', '0x2'],
      });

      expect(result).toStrictEqual({
        method: 'eth_sign',
        params: ['0x1', '0x2'],
      });
    });

    it('maps tron_sendTransaction to canonical sendTransaction', () => {
      const result = adaptTronRequestForSnap({
        method: 'tron_sendTransaction',
        params: [{ transaction: { raw_data_hex: '0xabc' } }],
      });

      expect(result).toStrictEqual({
        method: 'sendTransaction',
        params: [{ transaction: { raw_data_hex: '0xabc' } }],
      });
    });

    it('maps tron_getBalance to canonical getBalance', () => {
      const result = adaptTronRequestForSnap({
        method: 'tron_getBalance',
        params: [{ address: 'TAddress' }],
      });

      expect(result).toStrictEqual({
        method: 'getBalance',
        params: [{ address: 'TAddress' }],
      });
    });
  });

  describe('tron CAIP chain normalization', () => {
    it('normalizes outbound tron chain id to hex reference', () => {
      expect(
        normalizeCaipChainIdOutboundForWalletConnect('tron:728126428'),
      ).toBe('tron:0x2b6653dc');
    });

    it('normalizes inbound tron chain id to decimal reference', () => {
      expect(
        normalizeCaipChainIdInboundForWalletConnect('tron:0x2b6653dc'),
      ).toBe('tron:728126428');
    });

    it('returns both decimal and hex tron references', () => {
      expect(
        getCompatibleTronCaipChainIdsForWalletConnect('tron:728126428'),
      ).toStrictEqual(['tron:728126428', 'tron:0x2b6653dc']);
      expect(
        getCompatibleTronCaipChainIdsForWalletConnect('tron:0x2b6653dc'),
      ).toStrictEqual(['tron:0x2b6653dc', 'tron:728126428']);
    });
  });
});
