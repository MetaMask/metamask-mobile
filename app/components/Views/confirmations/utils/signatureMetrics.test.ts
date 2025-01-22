import { getSignatureDecodingEventProps } from './signatureMetrics';
import { DecodingDataChangeType } from '@metamask/signature-controller';

describe('signatureMetrics', () => {
  describe('getSignatureDecodingEventProps', () => {
    it('returns empty object when decoding API is disabled', () => {
      const mockDecodingData = {
        stateChanges: [],
        error: undefined,
      };

      const result = getSignatureDecodingEventProps(
        mockDecodingData,
        false,
        false,
      );
      expect(result).toEqual({});
    });

    it('returns empty object when no decodingData is present', () => {
      const result = getSignatureDecodingEventProps(undefined, false, true);
      expect(result).toEqual({});
    });

    it('returns no change response when stateChanges are empty', () => {
      const mockDecodingData = {
        stateChanges: [],
        error: undefined,
      };

      const result = getSignatureDecodingEventProps(
        mockDecodingData,
        false,
        true,
      );
      expect(result).toEqual({
        decoding_change_types: [],
        decoding_description: null,
        decoding_response: 'NO_CHANGE',
      });
    });

    it('returns loading response when decodingLoading is true', () => {
      const mockDecodingData = {
        stateChanges: [],
        error: undefined,
      };

      const result = getSignatureDecodingEventProps(
        mockDecodingData,
        true,
        true,
      );
      expect(result).toEqual({
        decoding_change_types: [],
        decoding_description: null,
        decoding_response: 'decoding_in_progress',
      });
    });

    it('returns error response when error exists', () => {
      const mockDecodingData = {
        stateChanges: [],
        error: {
          type: 'ERROR_TYPE',
          message: 'Error message',
        },
      };

      const result = getSignatureDecodingEventProps(
        mockDecodingData,
        false,
        true,
      );
      expect(result).toEqual({
        decoding_change_types: [],
        decoding_description: 'Error message',
        decoding_response: 'ERROR_TYPE',
      });
    });

    it('returns change response when stateChanges exist', () => {
      const mockDecodingData = {
        stateChanges: [
          {
            changeType: DecodingDataChangeType.Approve,
            assetType: 'ERC20',
            address: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
            amount: '12345',
            contractAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
          },
          {
            changeType: DecodingDataChangeType.Transfer,
            assetType: 'ERC20',
            address: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
            amount: '12345',
            contractAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
          },
        ],
        error: undefined,
      };

      const result = getSignatureDecodingEventProps(
        mockDecodingData,
        false,
        true,
      );
      expect(result).toEqual({
        decoding_change_types: ['APPROVE', 'TRANSFER'],
        decoding_description: null,
        decoding_response: 'CHANGE',
      });
    });
  });
});
