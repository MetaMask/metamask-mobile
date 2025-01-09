import { ApprovalRequest } from '@metamask/approval-controller';
import { parseTypedDataMessage, isRecognizedPermit } from './signature';
import { PRIMARY_TYPES_PERMIT } from '../constants/signatures';

describe('Signature Utils', () => {
  describe('parseTypedDataMessage', () => {
    it('should parse typed data message correctly', () => {
      const data = JSON.stringify({
        message: {
          value: '123'
        }
      });
      const result = parseTypedDataMessage(data);
      expect(result).toEqual({
        message: {
          value: '123'
        }
      });
    });

    it('should handle large message values. This prevents native JS number coercion when the value is greater than Number.MAX_SAFE_INTEGER.', () => {
      const largeValue = '123456789012345678901234567890';
      const data = JSON.stringify({
        message: {
          value: largeValue
        }
      });
      const result = parseTypedDataMessage(data);
      expect(result.message.value).toBe(largeValue);
    });
  });

  describe('isRecognizedPermit', () => {
    it('should return true for recognized permit types', () => {
      const mockRequest: ApprovalRequest<{ data: string }> = {
        requestData: {
          data: JSON.stringify({
            primaryType: PRIMARY_TYPES_PERMIT[0]
          })
        }
      } as ApprovalRequest<{ data: string }>;

      expect(isRecognizedPermit(mockRequest)).toBe(true);
    });

    it('should return false for unrecognized permit types', () => {
      const mockRequest: ApprovalRequest<{ data: string }> = {
        requestData: {
          data: JSON.stringify({
            primaryType: 'UnrecognizedType'
          })
        }
      } as ApprovalRequest<{ data: string }>;

      expect(isRecognizedPermit(mockRequest)).toBe(false);
    });
  });
});
