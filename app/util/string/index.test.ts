import {
  escapeSpecialUnicode,
  stripMultipleNewlines,
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

  describe('stripMultipleNewlines', () => {
    it('replace multiple newline characters in string with single newline character', async () => {
      const result = stripMultipleNewlines(
        'Secure ✅ \n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n',
      );
      expect(result).toEqual('Secure ✅ \n');
    });
  });
});
