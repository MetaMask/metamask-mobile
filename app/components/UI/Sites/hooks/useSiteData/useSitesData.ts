import { useCallback, useEffect, useMemo } from 'react';
import {
  array,
  boolean,
  create,
  optional,
  string,
  type,
} from '@metamask/superstruct';
import { useNetworkQuery } from '../../../../../core/Networking/useNetworkQuery';
import Logger from '../../../../../util/Logger';
import { prefixUrlWithProtocol } from '../../../../../util/browser';
import type { SiteData } from '../../components/SiteRowItem/SiteRowItem';

interface UseSitesDataResult {
  sites: SiteData[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Assets team is now hosting the explore-sites endpoint on the NFT API (Temporarily)
const SITES_URL = 'https://nft.api.cx.metamask.io/explore/sites?limit=100';
const PORTFOLIO_HOSTNAME = 'portfolio.metamask.io';
const SITES_QUERY_KEY = ['explore-sites'];

// Only the fields the app reads; `type` ignores the rest of each dapp.
const SitesResponseSchema = type({
  dapps: array(
    type({
      id: string(),
      name: string(),
      website: string(),
      logoSrc: optional(string()),
      featured: optional(boolean()),
    }),
  ),
});

/**
 * Hardcoded Portfolio site entry to ensure it's always included
 * in the sites list regardless of API response
 */
const PORTFOLIO_SITE: SiteData = {
  id: 'metamask-portfolio',
  name: 'MetaMask Portfolio',
  url: `https://${PORTFOLIO_HOSTNAME}`,
  displayUrl: PORTFOLIO_HOSTNAME,
  logoUrl:
    'https://raw.githubusercontent.com/MetaMask/metamask-mobile/main/logo.png',
  featured: true,
  logoNeedsPadding: true,
};

const NO_SITES: SiteData[] = [];
const FALLBACK_SITES: SiteData[] = [PORTFOLIO_SITE];

/**
 * Returns just the hostname (no www., no path) — used for curated site cards
 * where a clean domain label is preferred.
 */
export const extractDisplayUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
};

/**
 * Returns the full URL without the protocol (e.g. `uniswap.org/swap?chain=1`).
 * Used for user-generated entries (recents, favorites) where the full path
 * provides meaningful context.
 */
export const extractFullDisplayUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const withoutProtocol = url.slice(urlObj.protocol.length + 2); // strip "scheme://"
    return withoutProtocol.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export const matchesSiteQuery = (site: SiteData, query: string): boolean => {
  const q = query.toLowerCase();
  return (
    site.name.toLowerCase().includes(q) ||
    site.displayUrl.toLowerCase().includes(q) ||
    site.url.toLowerCase().includes(q)
  );
};

const isPortfolioSiteUrl = (url: string): boolean => {
  try {
    return (
      new URL(prefixUrlWithProtocol(url.trim())).hostname === PORTFOLIO_HOSTNAME
    );
  } catch {
    return false;
  }
};

/**
 * Helper function to merge Portfolio site with API sites,
 * ensuring Portfolio is always included at the beginning
 */
const mergePortfolioSite = (sites: SiteData[]): SiteData[] => {
  // Check if Portfolio is already in the list (by URL match)
  const portfolioExists = sites.some(
    (site) => isPortfolioSiteUrl(site.url) || site.id === PORTFOLIO_SITE.id,
  );

  if (portfolioExists) {
    return sites;
  }

  // Add Portfolio at the beginning of the list
  return [PORTFOLIO_SITE, ...sites];
};

/** Throws on a body that does not match the schema; the hook does not retry it. */
const parseSites = (body: unknown): SiteData[] => {
  const { dapps } = create(body, SitesResponseSchema);
  const sites = dapps.map((dapp) => ({
    id: dapp.id,
    name: dapp.name,
    url: dapp.website,
    displayUrl: extractDisplayUrl(dapp.website),
    logoUrl: dapp.logoSrc,
    featured: dapp.featured,
  }));
  return mergePortfolioSite(sites);
};

/**
 * Before the first response: nothing while loading (the skeleton shows), and
 * Portfolio alone when offline or after the last retry fails. Once a response
 * arrives, its sites stay even if a later refetch fails.
 */
const resolveSites = (
  data: SiteData[] | undefined,
  isLoading: boolean,
): SiteData[] => {
  if (data) return data;
  if (isLoading) return NO_SITES;
  return FALLBACK_SITES;
};

/**
 * Sites from the NFT API, shared by every screen through the query cache.
 * `useNetworkQuery` makes the request: it times out, retries, pauses offline
 * and sizes the cache for the device. This hook only names the URL, validates
 * the body and decides what to show.
 * @param searchQuery - Optional search query to filter sites locally
 * @returns Sites data, loading state, error, and refetch function
 */
export const useSitesData = (searchQuery?: string): UseSitesDataResult => {
  const { data, isLoading, error, refetch } = useNetworkQuery({
    queryKey: SITES_QUERY_KEY,
    url: SITES_URL,
    parse: parseSites,
    // A curated list: one request per session, plus pull-to-refresh.
    staleTime: Infinity,
  });
  const allSites = resolveSites(data, isLoading);

  // Logs once the retries are spent, not on every failed attempt.
  useEffect(() => {
    if (error) Logger.error(error, '[useSitesData] Error fetching sites');
  }, [error]);

  // Filter sites locally based on search query
  const sites = useMemo(() => {
    const query = searchQuery?.trim() ?? '';
    return query
      ? allSites.filter((site) => matchesSiteQuery(site, query))
      : allSites;
  }, [allSites, searchQuery]);

  // Callers do not await: the query state carries the result.
  const refetchSites = useCallback(() => {
    void refetch();
  }, [refetch]);

  return { sites, isLoading, error, refetch: refetchSites };
};
