const MS_IN_DAY = 24 * 60 * 60 * 1000;
const DAYS_IN_WEEK = 7;
const DAYS_IN_MONTH = 30;
const DAYS_IN_YEAR = 365;

/**
 * Compact age pill label (e.g. "3d", "2w", "6mo", "1y") derived from a
 * token's created-at ISO timestamp. Returns `null` when the input is
 * missing, unparseable, or in the future — callers hide the pill in
 * that case per the ASSETS-4016 defensive-fallback requirement.
 */
export const formatTokenAge = (
  createdAt: string | null | undefined,
  now: number = Date.now(),
): string | null => {
  if (!createdAt) {
    return null;
  }

  const createdMs = Date.parse(createdAt);
  if (Number.isNaN(createdMs)) {
    return null;
  }

  const diffMs = now - createdMs;
  if (diffMs < 0) {
    return null;
  }

  const diffDays = Math.floor(diffMs / MS_IN_DAY);

  if (diffDays < 1) {
    return '1d';
  }
  if (diffDays < DAYS_IN_WEEK) {
    return `${diffDays}d`;
  }
  if (diffDays < DAYS_IN_MONTH) {
    return `${Math.floor(diffDays / DAYS_IN_WEEK)}w`;
  }
  if (diffDays < DAYS_IN_YEAR) {
    return `${Math.floor(diffDays / DAYS_IN_MONTH)}mo`;
  }
  return `${Math.floor(diffDays / DAYS_IN_YEAR)}y`;
};
