/**
 * X (Twitter) handle from a social-api `socialHandles` object.
 * A blank or `@`-only value means the trader is not connected.
 */
export const readXHandle = (
  handles: { twitter?: string | null } | null | undefined,
): string | null => {
  const twitter = handles?.twitter?.trim().replace(/^@+/u, '');
  return twitter || null;
};
