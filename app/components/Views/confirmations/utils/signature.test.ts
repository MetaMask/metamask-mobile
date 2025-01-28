import {
  parseTypedDataMessage,
  isRecognizedPermit,
  isTypedSignV3V4Request,
  getSignatureRequestPrimaryType,
} from './signature';
import { PRIMARY_TYPES_PERMIT } from '../constants/signatures';
import {
  SignatureRequest,
  SignatureRequestType,
} from '@metamask/signature-controller';
import {
  personalSignSignatureRequest,
  typedSignV1SignatureRequest,
  typedSignV3SignatureRequest,
  typedSignV4SignatureRequest,
} from '../../../../util/test/confirm-data-helpers';

describe('Signature Utils', () => {
  describe('parseTypedDataMessage', () => {
    it('should parse typed data message correctly', () => {
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

    it('should handle large message values. This prevents native JS number coercion when the value is greater than Number.MAX_SAFE_INTEGER.', () => {
      const largeValue = '123456789012345678901234567890';
      const data = JSON.stringify({
        message: {
          value: largeValue,
        },
      });
      const result = parseTypedDataMessage(data);
      expect(result.message.value).toBe(largeValue);
    });

    it('throw error for invalid typedDataMessage', () => {
      expect(() => {
        parseTypedDataMessage('');
      }).toThrow(new Error('Unexpected end of JSON input'));
    });
  });

  describe('isRecognizedPermit', () => {
    it('should return true for recognized permit types', () => {
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

    it('should return false for unrecognized permit types', () => {
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

    it('should return false for typed sign V1 request', () => {
      expect(isRecognizedPermit(typedSignV1SignatureRequest)).toBe(false);
      expect(isRecognizedPermit(personalSignSignatureRequest)).toBe(false);
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

  describe('getSignatureRequestPrimaryType', () => {
    it('return correct primary type', () => {
      expect(getSignatureRequestPrimaryType(typedSignV3SignatureRequest)).toBe(
        'Mail',
      );
      expect(getSignatureRequestPrimaryType(typedSignV4SignatureRequest)).toBe(
        'Permit',
      );
    });
    it('return undefined for for typed sign V1 message', () => {
      expect(getSignatureRequestPrimaryType(typedSignV1SignatureRequest)).toBe(
        undefined,
      );
    });
    it('return undefined for personal sign message', () => {
      expect(getSignatureRequestPrimaryType(personalSignSignatureRequest)).toBe(
        undefined,
      );
    });
  });
});
