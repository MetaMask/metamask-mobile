import React from 'react';
import SiteRowItem, { type SiteData } from '../SiteRowItem/SiteRowItem';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

interface SiteRowItemWrapperProps {
  site: SiteData;
  navigation: AppNavigationProp;
  onRemoveFavorite?: () => void;
}

const SiteRowItemWrapper: React.FC<SiteRowItemWrapperProps> = ({
  site,
  navigation,
  onRemoveFavorite,
}) => {
  const handlePress = () => {
    navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: site.url,
        timestamp: Date.now(),
        fromTrending: true,
      },
    });
  };

  return (
    <SiteRowItem
      site={site}
      onPress={handlePress}
      onRemoveFavorite={onRemoveFavorite}
    />
  );
};

export default SiteRowItemWrapper;
