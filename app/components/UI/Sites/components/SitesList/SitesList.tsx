import React from 'react';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
// eslint-disable-next-line no-duplicate-imports
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import SiteRowItemWrapper from '../SiteRowItemWrapper/SiteRowItemWrapper';
import type { SiteData } from '../SiteRowItem/SiteRowItem';

export interface SitesListProps {
  sites: SiteData[];
  refreshControl?: React.ReactElement;
  ListFooterComponent?: React.ReactElement | null;
}

const SitesList: React.FC<SitesListProps> = ({
  sites,
  refreshControl,
  ListFooterComponent,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const renderSiteItem = ({ item }: { item: SiteData }) => (
    <SiteRowItemWrapper site={item} navigation={navigation} />
  );

  return (
    <FlashList
      testID="sites-list"
      data={sites}
      renderItem={renderSiteItem}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      ListFooterComponent={ListFooterComponent}
    />
  );
};

SitesList.displayName = 'SitesList';

export default SitesList;
