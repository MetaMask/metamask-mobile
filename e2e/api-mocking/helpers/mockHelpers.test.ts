import {
  processPostRequestBody,
  PostRequestMatchingOptions,
} from './mockHelpers';

describe('processPostRequestBody', () => {
  describe('basic functionality', () => {
    it('should return matches: false for missing request body', () => {
      const result = processPostRequestBody(undefined, { id: 1 });

      expect(result.matches).toBe(false);
      expect(result.error).toBe('Missing request body');
    });

    it('should return matches: false for invalid JSON request body', () => {
      const result = processPostRequestBody('invalid json', { id: 1 });

      expect(result.matches).toBe(false);
      expect(result.error).toBe('Invalid request body JSON');
    });

    it('should return matches: true when no expected body is specified', () => {
      const result = processPostRequestBody('{"id": 1}', undefined);

      expect(result.matches).toBe(true);
      expect(result.requestBodyJson).toEqual({ id: 1 });
    });

    it('should match exact objects when allowPartialMatch is false', () => {
      const requestBody = JSON.stringify({ id: 1, name: 'test' });
      const expectedBody = { id: 1, name: 'test' };
      const options: PostRequestMatchingOptions = { allowPartialMatch: false };

      const result = processPostRequestBody(requestBody, expectedBody, options);

      expect(result.matches).toBe(true);
      expect(result.requestBodyJson).toEqual({ id: 1, name: 'test' });
    });

    it('should not match when objects are different and allowPartialMatch is false', () => {
      const requestBody = JSON.stringify({
        id: 1,
        name: 'test',
        extra: 'field',
      });
      const expectedBody = { id: 1, name: 'test' };
      const options: PostRequestMatchingOptions = { allowPartialMatch: false };

      const result = processPostRequestBody(requestBody, expectedBody, options);

      expect(result.matches).toBe(false);
      expect(result.error).toBe('Request body validation failed');
    });

    it('should match partial objects when allowPartialMatch is true (default)', () => {
      const requestBody = JSON.stringify({
        id: 1,
        name: 'test',
        extra: 'field',
      });
      const expectedBody = { id: 1, name: 'test' };

      const result = processPostRequestBody(requestBody, expectedBody);

      expect(result.matches).toBe(true);
      expect(result.requestBodyJson).toEqual({
        id: 1,
        name: 'test',
        extra: 'field',
      });
    });
  });

  describe('ignoreFields functionality', () => {
    it('should ignore single field when comparing objects', () => {
      const requestBody = JSON.stringify({
        id: 1,
        name: 'test',
        timestamp: '2024-01-01T00:00:00.000Z',
      });
      const expectedBody = {
        id: 1,
        name: 'test',
        timestamp: '2024-01-01T00:00:00.001Z', // Different timestamp
      };
      const options: PostRequestMatchingOptions = {
        ignoreFields: ['timestamp'],
      };

      const result = processPostRequestBody(requestBody, expectedBody, options);

      expect(result.matches).toBe(true);
    });

    it('should ignore multiple fields when comparing objects', () => {
      const requestBody = JSON.stringify({
        id: 1,
        name: 'test',
        timestamp: '2024-01-01T00:00:00.000Z',
        nonce: 'abc123',
        version: '1.0.0',
      });
      const expectedBody = {
        id: 1,
        name: 'test',
        timestamp: '2024-01-01T00:00:00.001Z', // Different
        nonce: 'def456', // Different
        version: '2.0.0', // Different
      };
      const options: PostRequestMatchingOptions = {
        ignoreFields: ['timestamp', 'nonce', 'version'],
      };

      const result = processPostRequestBody(requestBody, expectedBody, options);

      expect(result.matches).toBe(true);
    });

    it('should ignore nested fields using dot notation', () => {
      const requestBody = JSON.stringify({
        user: {
          id: 1,
          profile: {
            name: 'test',
            timestamp: '2024-01-01T00:00:00.000Z',
          },
        },
        metadata: {
          version: '1.0.0',
        },
      });
      const expectedBody = {
        user: {
          id: 1,
          profile: {
            name: 'test',
            timestamp: '2024-01-01T00:00:00.001Z', // Different
          },
        },
        metadata: {
          version: '2.0.0', // Different
        },
      };
      const options: PostRequestMatchingOptions = {
        ignoreFields: ['user.profile.timestamp', 'metadata.version'],
      };

      const result = processPostRequestBody(requestBody, expectedBody, options);

      expect(result.matches).toBe(true);
    });

    it('should ignore array index fields', () => {
      const requestBody = JSON.stringify({
        transactions: [
          { id: 1, hash: 'hash1', timestamp: 1000 },
          { id: 2, hash: 'hash2', timestamp: 2000 },
        ],
      });
      const expectedBody = {
        transactions: [
          { id: 1, hash: 'hash1', timestamp: 1001 }, // Different
          { id: 2, hash: 'hash2', timestamp: 2002 }, // Different
        ],
      };
      const options: PostRequestMatchingOptions = {
        ignoreFields: [
          'transactions[0].timestamp',
          'transactions[1].timestamp',
        ],
      };

      const result = processPostRequestBody(requestBody, expectedBody, options);

      expect(result.matches).toBe(true);
    });

    it('should fail when non-ignored fields are different', () => {
      const requestBody = JSON.stringify({
        id: 1,
        name: 'test',
        timestamp: '2024-01-01T00:00:00.000Z',
      });
      const expectedBody = {
        id: 2, // Different and not ignored
        name: 'test',
        timestamp: '2024-01-01T00:00:00.001Z',
      };
      const options: PostRequestMatchingOptions = {
        ignoreFields: ['timestamp'],
      };

      const result = processPostRequestBody(requestBody, expectedBody, options);

      expect(result.matches).toBe(false);
      expect(result.error).toBe('Request body validation failed');
    });

    it('should ignore field that exists in request but not in expected body', () => {
      const requestBody = JSON.stringify({
        id: 1,
        name: 'test',
        extraField: 'should be ignored',
      });
      const expectedBody = {
        id: 1,
        name: 'test',
      };
      const options: PostRequestMatchingOptions = {
        ignoreFields: ['extraField'],
      };

      const result = processPostRequestBody(requestBody, expectedBody, options);

      expect(result.matches).toBe(true);
    });

    it('should ignore field that exists in expected body but not in request', () => {
      const requestBody = JSON.stringify({
        id: 1,
        name: 'test',
      });
      const expectedBody = {
        id: 1,
        name: 'test',
        extraField: 'should be ignored',
      };
      const options: PostRequestMatchingOptions = {
        ignoreFields: ['extraField'],
      };

      const result = processPostRequestBody(requestBody, expectedBody, options);

      expect(result.matches).toBe(true);
    });

    it('should handle ignoring non-existent fields gracefully', () => {
      const requestBody = JSON.stringify({
        id: 1,
        name: 'test',
      });
      const expectedBody = {
        id: 1,
        name: 'test',
      };
      const options: PostRequestMatchingOptions = {
        ignoreFields: ['nonExistentField', 'another.nested.field'],
      };

      const result = processPostRequestBody(requestBody, expectedBody, options);

      expect(result.matches).toBe(true);
    });

    it('should work with empty ignoreFields array', () => {
      const requestBody = JSON.stringify({
        id: 1,
        name: 'test',
      });
      const expectedBody = {
        id: 1,
        name: 'test',
      };
      const options: PostRequestMatchingOptions = {
        ignoreFields: [],
      };

      const result = processPostRequestBody(requestBody, expectedBody, options);

      expect(result.matches).toBe(true);
    });

    it('should ignore fields in combination with allowPartialMatch: false', () => {
      const requestBody = JSON.stringify({
        id: 1,
        name: 'test',
        timestamp: '2024-01-01T00:00:00.000Z',
      });
      const expectedBody = {
        id: 1,
        name: 'test',
        timestamp: '2024-01-01T00:00:00.001Z', // Different
      };
      const options: PostRequestMatchingOptions = {
        ignoreFields: ['timestamp'],
        allowPartialMatch: false,
      };

      const result = processPostRequestBody(requestBody, expectedBody, options);

      expect(result.matches).toBe(true);
    });

    it('should handle complex nested object with multiple ignore fields', () => {
      const requestBody = JSON.stringify({
        transaction: {
          id: 'tx123',
          from: '0xabc',
          to: '0xdef',
          value: '1000',
          gas: {
            price: '20',
            limit: '21000',
            timestamp: 1234567890,
          },
          meta: {
            nonce: 42,
            chainId: 1,
            signature: 'sig123',
          },
        },
        requestId: 'req456',
        clientTimestamp: 9876543210,
      });

      const expectedBody = {
        transaction: {
          id: 'tx123',
          from: '0xabc',
          to: '0xdef',
          value: '1000',
          gas: {
            price: '20',
            limit: '21000',
            timestamp: 1111111111, // Different
          },
          meta: {
            nonce: 99, // Different
            chainId: 1,
            signature: 'sig999', // Different
          },
        },
        requestId: 'req999', // Different
        clientTimestamp: 1111111111, // Different
      };

      const options: PostRequestMatchingOptions = {
        ignoreFields: [
          'transaction.gas.timestamp',
          'transaction.meta.nonce',
          'transaction.meta.signature',
          'requestId',
          'clientTimestamp',
        ],
      };

      const result = processPostRequestBody(requestBody, expectedBody, options);

      expect(result.matches).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle null values in objects', () => {
      const requestBody = JSON.stringify({
        id: 1,
        value: null,
        timestamp: '2024-01-01T00:00:00.000Z',
      });
      const expectedBody = {
        id: 1,
        value: null,
        timestamp: '2024-01-01T00:00:00.001Z',
      };
      const options: PostRequestMatchingOptions = {
        ignoreFields: ['timestamp'],
      };

      const result = processPostRequestBody(requestBody, expectedBody, options);

      expect(result.matches).toBe(true);
    });

    it('should handle arrays correctly with ignore fields', () => {
      const requestBody = JSON.stringify({
        items: ['a', 'b', 'c'],
        metadata: { version: 1 },
      });
      const expectedBody = {
        items: ['a', 'b', 'c'],
        metadata: { version: 2 },
      };
      const options: PostRequestMatchingOptions = {
        ignoreFields: ['metadata.version'],
      };

      const result = processPostRequestBody(requestBody, expectedBody, options);

      expect(result.matches).toBe(true);
    });

    it('should handle primitive values correctly with allowPartialMatch: false', () => {
      const requestBody = '"test string"';
      const expectedBody = 'test string';
      const options: PostRequestMatchingOptions = { allowPartialMatch: false };

      const result = processPostRequestBody(requestBody, expectedBody, options);

      expect(result.matches).toBe(true);
    });

    it('should handle number values correctly with allowPartialMatch: false', () => {
      const requestBody = '42';
      const expectedBody = 42;
      const options: PostRequestMatchingOptions = { allowPartialMatch: false };

      const result = processPostRequestBody(requestBody, expectedBody, options);

      expect(result.matches).toBe(true);
    });

    it('should handle boolean values correctly with allowPartialMatch: false', () => {
      const requestBody = 'true';
      const expectedBody = true;
      const options: PostRequestMatchingOptions = { allowPartialMatch: false };

      const result = processPostRequestBody(requestBody, expectedBody, options);

      expect(result.matches).toBe(true);
    });

    it('should not match primitive values with allowPartialMatch: true (default) since isMatch only works with objects', () => {
      const requestBody = '"test string"';
      const expectedBody = 'test string';

      const result = processPostRequestBody(requestBody, expectedBody);

      expect(result.matches).toBe(false);
      expect(result.error).toBe('Request body validation failed');
    });
  });
});
