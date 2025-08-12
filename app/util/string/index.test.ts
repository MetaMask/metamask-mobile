import {
  escapeSpecialUnicode,
  isArrayType,
  isSolidityType,
  stripArrayType,
  stripMultipleNewlines,
  stripOneLayerofNesting,
} from '.';

describe('string utils', () => {
  describe('escapeSpecialUnicode', () => {
    it('escapes all occurences of \u202E', () => {
      const result = escapeSpecialUnicode('test \u202E test \u202E test');
      expect(result).toEqual('test \\u202E test \\u202E test');
    });

    it('escapes all occurences of \u202D and \u202E', () => {
      const result = escapeSpecialUnicode('test \u202D test \u202E test \u202D test');
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
});
