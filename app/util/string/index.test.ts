import {
  escapeSpecialUnicode,
  isArrayType,
  isSolidityType,
  stripArrayType,
  stripMultipleNewlines,
  stripOneLayerofNesting,
  toSentenceCase,
} from '.';

describe('string utils', () => {
  describe('escapeSpecialUnicode', () => {
    it('escapes all occurences of \u202E', () => {
      const result = escapeSpecialUnicode('test \u202E test \u202E test');
      expect(result).toEqual('test \\u202E test \\u202E test');
    });

    it('escapes all occurences of \u202D and \u202E', () => {
      const result = escapeSpecialUnicode(
        'test \u202D test \u202E test \u202D test',
      );
      expect(result).toEqual('test \\u202D test \\u202E test \\u202D test');
    });
  });

  describe('isArrayType', () => {
    [
      ['uint256[]', true],
      ['address[5]', true],
      ['string[][]', true],
      ['bytes32[1][2]', true],
      ['uint256', false],
      ['address', false],
      ['string', false],
      ['bytes32', false],
    ].forEach(([input, expected]) => {
      it(`returns ${expected} for ${input}`, () => {
        const result = isArrayType(input as string);
        expect(result).toEqual(expected);
      });
    });
  });

  describe('isSolidityType', () => {
    [
      ['uint256[]', false],
      ['address[5]', false],
      ['string[][]', false],
      ['bytes32[1][2]', false],
      ['uint256', true],
      ['address', true],
      ['string', true],
      ['bytes32', true],
    ].forEach(([input, expected]) => {
      it(`returns ${expected} for ${input}`, () => {
        const result = isSolidityType(input as string);
        expect(result).toEqual(expected);
      });
    });
  });

  describe('stripArrayType', () => {
    [
      ['uint256[]', 'uint256'],
      ['address[5]', 'address'],
      ['string[][]', 'string'],
      ['bytes32[1][2]', 'bytes32'],
    ].forEach(([input, expected]) => {
      it(`removes the array type from ${input}`, () => {
        const result = stripArrayType(input);
        expect(result).toEqual(expected);
      });
    });
  });

  describe('stripOneLayerofNesting', () => {
    [
      ['uint256[1]', 'uint256'],
      ['address[5]', 'address'],
      ['string[1][2]', 'string[2]'],
      ['bytes32[1][2]', 'bytes32[2]'],
    ].forEach(([input, expected]) => {
      it(`removes one layer of array nesting from ${input}`, () => {
        const result = stripOneLayerofNesting(input);
        expect(result).toEqual(expected);
      });
    });
  });

  describe('stripMultipleNewlines', () => {
    it('replace multiple newline characters in string with single newline character', async () => {
      const result = stripMultipleNewlines(
        'Secure ✅ \n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n',
      );
      expect(result).toEqual('Secure ✅ \n');
    });

    it('returns undefined if the input is undefined', async () => {
      const result = stripMultipleNewlines(undefined);
      expect(result).toEqual(undefined);
    });

    it('returns the value as is if it is not a string', async () => {
      const result = stripMultipleNewlines(123);
      expect(result).toEqual(123);
    });
  });

  describe('toSentenceCase', () => {
    describe('basic transformations', () => {
      it('converts all lowercase string to sentence case', () => {
        const input = 'hello world';

        const result = toSentenceCase(input);

        expect(result).toBe('Hello world');
      });

      it('converts all uppercase string to sentence case', () => {
        const input = 'HELLO WORLD';

        const result = toSentenceCase(input);

        expect(result).toBe('Hello world');
      });

      it('converts mixed case string to sentence case', () => {
        const input = 'hELLo WoRLd';

        const result = toSentenceCase(input);

        expect(result).toBe('Hello world');
      });

      it('preserves string already in sentence case', () => {
        const input = 'Hello world';

        const result = toSentenceCase(input);

        expect(result).toBe('Hello world');
      });

      it('converts camelCase to sentence case', () => {
        const input = 'networkFee';

        const result = toSentenceCase(input);

        expect(result).toBe('Networkfee');
      });

      it('converts PascalCase to sentence case', () => {
        const input = 'NetworkFee';

        const result = toSentenceCase(input);

        expect(result).toBe('Networkfee');
      });
    });

    describe('single character strings', () => {
      it('converts lowercase single character to uppercase', () => {
        const input = 'a';

        const result = toSentenceCase(input);

        expect(result).toBe('A');
      });

      it('preserves uppercase single character', () => {
        const input = 'A';

        const result = toSentenceCase(input);

        expect(result).toBe('A');
      });

      it('handles single digit', () => {
        const input = '5';

        const result = toSentenceCase(input);

        expect(result).toBe('5');
      });

      it('handles single special character', () => {
        const input = '@';

        const result = toSentenceCase(input);

        expect(result).toBe('@');
      });
    });

    describe('edge cases', () => {
      it('returns empty string for empty input', () => {
        const input = '';

        const result = toSentenceCase(input);

        expect(result).toBe('');
      });

      it('handles string with only spaces', () => {
        const input = '   ';

        const result = toSentenceCase(input);

        expect(result).toBe('   ');
      });

      it('handles string starting with space', () => {
        const input = ' hello world';

        const result = toSentenceCase(input);

        expect(result).toBe(' hello world');
      });

      it('handles string with numbers', () => {
        const input = '123 test';

        const result = toSentenceCase(input);

        expect(result).toBe('123 test');
      });

      it('handles string starting with special character', () => {
        const input = '@username';

        const result = toSentenceCase(input);

        expect(result).toBe('@username');
      });

      it('handles string with emoji', () => {
        const input = '✅ secure';

        const result = toSentenceCase(input);

        expect(result).toBe('✅ secure');
      });

      it('handles string with unicode characters', () => {
        const input = 'café résumé';

        const result = toSentenceCase(input);

        expect(result).toBe('Café résumé');
      });

      it('handles string with multiple consecutive spaces', () => {
        const input = 'hello  world';

        const result = toSentenceCase(input);

        expect(result).toBe('Hello  world');
      });

      it('handles string with newline characters', () => {
        const input = 'hello\nworld';

        const result = toSentenceCase(input);

        expect(result).toBe('Hello\nworld');
      });

      it('handles string with tab characters', () => {
        const input = 'hello\tworld';

        const result = toSentenceCase(input);

        expect(result).toBe('Hello\tworld');
      });
    });

    describe('null and undefined handling', () => {
      it('returns empty string for null input', () => {
        const input = null as unknown as string;

        const result = toSentenceCase(input);

        expect(result).toBe('');
      });

      it('returns empty string for undefined input', () => {
        const input = undefined as unknown as string;

        const result = toSentenceCase(input);

        expect(result).toBe('');
      });
    });

    describe('real-world use cases', () => {
      it('formats i18n key network_fee', () => {
        const input = 'network fee';

        const result = toSentenceCase(input);

        expect(result).toBe('Network fee');
      });

      it('formats i18n key total_cost', () => {
        const input = 'total cost';

        const result = toSentenceCase(input);

        expect(result).toBe('Total cost');
      });

      it('formats i18n key estimated_time', () => {
        const input = 'estimated time';

        const result = toSentenceCase(input);

        expect(result).toBe('Estimated time');
      });

      it('formats uppercase label to sentence case', () => {
        const input = 'NETWORK FEE';

        const result = toSentenceCase(input);

        expect(result).toBe('Network fee');
      });
    });
  });
});
