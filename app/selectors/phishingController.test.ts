import {
  PhishingControllerState,
  RecommendedAction,
} from '@metamask/phishing-controller';
import { RootState } from '../reducers';
import {
  selectMultipleTokenScanResults,
  selectMultipleAddressScanResults,
  selectUrlScanResult,
} from './phishingController';

describe('PhishingController Selectors', () => {
  const createMockRootState = (
    phishingControllerState: Partial<PhishingControllerState> = {},
  ): RootState =>
    ({
      engine: {
        backgroundState: {
          PhishingController: phishingControllerState,
        },
      },
    }) as RootState;

  describe('selectMultipleTokenScanResults', () => {
    it('returns the scan result for one token', () => {
      const state = createMockRootState({
        tokenScanCache: {
          '0x1:0x1234567890123456789012345678901234567890': {
            data: {
              // @ts-expect-error - TokenScanResultType is not exported in PhishingController
              result_type: 'Malicious',
            },
          },
        },
      });

      const result = selectMultipleTokenScanResults(state, {
        tokens: [
          {
            address: '0x1234567890123456789012345678901234567890',
            chainId: '0x1',
          },
        ],
      });

      expect(result).toEqual([
        {
          address: '0x1234567890123456789012345678901234567890',
          chainId: '0x1',
          scanResult: {
            result_type: 'Malicious',
          },
        },
      ]);
    });

    it('returns multiple scan results for multiple tokens', () => {
      const state = createMockRootState({
        tokenScanCache: {
          '0x1:0x1234567890123456789012345678901234567890': {
            data: {
              // @ts-expect-error - TokenScanResultType is not exported in PhishingController
              result_type: 'Malicious',
            },
          },
          '0x1:0x1234567890123456789012345678901234567891': {
            data: {
              // @ts-expect-error - TokenScanResultType is not exported in PhishingController
              result_type: 'Malicious',
            },
          },
        },
      });

      const result = selectMultipleTokenScanResults(state, {
        tokens: [
          {
            address: '0x1234567890123456789012345678901234567890',
            chainId: '0x1',
          },
          {
            address: '0x1234567890123456789012345678901234567891',
            chainId: '0x1',
          },
        ],
      });

      expect(result).toEqual([
        {
          address: '0x1234567890123456789012345678901234567890',
          chainId: '0x1',
          scanResult: {
            result_type: 'Malicious',
          },
        },
        {
          address: '0x1234567890123456789012345678901234567891',
          chainId: '0x1',
          scanResult: {
            result_type: 'Malicious',
          },
        },
      ]);
    });

    it('returns an empty array if no tokens are provided', () => {
      const state = createMockRootState();
      const result = selectMultipleTokenScanResults(state, { tokens: [] });
      expect(result).toEqual([]);
    });

    it('returns an empty array if no scan results are found', () => {
      const state = createMockRootState();
      const result = selectMultipleTokenScanResults(state, {
        tokens: [
          {
            address: '0x1234567890123456789012345678901234567890',
            chainId: '0x1',
          },
        ],
      });
      expect(result).toEqual([
        {
          address: '0x1234567890123456789012345678901234567890',
          chainId: '0x1',
          scanResult: undefined,
        },
      ]);
    });
  });

  describe('selectMultipleAddressScanResults', () => {
    it('returns scan result for one address', () => {
      const state = createMockRootState({
        addressScanCache: {
          '0x1:0xabcdef1234567890abcdef1234567890abcdef12': {
            data: {
              // @ts-expect-error - AddressScanResultType is not exported in PhishingController
              result_type: 'Malicious',
            },
          },
        },
      });

      const result = selectMultipleAddressScanResults(state, {
        addresses: [
          {
            address: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
            chainId: '0x1',
          },
        ],
      });

      expect(result).toEqual([
        {
          address: '0xabcdef1234567890abcdef1234567890abcdef12',
          chainId: '0x1',
          scanResult: {
            result_type: 'Malicious',
          },
        },
      ]);
    });

    it('returns multiple scan results for multiple addresses', () => {
      const state = createMockRootState({
        addressScanCache: {
          '0x1:0xabcdef1234567890abcdef1234567890abcdef12': {
            data: {
              // @ts-expect-error - AddressScanResultType is not exported in PhishingController
              result_type: 'Malicious',
            },
          },
          '0x1:0x1234567890abcdef1234567890abcdef12345678': {
            data: {
              // @ts-expect-error - AddressScanResultType is not exported in PhishingController
              result_type: 'Warning',
            },
          },
        },
      });

      const result = selectMultipleAddressScanResults(state, {
        addresses: [
          {
            address: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
            chainId: '0x1',
          },
          {
            address: '0x1234567890AbCdEf1234567890AbCdEf12345678',
            chainId: '0x1',
          },
        ],
      });

      expect(result).toEqual([
        {
          address: '0xabcdef1234567890abcdef1234567890abcdef12',
          chainId: '0x1',
          scanResult: {
            result_type: 'Malicious',
          },
        },
        {
          address: '0x1234567890abcdef1234567890abcdef12345678',
          chainId: '0x1',
          scanResult: {
            result_type: 'Warning',
          },
        },
      ]);
    });

    it('returns empty array when no addresses provided', () => {
      const state = createMockRootState();

      const result = selectMultipleAddressScanResults(state, { addresses: [] });

      expect(result).toEqual([]);
    });

    it('returns result with undefined scanResult when address not in cache', () => {
      const state = createMockRootState({
        addressScanCache: {},
      });

      const result = selectMultipleAddressScanResults(state, {
        addresses: [
          {
            address: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
            chainId: '0x1',
          },
        ],
      });

      expect(result).toEqual([
        {
          address: '0xabcdef1234567890abcdef1234567890abcdef12',
          chainId: '0x1',
          scanResult: undefined,
        },
      ]);
    });

    it('returns result with undefined scanResult for addresses without address or chainId', () => {
      const state = createMockRootState({
        addressScanCache: {
          '0x1:0xabcdef1234567890abcdef1234567890abcdef12': {
            data: {
              // @ts-expect-error - AddressScanResultType is not exported in PhishingController
              result_type: 'Malicious',
            },
          },
        },
      });

      const result = selectMultipleAddressScanResults(state, {
        addresses: [
          { address: '', chainId: '0x1' },
          {
            address: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
            chainId: '',
          },
          {
            address: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
            chainId: '0x1',
          },
        ],
      });

      expect(result).toEqual([
        {
          address: '',
          chainId: '0x1',
          scanResult: undefined,
        },
        {
          address: '0xabcdef1234567890abcdef1234567890abcdef12',
          chainId: '',
          scanResult: undefined,
        },
        {
          address: '0xabcdef1234567890abcdef1234567890abcdef12',
          chainId: '0x1',
          scanResult: {
            result_type: 'Malicious',
          },
        },
      ]);
    });
  });

  describe('selectUrlScanResult', () => {
    it('returns scan result for hostname', () => {
      const state = createMockRootState({
        urlScanCache: {
          'malicious-site.com': {
            data: {
              hostname: 'malicious-site.com',
              // @ts-expect-error - RecommendedAction is not exported in PhishingController
              recommendedAction: 'Block',
            },
          },
        },
      });

      const result = selectUrlScanResult(state, {
        hostname: 'malicious-site.com',
      });

      expect(result).toEqual({
        hostname: 'malicious-site.com',
        scanResult: {
          hostname: 'malicious-site.com',
          recommendedAction: 'Block',
        },
      });
    });

    it('returns null when hostname is undefined', () => {
      const state = createMockRootState();

      const result = selectUrlScanResult(state, { hostname: undefined });

      expect(result).toBeNull();
    });

    it('returns result with undefined scanResult when hostname not in cache', () => {
      const state = createMockRootState({
        urlScanCache: {},
      });

      const result = selectUrlScanResult(state, {
        hostname: 'unknown-site.com',
      });

      expect(result).toEqual({
        hostname: 'unknown-site.com',
        scanResult: undefined,
      });
    });

    it('returns scan result with Warning recommendedAction', () => {
      const state = createMockRootState({
        urlScanCache: {
          'suspicious-site.com': {
            data: {
              hostname: 'suspicious-site.com',
              recommendedAction: RecommendedAction.Warn,
            },
            timestamp: Date.now(),
          },
        },
      });

      const result = selectUrlScanResult(state, {
        hostname: 'suspicious-site.com',
      });

      expect(result).toEqual({
        hostname: 'suspicious-site.com',
        scanResult: {
          hostname: 'suspicious-site.com',
          recommendedAction: 'WARN',
        },
      });
    });
  });
});
