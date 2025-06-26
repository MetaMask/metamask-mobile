import { renderHook } from '@testing-library/react-hooks';
import usePhoneNumberFormatter from './usePhoneFormatter';
import { CountryCode } from 'libphonenumber-js/core';

describe('usePhoneNumberFormatter', () => {
  describe('formatAsYouType', () => {
    it('should return empty string for empty input', () => {
      const { result } = renderHook(() => usePhoneNumberFormatter('US'));

      expect(result.current.formatAsYouType('')).toBe('');
    });

    it('should format US phone numbers correctly', () => {
      const { result } = renderHook(() => usePhoneNumberFormatter('US'));

      expect(result.current.formatAsYouType('1234567890')).toBe('234567890');
      expect(result.current.formatAsYouType('123')).toBe('23');
      expect(result.current.formatAsYouType('1234')).toBe('234');
      expect(result.current.formatAsYouType('123456')).toBe('23456');
    });

    it('should handle invalid phone numbers gracefully', () => {
      const { result } = renderHook(() => usePhoneNumberFormatter('US'));

      expect(result.current.formatAsYouType('invalid')).toBe('invalid');
      expect(result.current.formatAsYouType('123abc456')).toBe('23');
    });

    it('should handle very short inputs', () => {
      const { result } = renderHook(() => usePhoneNumberFormatter('US'));

      expect(result.current.formatAsYouType('1')).toBe('+1');
      expect(result.current.formatAsYouType('12')).toBe('2');
    });

    it('should handle inputs with special characters', () => {
      const { result } = renderHook(() => usePhoneNumberFormatter('US'));

      expect(result.current.formatAsYouType('123-456-7890')).toBe('234567890');
      expect(result.current.formatAsYouType('(123) 456-7890')).toBe(
        '234567890',
      );
    });
  });

  describe('formatE164', () => {
    it('should return empty string for empty input', () => {
      const { result } = renderHook(() => usePhoneNumberFormatter('US'));

      expect(result.current.formatE164('')).toBe('');
    });

    it('should format US phone numbers to E.164 format', () => {
      const { result } = renderHook(() => usePhoneNumberFormatter('US'));

      expect(result.current.formatE164('1234567890')).toBe('+1234567890');
      expect(result.current.formatE164('(123) 456-7890')).toBe('+1234567890');
      expect(result.current.formatE164('123-456-7890')).toBe('+1234567890');
    });

    it('should handle partial phone numbers by adding country code', () => {
      const { result } = renderHook(() => usePhoneNumberFormatter('US'));

      expect(result.current.formatE164('123456789')).toBe('+123456789');
      expect(result.current.formatE164('123')).toBe('+123');
    });

    it('should handle inputs that are already in E.164 format', () => {
      const { result } = renderHook(() => usePhoneNumberFormatter('US'));

      expect(result.current.formatE164('+11234567890')).toBe('+1234567890');
      expect(result.current.formatE164('+442071234567')).toBe('+442071234567');
    });

    it('should handle invalid phone numbers gracefully', () => {
      const { result } = renderHook(() => usePhoneNumberFormatter('US'));

      expect(result.current.formatE164('invalid')).toBe('invalid');
      expect(result.current.formatE164('123abc456')).toBe('+123');
    });

    it('should handle inputs with only digits', () => {
      const { result } = renderHook(() => usePhoneNumberFormatter('US'));

      expect(result.current.formatE164('1234567890')).toBe('+1234567890');
    });
  });

  describe('country parameter', () => {
    it('should use US as default country when no country is provided', () => {
      const { result } = renderHook(() => usePhoneNumberFormatter());

      expect(result.current.formatAsYouType('1234567890')).toBe('234567890');
      expect(result.current.formatE164('1234567890')).toBe('+1234567890');
    });

    it('should format differently for different countries', () => {
      const { result: usResult } = renderHook(() =>
        usePhoneNumberFormatter('US'),
      );
      const { result: gbResult } = renderHook(() =>
        usePhoneNumberFormatter('GB'),
      );

      expect(usResult.current.formatAsYouType('1234567890')).toBe('234567890');
      expect(gbResult.current.formatAsYouType('1234567890')).not.toBe(
        '234567890',
      );
    });
  });

  describe('error handling', () => {
    it('should handle libphonenumber-js errors gracefully', () => {
      const { result } = renderHook(() => usePhoneNumberFormatter('US'));

      // Test with malformed input that might cause internal errors
      expect(result.current.formatAsYouType('999999999999999999999')).toBe(
        '999999999999999999999',
      );
      expect(result.current.formatE164('999999999999999999999')).toBe(
        '+1999999999999999999999',
      );
    });

    it('should return original input when parsing fails', () => {
      const { result } = renderHook(() => usePhoneNumberFormatter('US'));

      expect(result.current.formatAsYouType('abc123def')).toBe('23');
      expect(result.current.formatE164('abc123def')).toBe('+123');
    });
  });

  describe('edge cases', () => {
    it('should handle null and undefined inputs', () => {
      const { result } = renderHook(() => usePhoneNumberFormatter('US'));

      expect(result.current.formatAsYouType(null as any)).toBe('');
      expect(result.current.formatE164(null as any)).toBe('');
      expect(result.current.formatAsYouType(undefined as any)).toBe('');
      expect(result.current.formatE164(undefined as any)).toBe('');
    });

    it('should handle inputs with only special characters', () => {
      const { result } = renderHook(() => usePhoneNumberFormatter('US'));

      expect(result.current.formatAsYouType('---')).toBe('---');
      expect(result.current.formatE164('---')).toBe('---');
      expect(result.current.formatAsYouType('()()()')).toBe('()()()');
      expect(result.current.formatE164('()()()')).toBe('()()()');
    });
  });
});
