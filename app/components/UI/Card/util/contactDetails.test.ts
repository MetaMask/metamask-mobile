import type { Region } from '../types';
import {
  formatE164PhoneNumber,
  isValidE164PhoneNumber,
  isValidLocalPhoneNumber,
  normalizePhoneDigits,
  parseE164PhoneNumber,
  stripCallingCodePrefix,
} from './contactDetails';

const REGIONS: Region[] = [
  { key: 'US', name: 'United States', areaCode: '1' },
  { key: 'GB', name: 'United Kingdom', areaCode: '44' },
  { key: 'BS', name: 'Bahamas', areaCode: '1242' },
];

describe('contactDetails', () => {
  describe('normalizePhoneDigits', () => {
    it('removes phone formatting characters', () => {
      const result = normalizePhoneDigits('+44 (123) 456-7890');

      expect(result).toBe('441234567890');
    });
  });

  describe('isValidLocalPhoneNumber', () => {
    it.each(['1234', '123456789012345'])(
      'returns true for a supported digit count: %s',
      (phoneNumber) => {
        const result = isValidLocalPhoneNumber(phoneNumber);

        expect(result).toBe(true);
      },
    );

    it.each(['123', '1234567890123456', '123-456'])(
      'returns false for an unsupported local number: %s',
      (phoneNumber) => {
        const result = isValidLocalPhoneNumber(phoneNumber);

        expect(result).toBe(false);
      },
    );
  });

  describe('formatE164PhoneNumber', () => {
    it('combines sanitized calling-code and local-number digits', () => {
      const result = formatE164PhoneNumber('+44', '123 456 7890');

      expect(result).toBe('+441234567890');
    });
  });

  describe('isValidE164PhoneNumber', () => {
    it('returns true for a plus-prefixed number containing at most 15 digits', () => {
      const result = isValidE164PhoneNumber('+441234567890');

      expect(result).toBe(true);
    });

    it('returns false when the combined number exceeds 15 digits', () => {
      const result = isValidE164PhoneNumber('+4412345678901234');

      expect(result).toBe(false);
    });
  });

  describe('parseE164PhoneNumber', () => {
    it('uses the preferred region when calling codes are shared', () => {
      const sharedRegions: Region[] = [
        { key: 'US', name: 'United States', areaCode: '1' },
        { key: 'CA', name: 'Canada', areaCode: '1' },
      ];

      const result = parseE164PhoneNumber('+14165550123', sharedRegions, 'CA');

      expect(result).toStrictEqual({
        region: sharedRegions[1],
        phoneNumber: '4165550123',
      });
    });

    it('uses the longest matching calling code', () => {
      const result = parseE164PhoneNumber('+12425550123', REGIONS);

      expect(result).toStrictEqual({
        region: REGIONS[2],
        phoneNumber: '5550123',
      });
    });

    it('returns all digits as the local number when no region matches', () => {
      const result = parseE164PhoneNumber('+999123456', REGIONS);

      expect(result).toStrictEqual({
        region: null,
        phoneNumber: '999123456',
      });
    });
  });

  describe('stripCallingCodePrefix', () => {
    it('removes the selected calling code when it prefixes the digits', () => {
      const result = stripCallingCodePrefix('441234567890', '+44');

      expect(result).toBe('1234567890');
    });

    it('keeps digits unchanged when the calling code is not a prefix', () => {
      const result = stripCallingCodePrefix('999123456', '44');

      expect(result).toBe('999123456');
    });
  });
});
