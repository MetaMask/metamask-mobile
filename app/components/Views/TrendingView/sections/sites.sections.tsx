import React from 'react';
import { useDispatch } from 'react-redux';
import { IconName as DSIconName } from '@metamask/design-system-react-native';
import images from '../../../../images/image-icons';
import { removeBookmark } from '../../../../actions/bookmarks';
import type { SiteData } from '../../../UI/Sites/components/SiteRowItem/SiteRowItem';
import SiteRowItemWrapper from '../../../UI/Sites/components/SiteRowItemWrapper/SiteRowItemWrapper';
import SiteSkeleton from '../../../UI/Sites/components/SiteSkeleton/SiteSkeleton';
import { useSitesData } from '../../../UI/Sites/hooks/useSiteData/useSitesData';
import { useBrowserRecentsSites } from '../../../UI/Sites/hooks/useBrowserRecentsSites/useBrowserRecentsSites';
import { useBrowserFavoritesSites } from '../../../UI/Sites/hooks/useBrowserFavoritesSites/useBrowserFavoritesSites';
import SectionCard from '../components/Sections/SectionTypes/SectionCard';
import SiteRecentsTileRowItem from '../components/Sections/SectionTypes/TilesSection/TileTypes/SiteRecentsTileRowItem';
import SiteRecentsTileSkeleton from '../components/Sections/SectionTypes/TilesSection/TileTypes/SiteRecentsTileSkeleton';
import TileSection from '../components/Sections/SectionTypes/TilesSection/TileSection';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import type { SectionConfig } from './types';

const NETWORKS_SITES: SiteData[] = [
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

export const sitesSections = {
  dapps_recents: {
    id: 'dapps_recents',
    title: strings('autocomplete.recents'),
    icon: { source: 'design-system', name: DSIconName.Global },
    showViewAllInHeader: false,
    showViewMoreTile: false,
    viewAllAction: (_navigation) => {
      /* Section has no "view all" — required by config shape */
    },
    getItemIdentifier: (item) => (item as Partial<SiteData>).url ?? '',
    RowItem: SiteRecentsTileRowItem,
    Skeleton: SiteRecentsTileSkeleton,
    Section: TileSection,
    useSectionData: () => {
      const { data, isLoading, refetch } = useBrowserRecentsSites();
      return { data, isLoading, refetch };
    },
  } satisfies SectionConfig,

  dapps_networks: {
    id: 'dapps_networks',
    title: strings('trending.ecosystems'),
    subtitle: strings('trending.ecosystems_subtitle'),
    icon: { source: 'design-system', name: DSIconName.Global },
    showViewAllInHeader: false,
    showViewMoreTile: false,
    viewAllAction: (_navigation) => {
      /* Section has no "view all" */
    },
    getItemIdentifier: (item) => (item as Partial<SiteData>).url ?? '',
    RowItem: SiteRecentsTileRowItem,
    Skeleton: SiteRecentsTileSkeleton,
    Section: TileSection,
    useSectionData: () => ({
      data: NETWORKS_SITES,
      isLoading: false,
      refetch: async () => {
        /* Static data; no remote refetch. */
      },
    }),
  } satisfies SectionConfig,

  dapps_favorites: {
    id: 'dapps_favorites',
    title: strings('autocomplete.favorites'),
    icon: { source: 'design-system', name: DSIconName.Star },
    viewAllAction: (navigation) => {
      navigation.navigate(Routes.SITES_FULL_VIEW, { mode: 'favorites' });
    },
    getItemIdentifier: (item) => (item as Partial<SiteData>).url ?? '',
    RowItem: ({ item, navigation }) => {
      const dispatch = useDispatch();
      const site = item as SiteData;
      return (
        <SiteRowItemWrapper
          site={site}
          navigation={navigation}
          onRemoveFavorite={() =>
            dispatch(removeBookmark({ url: site.url, name: site.name }))
          }
        />
      );
    },
    Skeleton: SiteSkeleton,
    Section: SectionCard,
    useSectionData: () => {
      const { data, isLoading, refetch } = useBrowserFavoritesSites();
      return { data, isLoading, refetch };
    },
  } satisfies SectionConfig,

  sites: {
    id: 'sites',
    title: strings('trending.sites'),
    icon: { source: 'design-system', name: DSIconName.Global },
    viewAllAction: (navigation) => {
      navigation.navigate(Routes.SITES_FULL_VIEW);
    },
    getItemIdentifier: (item) => (item as Partial<SiteData>).url ?? '',
    RowItem: ({ item, navigation }) => (
      <SiteRowItemWrapper site={item as SiteData} navigation={navigation} />
    ),
    Skeleton: SiteSkeleton,
    Section: SectionCard,
    useSectionData: (searchQuery) => {
      const { sites, isLoading, refetch } = useSitesData(searchQuery);
      return { data: sites, isLoading, refetch };
    },
  } satisfies SectionConfig,
} satisfies Record<string, SectionConfig>;
