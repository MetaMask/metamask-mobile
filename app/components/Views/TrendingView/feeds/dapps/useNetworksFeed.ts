import images from '../../../../../images/image-icons';
import type { SiteData } from '../../../../UI/Sites/components/SiteRowItem/SiteRowItem';

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
];

export interface UseNetworksFeedResult {
  data: SiteData[];
  isLoading: false;
  refetch: () => Promise<void>;
}

/** Static list of network "hub" sites; no remote fetch. */
export const useNetworksFeed = (): UseNetworksFeedResult => ({
  data: NETWORKS,
  isLoading: false,
  refetch: async () => {
    /* Static data; no remote refetch. */
  },
});
