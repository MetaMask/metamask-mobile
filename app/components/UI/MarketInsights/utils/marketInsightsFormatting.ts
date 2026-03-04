export interface RelativeTimeOptions {
  nowLabel?: string;
}

export const getFaviconUrl = (source: string): string => {
  const trimmedSource = source.trim();

  try {
    const normalizedSource = trimmedSource.includes('://')
      ? trimmedSource
      : `https://${trimmedSource}`;
    const domain = new URL(normalizedSource).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
      domain,
    )}&sz=32`;
  } catch {
    const fallbackDomain = trimmedSource.split('/')[0];
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
      fallbackDomain,
    )}&sz=32`;
  }
};

export const formatRelativeTime = (
  dateString: string,
  options: RelativeTimeOptions = {},
): string => {
  const { nowLabel = 'just now' } = options;
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return nowLabel;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};
