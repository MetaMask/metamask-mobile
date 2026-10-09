import type { Region } from '../types';

const LOCAL_PHONE_NUMBER_PATTERN = /^\d{4,15}$/;
const E164_PHONE_NUMBER_PATTERN = /^\+[1-9]\d{4,14}$/;

export interface ParsedPhoneNumber {
  phoneNumber: string;
  region: Region | null;
}

/**
 * Removes formatting characters from a phone number or calling code.
 *
 * @param value - Phone value that may contain spaces, punctuation, or `+`.
 * @returns Digits only.
 */
export const normalizePhoneDigits = (
  value: string | null | undefined,
): string => (value ?? '').replace(/\D/g, '');

/**
 * Applies the same local-number validation used by Immersve onboarding.
 *
 * @param phoneNumber - Local phone number without a calling code.
 * @returns Whether the number contains between 4 and 15 digits.
 */
export const isValidLocalPhoneNumber = (phoneNumber: string): boolean =>
  LOCAL_PHONE_NUMBER_PATTERN.test(phoneNumber);

/**
 * Validates the final phone value accepted by the Immersve API.
 *
 * @param phoneNumber - Phone number in E.164 form.
 * @returns Whether the value is a `+` followed by 5 to 15 digits.
 */
export const isValidE164PhoneNumber = (phoneNumber: string): boolean =>
  E164_PHONE_NUMBER_PATTERN.test(phoneNumber);

/**
 * Combines a calling code and local phone number in E.164 form.
 *
 * @param areaCode - Country calling code.
 * @param phoneNumber - Local phone number.
 * @returns A `+`-prefixed phone number.
 */
export const formatE164PhoneNumber = (
  areaCode: string,
  phoneNumber: string,
): string =>
  `+${normalizePhoneDigits(areaCode)}${normalizePhoneDigits(phoneNumber)}`;

/**
 * Removes a calling-code prefix from phone digits when the selected region
 * already appears at the start of the value. This keeps unmatched stored
 * E.164 numbers from being double-prefixed after a region is chosen.
 *
 * @param phoneNumber - Local or fully-qualified phone digits.
 * @param areaCode - Country calling code.
 * @returns Digits without the calling-code prefix when it was present.
 */
export const stripCallingCodePrefix = (
  phoneNumber: string,
  areaCode: string,
): string => {
  const digits = normalizePhoneDigits(phoneNumber);
  const code = normalizePhoneDigits(areaCode);
  if (code.length === 0 || !digits.startsWith(code)) {
    return digits;
  }
  return digits.slice(code.length);
};

/**
 * Splits an E.164 number into a region and local number. The card's region is
 * preferred when calling codes are shared; otherwise the longest matching
 * calling code wins.
 *
 * @param phone - E.164 phone number.
 * @param regions - Available phone regions.
 * @param preferredRegionKey - Card region used to disambiguate calling codes.
 * @returns The matched region and local phone number.
 */
export const parseE164PhoneNumber = (
  phone: string | null | undefined,
  regions: Region[],
  preferredRegionKey?: string | null,
): ParsedPhoneNumber => {
  const digits = normalizePhoneDigits(phone);
  const candidates = regions
    .filter((region) => {
      const areaCode = normalizePhoneDigits(region.areaCode);
      return areaCode.length > 0 && digits.startsWith(areaCode);
    })
    .sort(
      (a, b) =>
        normalizePhoneDigits(b.areaCode).length -
        normalizePhoneDigits(a.areaCode).length,
    );

  const region =
    candidates.find((candidate) => candidate.key === preferredRegionKey) ??
    candidates[0] ??
    null;
  const areaCodeLength = normalizePhoneDigits(region?.areaCode).length;

  return {
    region,
    phoneNumber: region ? digits.slice(areaCodeLength) : digits,
  };
};
