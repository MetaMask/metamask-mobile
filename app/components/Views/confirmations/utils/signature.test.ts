import {
  parseSignTypedData,
  isRecognizedPermit,
  isTypedSignV3V4Request,
  isRecognizedOrder,
  sanitizeParsedMessage,
  parseAndSanitizeSignTypedData,
  parseSignTypedDataFromSignatureRequest,
} from './signature';
import {
  PRIMARY_TYPES_ORDER,
  PRIMARY_TYPES_PERMIT,
} from '../constants/signatures';
import {
  SignatureRequest,
  SignatureRequestType,
} from '@metamask/signature-controller';
import {
  mockTypedSignV3Message,
  personalSignSignatureRequest,
  typedSignV1SignatureRequest,
  typedSignV3SignatureRequest,
  typedSignV4SignatureRequest,
} from '../../../../util/test/confirm-data-helpers';

const mockExpectedSanitizedTypedSignV3Message = {
  value: {
    from: {
      value: {
        name: { value: 'Cow', type: 'string' },
        wallet: {
          value: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
          type: 'address',
        },
      },
      type: 'Person',
    },
    to: {
      value: {
        name: { value: 'Bob', type: 'string' },
        wallet: {
          value: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
          type: 'address',
        },
      },
      type: 'Person',
    },
    contents: { value: 'Hello, Bob!', type: 'string' },
  },
  type: 'Mail',
};

