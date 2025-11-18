import { PhishingControllerState } from '@metamask/phishing-controller';
import { RootState } from '../reducers';
import {
  selectMultipleTokenScanResults,
  selectTokenScanResult,
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

  describe('selectTokenScanResult', () => {
    it('returns malicious scan result if it exists as malicious in the cache', () => {
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
      const result = selectTokenScanResult(state, {
        tokenAddress: '0x1234567890123456789012345678901234567890',
        chainId: '0x1',
      });
      expect(result).toEqual({
        result_type: 'Malicious',
      });
    });

    it('returns undefined scan result if chainId is not provided', () => {
      const state = createMockRootState({
        tokenScanCache: {
          '0x1:0x1234567890123456789012345678901234567890': {
            data: {
              // @ts-expect-error - TokenScanResultType is not exported in PhishingController
              result_type: 'Malicious',
            },
            timestamp: 1731619200,
          },
        },
      });
      const result = selectTokenScanResult(state, {
        tokenAddress: '0x1234567890123456789012345678901234567890',
        chainId: '',
      });
      expect(result).toBeUndefined();
    });

    it('returns undefined if token address is not provided', () => {
      const state = createMockRootState({
        tokenScanCache: {
          '0x1:0x1234567890123456789012345678901234567890': {
            data: {
              // @ts-expect-error - TokenScanResultType is not exported in PhishingController
              result_type: 'Malicious',
            },
            timestamp: 1731619200,
          },
        },
      });
      const result = selectTokenScanResult(state, {
        tokenAddress: '',
        chainId: '',
      });
      expect(result).toBeUndefined();
    });

    it('returns undefined if there is no matching entry in the cache', () => {
      const state = createMockRootState();
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const chainId = '0x1';
      const result = selectTokenScanResult(state, { tokenAddress, chainId });
      expect(result).toBeUndefined();
    });
  });

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
});
