import { useCallback, useEffect, useState } from 'react';
import images from '../../../../../images/image-icons';
import type { SiteData } from '../../../../UI/Sites/components/SiteRowItem/SiteRowItem';
import { NFT_API_BASE_URL } from '../../../../UI/Sites/hooks/useSiteData/useSitesData';

const NETWORKS: SiteData[] = [
  {
    id: 'network-linea',
    name: 'Linea',
    url: 'https://portfolio.metamask.io/explore/networks/linea',
    displayUrl: 'Linea Hub',
    logoSource: images['LINEA-MAINNET'],
  },
  {
    id: 'network-sei',
    name: 'Sei',
    url: 'https://portfolio.metamask.io/explore/networks/sei',
    displayUrl: 'Sei Hub',
    logoSource: images.SEI,
  },
  {
    id: 'network-monad',
    name: 'Monad',
    url: 'https://portfolio.metamask.io/explore/networks/monad',
    displayUrl: 'Monad Hub',
    logoSource: images.MON,
  },
  {
    id: 'network-solana',
    name: 'Solana',
    url: 'https://portfolio.metamask.io/explore/networks/solana',
    displayUrl: 'Solana Hub',
    logoSource: images.SOLANA,
  },
  {
    id: 'network-tron',
    name: 'Tron',
    url: 'https://portfolio.metamask.io/explore/networks/tron',
    displayUrl: 'Tron Hub',
    logoSource: images.TRON,
  },
  {
    id: 'network-stellar',
    name: 'Stellar',
    url: 'https://portfolio.metamask.io/explore/networks/stellar',
    displayUrl: 'Stellar Hub',
    logoSource: images.STELLAR,
  },
];

interface ApiEcosystem {
  id: string;
  networkName: string;
  logo: string;
  hubUrl: string;
}

const toSiteData = (ecosystem: ApiEcosystem): SiteData => ({
  id: ecosystem.id,
  name: ecosystem.networkName,
  url: ecosystem.hubUrl,
  displayUrl: `${ecosystem.networkName} Hub`,
  logoUrl: ecosystem.logo,
});

export interface UseNetworksFeedResult {
  data: SiteData[];
  isLoading: false;
  refetch: () => Promise<void>;
}

export const useNetworksFeed = (): UseNetworksFeedResult => {
  const [data, setData] = useState<SiteData[]>(NETWORKS);

  const refetch = useCallback(async () => {
    try {
      const response = await fetch(
        `${NFT_API_BASE_URL}explore/sites/ecosystems`,
      );
      const { ecosystems } = (await response.json()) as {
        ecosystems?: ApiEcosystem[];
      };
      if (response.ok && ecosystems?.length) {
        setData(ecosystems.map(toSiteData));
      }
    } catch {
      setData(NETWORKS);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading: false, refetch };
};
