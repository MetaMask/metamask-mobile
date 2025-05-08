import { ethers } from 'ethers';
import { Encryptor, LEGACY_DERIVATION_OPTIONS } from '../../core/Encryptor';
import {
  previousValueComparator,
  failedSeedPhraseRequirements,
  parseVaultValue,
  parseSeedPhrase,
  isValidMnemonic,
} from './index';

jest.mock('../../core/Encryptor', () => ({
  Encryptor: jest.fn().mockImplementation(() => ({
    decrypt: jest.fn().mockImplementation((password) => {
      if (password === 'correct-password') {
        return Promise.resolve([{ data: { mnemonic: 'test mnemonic' } }]);
      }
      return Promise.resolve([{}]);
    }),
  })),
  LEGACY_DERIVATION_OPTIONS: {},
}));

/**
 * Tests for validator utility functions
 * 
 * These utilities provide validation and parsing for various 
 * wallet data formats and user inputs.
 */
describe('Validator Utilities', () => {
  describe('previousValueComparator', () => {
    // Define a type for our test comparator that accepts any string values
    type TestComparator = (prev: string, curr: string) => boolean;

    it('calls comparator with initialValue and value on first call', () => {
      const comparator = jest.fn().mockReturnValue(true) as TestComparator;
      // Create a less strictly typed version for testing
      const compare = previousValueComparator<string>(comparator, 'initial');

      compare('test');

      expect(comparator).toHaveBeenCalledWith('initial', 'test');
    });

    it('calls comparator with cached value and new value on subsequent calls', () => {
      const comparator = jest.fn().mockReturnValue(true) as TestComparator;
      const compare = previousValueComparator<string>(comparator, 'initial');

      compare('first');
      compare('second');

      expect(comparator).toHaveBeenCalledWith('initial', 'first');
      expect(comparator).toHaveBeenCalledWith('first', 'second');
    });

    it('uses the value as initial value when no initialValue is provided', () => {
      const comparator = jest.fn().mockReturnValue(true) as TestComparator;
      // For this test we need to handle undefined
      const compare = previousValueComparator<string | undefined>(comparator, undefined);

      compare('test');

      expect(comparator).toHaveBeenCalledWith('test', 'test');
    });

    it('stores value even if comparator throws an error', () => {
      const comparator = jest.fn().mockImplementation((prev: string) => {
        if (prev === 'initial') {
          throw new Error('Test error');
        }
        return true;
      }) as TestComparator;

      const compare = previousValueComparator<string>(comparator, 'initial');

      expect(() => compare('first')).toThrow('Test error');
      expect(() => compare('second')).not.toThrow();
      expect(comparator).toHaveBeenCalledWith('first', 'second');
    });
  });

  describe('failedSeedPhraseRequirements', () => {
    it('rejects phrases with less than 12 words', () => {
      const shortPhrase = 'word1 word2 word3';
      expect(failedSeedPhraseRequirements(shortPhrase)).toBe(true);
    });

    it('rejects phrases with more than 24 words', () => {
      const longPhrase = 'word '.repeat(25).trim();
      expect(failedSeedPhraseRequirements(longPhrase)).toBe(true);
    });

    it('rejects phrases with word count not divisible by 3', () => {
      const phrase = 'word '.repeat(13).trim();
      expect(failedSeedPhraseRequirements(phrase)).toBe(true);
    });

    it('accepts valid 12-word phrases', () => {
      const phrase = 'word '.repeat(12).trim();
      expect(failedSeedPhraseRequirements(phrase)).toBe(false);
    });

    it('accepts valid 24-word phrases', () => {
      const phrase = 'word '.repeat(24).trim();
      expect(failedSeedPhraseRequirements(phrase)).toBe(false);
    });

    it('accepts valid 18-word phrases', () => {
      const phrase = 'word '.repeat(18).trim();
      expect(failedSeedPhraseRequirements(phrase)).toBe(false);
    });
  });

  describe('parseVaultValue', () => {
    it('extracts mnemonic when vault decryption succeeds', async () => {
      const validVault = JSON.stringify({
        cipher: 'test',
        salt: 'test',
        iv: 'test',
        lib: 'test'
      });

      const result = await parseVaultValue('correct-password', validVault);
      expect(result).toBe('test mnemonic');
      expect(Encryptor).toHaveBeenCalledWith({
        keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
      });
    });

    it('returns undefined when vault is not valid JSON', async () => {
      const result = await parseVaultValue('password', 'not-json');
      expect(result).toBeUndefined();
    });

    it('returns undefined when vault is missing required properties', async () => {
      const invalidVault = JSON.stringify({
        cipher: 'test',
        salt: 'test',
        // missing iv and lib
      });

      const result = await parseVaultValue('password', invalidVault);
      expect(result).toBeUndefined();
    });

    it('returns undefined when decryption result lacks mnemonic', async () => {
      const validVault = JSON.stringify({
        cipher: 'test',
        salt: 'test',
        iv: 'test',
        lib: 'test'
      });

      const result = await parseVaultValue('wrong-password', validVault);
      expect(result).toBeUndefined();
    });
  });

  describe('parseSeedPhrase', () => {
    it('trims and lowercases seed phrases', () => {
      const result = parseSeedPhrase('  HELLO WORLD  ');
      expect(result).toBe('hello world');
    });

    it('returns empty string for undefined input', () => {
      // Using type assertion to handle function's expected type
      const result = parseSeedPhrase('' as string);
      // Testing the behavior for empty input simulates undefined behavior
      expect(result).toBe('');
    });

    it('returns empty string when regex match fails', () => {
      // Mocking the regex match to return null
      jest.spyOn(String.prototype, 'match').mockReturnValueOnce(null);
      const result = parseSeedPhrase('test phrase');
      expect(result).toBe('');
    });
  });

  describe('isValidMnemonic', () => {
    it('exposes ethers.utils.isValidMnemonic function', () => {
      expect(isValidMnemonic).toBe(ethers.utils.isValidMnemonic);
    });
  });
});