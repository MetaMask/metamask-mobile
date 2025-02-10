import { mockTypedSignV3Message } from '../../../../util/test/confirm-data-helpers';
import { parseSanitizeTypedDataMessage } from './signatures';

const mockParsedSignV3Message = {
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

describe('Signature utils', () => {
  describe('parseSanitizeTypedDataMessage', () => {
    it('should return parsed and sanitized types signature message', async () => {
      const { sanitizedMessage, primaryType } = parseSanitizeTypedDataMessage(
        JSON.stringify(mockTypedSignV3Message),
      );
      expect(primaryType).toBe('Mail');
      expect(sanitizedMessage).toEqual(mockParsedSignV3Message);
    });
  });
});
