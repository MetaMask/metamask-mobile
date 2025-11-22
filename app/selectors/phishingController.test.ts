import { PhishingControllerState } from '@metamask/phishing-controller';
import { RootState } from '../reducers';
import { selectMultipleTokenScanResults } from './phishingController';

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
});
