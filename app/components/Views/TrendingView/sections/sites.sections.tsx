import React from 'react';
import { IconName as DSIconName } from '@metamask/design-system-react-native';
import type { SiteData } from '../../../UI/Sites/components/SiteRowItem/SiteRowItem';
import SiteRowItemWrapper from '../../../UI/Sites/components/SiteRowItemWrapper/SiteRowItemWrapper';
import SiteSkeleton from '../../../UI/Sites/components/SiteSkeleton/SiteSkeleton';
import { useSitesData } from '../../../UI/Sites/hooks/useSiteData/useSitesData';
import { useBrowserRecentsSites } from '../../../UI/Sites/hooks/useBrowserRecentsSites/useBrowserRecentsSites';
import SectionCard from '../components/Sections/SectionTypes/SectionCard';
import SiteRecentsTileRowItem from '../components/Sections/SectionTypes/SiteRecentsTileRowItem/SiteRecentsTileRowItem';
import SiteRecentsTileSkeleton from '../components/Sections/SectionTypes/SiteRecentsTileRowItem/SiteRecentsTileSkeleton';
import TileSection from '../components/Sections/SectionTypes/TileSection';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import type { SectionConfig } from './types';

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