describe('Signature Utils', () => {
  describe('parseSignTypedData', () => {
    it('parses a typed data message correctly', () => {
      const data = JSON.stringify({
        message: {
          value: '123',
        },
      });
      const result = parseSignTypedData(data);
      expect(result).toEqual({
        message: {
          value: '123',
        },
      });
    });

    it('parses message.value as a string', () => {
      const result = parseSignTypedData(
        '{"test": "dummy", "message": { "value": 3000123} }',
      );
      expect(result.message.value).toBe('3000123');
    });

    it('handles large message values. This prevents native JS number coercion when the value is greater than Number.MAX_SAFE_INTEGER.', () => {
      const largeValue = '123456789012345678901234567890';
      const data = JSON.stringify({
        message: {
          value: largeValue,
        },
      });
      const result = parseSignTypedData(data);
      expect(result.message.value).toBe(largeValue);
    });

    it('throws an error for invalid typedDataMessage', () => {
      expect(() => {
        parseSignTypedData('');
      }).toThrow(new Error('Unexpected end of JSON input'));
    });
  });

  describe('isRecognizedPermit', () => {
    it('returns true for recognized permit types', () => {
      const mockRequest: SignatureRequest = {
        messageParams: {
          data: JSON.stringify({
            primaryType: PRIMARY_TYPES_PERMIT[0],
          }),
          version: 'V3',
        },
        type: SignatureRequestType.TypedSign,
      } as SignatureRequest;

      expect(isRecognizedPermit(mockRequest)).toBe(true);
    });

    it('returns false for unrecognized permit types', () => {
      const mockRequest: SignatureRequest = {
        messageParams: {
          data: JSON.stringify({
            primaryType: 'UnrecognizedType',
          }),
          version: 'V3',
        },
        type: SignatureRequestType.TypedSign,
      } as SignatureRequest;

      expect(isRecognizedPermit(mockRequest)).toBe(false);
    });

    it('returns false for typed sign V1 request', () => {
      expect(isRecognizedPermit(typedSignV1SignatureRequest)).toBe(false);
      expect(isRecognizedPermit(personalSignSignatureRequest)).toBe(false);
    });
  });

  describe('isRecognizedOrder', () => {
    it('returns true for recognized order types', () => {
      const mockRequest: SignatureRequest = {
        messageParams: {
          data: JSON.stringify({
            primaryType: PRIMARY_TYPES_ORDER[0],
          }),
          version: 'V3',
        },
        type: SignatureRequestType.TypedSign,
      } as SignatureRequest;

      expect(isRecognizedOrder(mockRequest)).toBe(true);
    });

    it('returns false for unrecognized order types', () => {
      const mockRequest: SignatureRequest = {
        messageParams: {
          data: JSON.stringify({
            primaryType: 'UnrecognizedType',
          }),
          version: 'V3',
        },
        type: SignatureRequestType.TypedSign,
      } as SignatureRequest;

      expect(isRecognizedOrder(mockRequest)).toBe(false);
    });

    it('returns false for typed sign V1 request', () => {
      expect(isRecognizedOrder(typedSignV1SignatureRequest)).toBe(false);
      expect(isRecognizedOrder(personalSignSignatureRequest)).toBe(false);
    });
  });

  describe('isTypedSignV3V4Request', () => {
    it('return true for typed sign V3, V4 messages', () => {
      expect(isTypedSignV3V4Request(typedSignV3SignatureRequest)).toBe(true);
      expect(isTypedSignV3V4Request(typedSignV4SignatureRequest)).toBe(true);
    });
    it('return false for typed sign V1 message', () => {
      expect(isTypedSignV3V4Request(typedSignV1SignatureRequest)).toBe(false);
    });
    it('return false for personal sign message', () => {
      expect(isTypedSignV3V4Request(personalSignSignatureRequest)).toBe(false);
    });
  });

  describe('parseSignTypedDataFromSignatureRequest', () => {
    it('parses the correct primary type', () => {
      expect(
        parseSignTypedDataFromSignatureRequest(typedSignV3SignatureRequest)?.primaryType,
      ).toBe('Mail');
      expect(
        parseSignTypedDataFromSignatureRequest(typedSignV4SignatureRequest)?.primaryType,
      ).toBe('Permit');
    });
    it('parses {} for typed sign V1 message', () => {
      expect(
        parseSignTypedDataFromSignatureRequest(typedSignV1SignatureRequest),
      ).toStrictEqual({});
    });
    it('parses {} for personal sign message', () => {
      expect(
        parseSignTypedDataFromSignatureRequest(personalSignSignatureRequest),
      ).toStrictEqual({});
    });
  });

  describe('parseAndSanitizeSignTypedData', () => {
    const typedDataMsg =
      '{"domain":{"chainId":97,"name":"Ether Mail","verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC","version":"1"},"message":{"contents":"Hello, Bob!","from":{"name":"Cow","wallets":["0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826","0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF","0x06195827297c7A80a443b6894d3BDB8824b43896"]},"to":[{"name":"Bob","wallets":["0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB","0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57","0xB0B0b0b0b0b0B000000000000000000000000000"]}]},"primaryType":"Mail","types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Mail":[{"name":"from","type":"Person"},{"name":"to","type":"Person[]"},{"name":"contents","type":"string"}],"Person":[{"name":"name","type":"string"},{"name":"wallets","type":"address[]"}]}}';

    it('returns parsed and sanitized types signature message', () => {
      const parsedMessage =
        parseAndSanitizeSignTypedData(JSON.stringify(mockTypedSignV3Message));
      const { primaryType, domain, sanitizedMessage } = parsedMessage;

      expect(primaryType).toBe('Mail');
      expect(sanitizedMessage).toEqual(mockExpectedSanitizedTypedSignV3Message);
      expect(domain).toEqual(mockTypedSignV3Message.domain);
    });

    it('returns an empty object if no data is passed', () => {
      const result = parseAndSanitizeSignTypedData('');
      expect(result).toMatchObject({});
    });

    it('should throw an error if types is undefined', () => {
      const typedDataMsgWithoutTypes =
        '{"domain":{"chainId":97,"name":"Ether Mail","verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC","version":"1"},"message":{"contents":"Hello, Bob!","from":{"name":"Cow","wallets":["0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826","0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF","0x06195827297c7A80a443b6894d3BDB8824b43896"]},"to":[{"name":"Bob","wallets":["0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB","0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57","0xB0B0b0b0b0b0B000000000000000000000000000"]}]},"primaryType":"Mail"}';
      expect(() => parseAndSanitizeSignTypedData(typedDataMsgWithoutTypes)).toThrow(
        'Invalid types definition',
      );
    });

    it('should throw an error if base type is not defined', () => {
      const typedSignDataWithoutBaseType =
        '{"domain":{"chainId":97,"name":"Ether Mail","verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC","version":"1"},"message":{"contents":"Hello, Bob!","from":{"name":"Cow","wallets":["0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826","0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF","0x06195827297c7A80a443b6894d3BDB8824b43896"]},"to":[{"name":"Bob","wallets":["0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB","0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57","0xB0B0b0b0b0b0B000000000000000000000000000"]}]},"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Mail":[{"name":"from","type":"Person"},{"name":"to","type":"Person[]"},{"name":"contents","type":"string"}],"Person":[{"name":"name","type":"string"},{"name":"wallets","type":"address[]"}]}}';
      expect(() =>
        parseAndSanitizeSignTypedData(typedSignDataWithoutBaseType),
      ).toThrow('Invalid primary type definition');
    });

    it('should return message data ignoring unknown types and trim new lines', () => {
      const result = parseAndSanitizeSignTypedData(typedDataMsg);
      expect(result.sanitizedMessage).toStrictEqual({
        value: {
          contents: { value: 'Hello, Bob!', type: 'string' },
          from: {
            value: {
              name: { value: 'Cow', type: 'string' },
              wallets: {
                value: [
                  {
                    value: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
                    type: 'address',
                  },
                  {
                    value: '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF',
                    type: 'address',
                  },
                  {
                    value: '0x06195827297c7A80a443b6894d3BDB8824b43896',
                    type: 'address',
                  },
                ],
                type: 'address[]',
              },
            },
            type: 'Person',
          },
          to: {
            value: [
              {
                value: {
                  name: { value: 'Bob', type: 'string' },
                  wallets: {
                    value: [
                      {
                        value: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
                        type: 'address',
                      },
                      {
                        value: '0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57',
                        type: 'address',
                      },
                      {
                        value: '0xB0B0b0b0b0b0B000000000000000000000000000',
                        type: 'address',
                      },
                    ],
                    type: 'address[]',
                  },
                },
                type: 'Person',
              },
            ],
            type: 'Person[]',
          },
        },
        type: 'Mail',
      });
    });
  });

  describe('sanitizeParsedMessage', () => {
    it('throws an error if types is undefined', () => {
      const { message, primaryType } = mockTypedSignV3Message;
      expect(() => sanitizeParsedMessage(message, primaryType, undefined)).toThrow(
        'Invalid types definition',
      );
    });

    it('throws an error if base type is not defined', () => {
      const { message, types } = mockTypedSignV3Message;
      expect(() => sanitizeParsedMessage(message, '', types)).toThrow(
        'Invalid primary type definition',
      );
    });

    it('returns the message data without extraneous params missing matching type definitions', () => {
      const { message, primaryType, types } = mockTypedSignV3Message;
      const result = sanitizeParsedMessage(message, primaryType, types);
      expect(result).toStrictEqual({
        value: {
          from: {
            value: {
              name: { value: 'Cow', type: 'string' },
              wallet: {
                value: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
                type: 'address',
              },
            },
            type: 'Person',
          },
          to: {
            value: {
              name: { value: 'Bob', type: 'string' },
              wallet: {
                value: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
                type: 'address',
              },
            },
            type: 'Person',
          },
          contents: { value: 'Hello, Bob!', type: 'string' },
        },
        type: 'Mail',
      });
    });
  });
});
