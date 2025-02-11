import {
  parseTypedDataMessage,
  isRecognizedPermit,
  isTypedSignV3V4Request,
  parseTypedDataMessageFromSignatureRequest,
  isRecognizedOrder,
  parseSanitizeTypedDataMessage,
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
  describe('parseTypedDataMessage', () => {
    it('parses a typed data message correctly', () => {
      const data = JSON.stringify({
        message: {
          value: '123',
        },
      });
      const result = parseTypedDataMessage(data);
      expect(result).toEqual({
        message: {
          value: '123',
        },
      });
    });

    it('parses message.value as a string', () => {
      const result = parseTypedDataMessage(
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
      const result = parseTypedDataMessage(data);
      expect(result.message.value).toBe(largeValue);
    });

    it('throws an error for invalid typedDataMessage', () => {
      expect(() => {
        parseTypedDataMessage('');
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

  describe('parseTypedDataMessageFromSignatureRequest', () => {
    it('parses the correct primary type', () => {
      expect(
        parseTypedDataMessageFromSignatureRequest(typedSignV3SignatureRequest)?.primaryType,
      ).toBe('Mail');
      expect(
        parseTypedDataMessageFromSignatureRequest(typedSignV4SignatureRequest)?.primaryType,
      ).toBe('Permit');
    });
    it('parses undefined for typed sign V1 message', () => {
      expect(
        parseTypedDataMessageFromSignatureRequest(typedSignV1SignatureRequest),
      ).toBe(undefined);
    });
    it('parses undefined for personal sign message', () => {
      expect(
        parseTypedDataMessageFromSignatureRequest(personalSignSignatureRequest),
      ).toBe(undefined);
    });
  });

  describe('parseSanitizeTypedDataMessage', () => {
    it('returns parsed and sanitized types signature message', () => {
      const { sanitizedMessage, primaryType, domain } =
        parseSanitizeTypedDataMessage(JSON.stringify(mockTypedSignV3Message));

      expect(primaryType).toBe('Mail');
      expect(sanitizedMessage).toEqual(mockExpectedSanitizedTypedSignV3Message);
      expect(domain).toEqual(mockTypedSignV3Message.domain);
    });

    it('returns an empty object if no data is passed', () => {
      const result = parseSanitizeTypedDataMessage('');
      expect(result).toMatchObject({});
    });
  });
});
