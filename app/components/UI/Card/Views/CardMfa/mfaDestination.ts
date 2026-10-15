const NATIONAL_NUMBER = /^\d{4,15}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Leading calling code from a masked phone such as "+64 *****1234". */
export function callingCodeFromMaskedPhone(masked: string): string | null {
  const match = /^\+(\d+)/.exec(masked.trim());
  return match?.[1] ?? null;
}

export function toE164Phone(
  areaCode: string,
  nationalNumber: string,
): string | null {
  const digits = nationalNumber.replace(/\D/g, '');
  if (!areaCode || !NATIONAL_NUMBER.test(digits)) return null;
  return `+${areaCode}${digits}`;
}

export function normalizeMfaEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (!EMAIL.test(email)) return null;
  return email;
}
