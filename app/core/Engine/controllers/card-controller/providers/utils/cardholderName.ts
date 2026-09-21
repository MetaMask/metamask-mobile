interface CardholderNameSource {
  firstName?: string | null;
  lastName?: string | null;
}

function sanitizeName(name: string): string {
  return name
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '');
}

/**
 * Galileo cardholder name: first and last name, ASCII-sanitized.
 */
export function buildBaanxCardholderName(
  user: CardholderNameSource | null | undefined,
  fallback = 'Card Holder',
): string {
  if (!user?.firstName && !user?.lastName) {
    return fallback;
  }

  const result = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((name) => sanitizeName(name as string))
    .filter(Boolean)
    .join(' ');

  return result || fallback;
}
