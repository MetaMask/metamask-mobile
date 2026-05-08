import React, { useCallback } from 'react';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import SiteRowItem, { SiteData } from '../SiteRowItem/SiteRowItem';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

export interface SitesListProps {
  sites: SiteData[];
  refreshControl?: React.ReactElement;
  ListFooterComponent?: React.ReactElement | null;
  onRemoveFavorite?: (site: SiteData) => void;
}

const SitesList: React.FC<SitesListProps> = ({
  sites,
  refreshControl,
  ListFooterComponent,
  onRemoveFavorite,
}) => {
  const navigation = useNavigation<AppNavigationProp>();

  const renderSiteItem = useCallback(
    ({ item }: { item: SiteData }) => {
      const handlePress = () => {
        navigation.navigate(Routes.BROWSER.HOME, {
          screen: Routes.BROWSER.VIEW,
          params: {
            newTabUrl: item.url,
            timestamp: Date.now(),
            fromTrending: true,
          },
        });
      };

      return (
        <SiteRowItem
          site={item}
          onPress={handlePress}
          onRemoveFavorite={
            onRemoveFavorite ? () => onRemoveFavorite(item) : undefined
          }
        />
      );
    },
    [navigation, onRemoveFavorite],
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
