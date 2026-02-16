import { useEffect, useState, useCallback, useMemo } from 'react';
import Logger from '../../../../../util/Logger';
import type { SiteData } from '../../components/SiteRowItem/SiteRowItem';

interface ApiDappResponse {
  id: string;
  name: string;
  website: string;
  logoSrc?: string;
  tag?: string;
  featured?: boolean;
  partnership?: boolean;
  description?: string;
  tagline?: string;
  categories?: string[];
  networks?: string[];
  image?: string;
}

interface ApiSitesResponse {
  dapps: ApiDappResponse[];
}

interface UseSitesDataResult {
  sites: SiteData[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Module-level cache so fetched sites persist across mounts
let cachedSites: SiteData[] | null = null;

/**
 * Clears the in-memory sites cache.
 * Primarily exposed for testing purposes.
 */
export const clearSitesCache = (): void => {
  cachedSites = null;
};

// Assets team is now hosting the explore-sites endpoint on the NFT API (Temporarily)
const NFT_API_BASE_URL = 'https://nft.api.cx.metamask.io/';
const DEFAULT_SITES_LIMIT = 100;
const PORTFOLIO_HOSTNAME = 'portfolio.metamask.io';

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

/**
 * Helper function to extract display URL from full URL
 */
const extractDisplayUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
};

const isPortfolioSiteUrl = (url: string): boolean => {
  try {
    const trimmedUrl = url.trim();
    const normalizedUrl =
      trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')
        ? trimmedUrl
        : `https://${trimmedUrl}`;
    return new URL(normalizedUrl).hostname === PORTFOLIO_HOSTNAME;
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

/**
 * Hook to fetch and cache sites data from the NFT API.
 * Results are cached in memory; subsequent mounts return cached data instantly.
 * Use `refetch` to bypass the cache and fetch fresh data.
 * @param searchQuery - Optional search query to filter sites locally
 * @returns Sites data, loading state, error, and refetch function
 */
export const useSitesData = (searchQuery?: string): UseSitesDataResult => {
  const [allSites, setAllSites] = useState<SiteData[]>(cachedSites ?? []);
  const [isLoading, setIsLoading] = useState(!cachedSites);
  const [error, setError] = useState<Error | null>(null);

  const fetchSites = useCallback(async () => {
    try {
      if (cachedSites) {
        setAllSites(cachedSites);
        return;
      }

      setIsLoading(true);
      setError(null);

      // Use current timestamp
      const timestamp = Date.now();
      const url = `${NFT_API_BASE_URL}explore/sites?limit=${DEFAULT_SITES_LIMIT}&ts=${timestamp}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch sites: ${response.statusText}`);
      }

      const data = (await response.json()) as ApiSitesResponse;

      // Transform API response to SiteData format
      const transformedSites: SiteData[] = data.dapps.map((dapp) => ({
        id: dapp.id,
        name: dapp.name,
        url: dapp.website,
        displayUrl: extractDisplayUrl(dapp.website),
        logoUrl: dapp.logoSrc,
        featured: dapp.featured,
      }));

      // Ensure Portfolio is always included in the list
      const sitesWithPortfolio = mergePortfolioSite(transformedSites);

      // Update module-level cache
      cachedSites = sitesWithPortfolio;
      setAllSites(sitesWithPortfolio);
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error(String(err));
      Logger.error(fetchError, '[useSitesData] Error fetching sites');
      setError(fetchError);
      // On error, still show Portfolio as a fallback
      setAllSites([PORTFOLIO_SITE]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  // refetch always bypasses the cache
  const refetch = useCallback(() => {
    clearSitesCache();
    fetchSites();
  }, [fetchSites]);

  // Filter sites locally based on search query
  const sites = useMemo(() => {
    if (!searchQuery?.trim()) {
      return allSites;
    }

    const query = searchQuery.toLowerCase().trim();
    return allSites.filter(
      (site) =>
        site.name.toLowerCase().includes(query) ||
        site.displayUrl.toLowerCase().includes(query) ||
        site.url.toLowerCase().includes(query),
    );
  }, [allSites, searchQuery]);

  return { sites, isLoading, error, refetch };
};
