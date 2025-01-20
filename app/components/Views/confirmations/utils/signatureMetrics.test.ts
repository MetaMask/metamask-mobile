import { Hex } from '@metamask/utils';
import { getSignatureDecodingEventProps } from './signatureMetrics';
import { DecodingDataChangeType, SignatureRequest, SignatureRequestStatus, SignatureRequestType } from '@metamask/signature-controller';

const mockSignatureRequest = {
  id: 'fb2029e1-b0ab-11ef-9227-05a11087c334',
  chainId: '0x1' as Hex,
  type: SignatureRequestType.TypedSign,
  messageParams: {
    data: '{"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Permit":[{"name":"owner","type":"address"},{"name":"spender","type":"address"},{"name":"value","type":"uint256"},{"name":"nonce","type":"uint256"},{"name":"deadline","type":"uint256"}]},"primaryType":"Permit","domain":{"name":"MyToken","version":"1","verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC","chainId":1},"message":{"owner":"0x935e73edb9ff52e23bac7f7e043a1ecd06d05477","spender":"0x5B38Da6a701c568545dCfcB03FcB875f56beddC4","value":3000,"nonce":0,"deadline":50000000000}}',
    from: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
    version: 'V4',
    requestId: 14,
    origin: 'https://metamask.github.io',
    metamaskId: 'fb2029e0-b0ab-11ef-9227-05a11087c334',
  },
  networkClientId: '1',
  status: SignatureRequestStatus.Unapproved,
  time: 1733143817088
} satisfies SignatureRequest;

describe('signatureMetrics', () => {
  describe('getSignatureDecodingEventProps', () => {
    it('returns empty object when decoding API is disabled', () => {
      const mockRequest = {
        ...mockSignatureRequest,
        decodingData: {
          stateChanges: [],
          error: undefined,
        },
      } satisfies SignatureRequest;

      const result = getSignatureDecodingEventProps(mockRequest, false);
      expect(result).toEqual({});
    });

    it('returns empty object when no decodingData is present', () => {
      const mockRequest = {} as SignatureRequest;
      const result = getSignatureDecodingEventProps(mockRequest, true);
      expect(result).toEqual({});
    });

    it('returns no change response when stateChanges are empty', () => {
      const mockRequest = {
        ...mockSignatureRequest,
        decodingData: {
          stateChanges: [],
          error: undefined,
        },
        decodingLoading: false,
      } satisfies SignatureRequest;

      const result = getSignatureDecodingEventProps(mockRequest, true);
      expect(result).toEqual({
        decoding_change_types: [],
        decoding_description: null,
        decoding_response: 'NO_CHANGE',
      });
    });

    it('returns loading response when decodingLoading is true', () => {
      const mockRequest = {
        ...mockSignatureRequest,
        decodingData: {
          stateChanges: [],
          error: undefined,
        },
        decodingLoading: true,
      } satisfies SignatureRequest;

      const result = getSignatureDecodingEventProps(mockRequest, true);
      expect(result).toEqual({
        decoding_change_types: [],
        decoding_description: null,
        decoding_response: 'decoding_in_progress',
      });
    });

    it('returns error response when error exists', () => {
      const mockRequest = {
        ...mockSignatureRequest,
        decodingData: {
          stateChanges: [],
          error: {
            type: 'ERROR_TYPE',
            message: 'Error message',
          },
        },
        decodingLoading: false,
      } satisfies SignatureRequest;

      const result = getSignatureDecodingEventProps(mockRequest, true);
      expect(result).toEqual({
        decoding_change_types: [],
        decoding_description: 'Error message',
        decoding_response: 'ERROR_TYPE',
      });
    });

    it('returns change response when stateChanges exist', () => {
      const mockRequest = {
        ...mockSignatureRequest,
        decodingData: {
          stateChanges: [
            { changeType: DecodingDataChangeType.Approve, assetType: 'ERC20', address: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477', amount: '12345', contractAddress: '0x6b175474e89094c44da98b954eedeac495271d0f' },
            { changeType: DecodingDataChangeType.Transfer, assetType: 'ERC20', address: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477', amount: '12345', contractAddress: '0x6b175474e89094c44da98b954eedeac495271d0f' },
          ],
          error: undefined,
        },
        decodingLoading: false,
      } satisfies SignatureRequest;

      const result = getSignatureDecodingEventProps(mockRequest, true);
      expect(result).toEqual({
        decoding_change_types: ['APPROVE', 'TRANSFER'],
        decoding_description: null,
        decoding_response: 'CHANGE',
      });
    });
  });
});
