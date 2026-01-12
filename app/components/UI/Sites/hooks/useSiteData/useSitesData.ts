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

const PORTFOLIO_API_BASE_URL = 'https://portfolio.api.cx.metamask.io/';

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

/**
 * Hook to fetch sites data from the Portfolio API
 * @param params - Parameters for the API request
 * @returns Sites data, loading state, and error
 */
export const useSitesData = (
  searchQuery?: string,
  limit = 100,
): UseSitesDataResult => {
  const [allSites, setAllSites] = useState<SiteData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSites = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use current timestamp
      const timestamp = Date.now();
      const url = `${PORTFOLIO_API_BASE_URL}explore/sites?limit=${limit}&ts=${timestamp}`;
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

      setAllSites(transformedSites);
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error(String(err));
      Logger.error(fetchError, '[useSitesData] Error fetching sites');
      setError(fetchError);
      // Don't use fallback data - return empty array to show the error
      setAllSites([]);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const refetch = useCallback(() => {
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
