import {
  formatE164PhoneNumber,
  isValidLocalPhoneNumber,
  normalizePhoneDigits,
  stripCallingCodePrefix,
} from '../../util/contactDetails';

function isEmailLabel(label: string): boolean {
  if (label.length === 0) return false;
  for (const char of label) {
    if (char === '.' || char === '@' || char.trim() === '') return false;
  }
  return true;
}

/** True when every label is non-empty and the domain has at least one dot. */
function isEmailAddress(value: string): boolean {
  const at = value.indexOf('@');
  if (at <= 0 || value.indexOf('@', at + 1) !== -1) return false;
  const localLabels = value.slice(0, at).split('.');
  const domainLabels = value.slice(at + 1).split('.');
  return (
    domainLabels.length >= 2 &&
    localLabels.every(isEmailLabel) &&
    domainLabels.every(isEmailLabel)
  );
}

/** Leading calling code from a masked phone such as "+64 *****1234". */
export function callingCodeFromMaskedPhone(masked: string): string | null {
  const match = /^\+(\d+)/.exec(masked.trim());
  return match?.[1] ?? null;
}

export function toE164Phone(
  areaCode: string,
  nationalNumber: string,
): string | null {
  if (normalizePhoneDigits(areaCode).length === 0) return null;
  const localNumber = stripCallingCodePrefix(nationalNumber, areaCode);
  if (!isValidLocalPhoneNumber(localNumber)) return null;
  return formatE164PhoneNumber(areaCode, localNumber);
}

export function normalizeMfaEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (!isEmailAddress(email)) return null;
  return email;
}
