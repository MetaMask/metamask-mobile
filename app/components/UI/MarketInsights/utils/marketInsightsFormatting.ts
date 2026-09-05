import type { MarketInsightsSource } from '@metamask/ai-controllers';
import { strings } from '../../../../../locales/i18n';

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
  if (isNaN(date.getTime())) return '';
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return nowLabel;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export const formatInsightRefreshLabel = (generatedAt: string): string => {
  const date = new Date(generatedAt);
  if (isNaN(date.getTime())) {
    return '';
  }

  const diffMs = Date.now() - date.getTime();

  if (diffMs <= SIX_HOURS_MS) {
    return formatRelativeTime(generatedAt);
  }
  if (diffMs < TWENTY_FOUR_HOURS_MS) {
    return strings('market_insights.refresh_today');
  }
  if (diffMs < FORTY_EIGHT_HOURS_MS) {
    return strings('market_insights.refresh_yesterday');
  }
  return '';
};

export const getNormalizedHandle = (author: string): string =>
  `@${author.replace(/^@+/, '')}`;

export const isXSourceUrl = (source: string): boolean => {
  const trimmedSource = source.trim();
  const normalized = trimmedSource.toLowerCase();

  if (normalized === 'x' || normalized === 'twitter') {
    return true;
  }

  try {
    const normalizedSource = trimmedSource.includes('://')
      ? trimmedSource
      : `https://${trimmedSource}`;
    const hostname = new URL(normalizedSource).hostname
      .replace(/^www\./, '')
      .toLowerCase();
    return (
      hostname === 'x.com' ||
      hostname.endsWith('.x.com') ||
      hostname === 'twitter.com' ||
      hostname.endsWith('.twitter.com')
    );
  } catch {
    return false;
  }
};

const SAFE_URL_SCHEMES = ['http:', 'https:'];

export const isSafeUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return SAFE_URL_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
};

export const getUniqueSourcesByFavicon = (
  sources: MarketInsightsSource[],
): MarketInsightsSource[] => {
  const seenFaviconUrls = new Set<string>();

  return sources.filter((source) => {
    const faviconUrl = getFaviconUrl(source.url);
    if (seenFaviconUrls.has(faviconUrl)) {
      return false;
    }
    seenFaviconUrls.add(faviconUrl);
    return true;
  });
};
