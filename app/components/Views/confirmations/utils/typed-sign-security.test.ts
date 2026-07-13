import {
  canonicalizeTypedMessageData,
  rejectExtraneousTypedMessageKeys,
} from './typed-sign-security';

const validPayload = {
  types: { EIP712Domain: [] },
  primaryType: 'Test',
  domain: { chainId: '0x1' },
  message: { value: '100' },
};

describe('canonicalizeTypedMessageData', () => {
  describe('string input', () => {
    it('eliminates duplicate keys (last value wins)', () => {
      const raw = [
        '{"types":{},"primaryType":"Permit","domain":{},"message":{',
        '"value":"small","value":"large"}}',
      ].join('');

      const result = canonicalizeTypedMessageData(raw);
      expect(JSON.parse(result).message.value).toBe('large');
    });

    it('returns canonical JSON that round-trips identically', () => {
      const input = JSON.stringify(validPayload);
      const result = canonicalizeTypedMessageData(input);
      expect(JSON.stringify(JSON.parse(result))).toBe(result);
    });

    it('returns the original string if JSON is malformed', () => {
      const bad = 'not-json';
      expect(canonicalizeTypedMessageData(bad)).toBe(bad);
    });
  });

  describe('object input', () => {
    it('returns a canonical JSON string', () => {
      const result = canonicalizeTypedMessageData(
        validPayload as unknown as string,
      );
      expect(typeof result).toBe('string');
      expect(JSON.parse(result)).toStrictEqual(validPayload);
    });

    it('round-trips identically', () => {
      const result = canonicalizeTypedMessageData(
        validPayload as unknown as string,
      );
      expect(JSON.stringify(JSON.parse(result))).toBe(result);
    });
  });
});

describe('rejectExtraneousTypedMessageKeys', () => {
  describe('string input', () => {
    it('allows standard EIP-712 keys', () => {
      expect(() =>
        rejectExtraneousTypedMessageKeys(JSON.stringify(validPayload)),
      ).not.toThrow();
    });

    it('allows the metadata key', () => {
      const withMetadata = {
        ...validPayload,
        metadata: { justification: 'test', origin: 'test' },
      };
      expect(() =>
        rejectExtraneousTypedMessageKeys(JSON.stringify(withMetadata)),
      ).not.toThrow();
    });

    it('rejects payloads with extraneous keys', () => {
      const withExtra = {
        ...validPayload,
        intent: { extraGrant: '0xattacker' },
      };
      expect(() =>
        rejectExtraneousTypedMessageKeys(JSON.stringify(withExtra)),
      ).toThrow(expect.objectContaining({ code: -32000 }));
    });

    it('silently ignores malformed JSON', () => {
      expect(() => rejectExtraneousTypedMessageKeys('not-json')).not.toThrow();
    });
  });

  describe('object input', () => {
    it('allows standard EIP-712 keys', () => {
      expect(() =>
        rejectExtraneousTypedMessageKeys(validPayload as unknown as string),
      ).not.toThrow();
    });

    it('rejects payloads with extraneous keys', () => {
      const withExtra = {
        ...validPayload,
        audit_note: 'Reviewed by security team',
      };
      expect(() =>
        rejectExtraneousTypedMessageKeys(withExtra as unknown as string),
      ).toThrow(expect.objectContaining({ code: -32000 }));
    });
  });
});
