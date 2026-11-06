/** Whole cents from a dollar amount the user typed, or undefined. */
export const amountToCents = (amount: string): number | undefined => {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/u.exec(amount);
  if (!match?.[1]) {
    return undefined;
  }
  const cents =
    Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : undefined;
};
