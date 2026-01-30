import React from 'react';
import type { RootNavigationProp } from '../../../../../util/navigation/types';
import SiteRowItem, { type SiteData } from '../SiteRowItem/SiteRowItem';
import Routes from '../../../../../constants/navigation/Routes';
interface SiteRowItemWrapperProps {
  site: SiteData;
  navigation: RootNavigationProp;
}

const SiteRowItemWrapper: React.FC<SiteRowItemWrapperProps> = ({
  site,
  navigation,
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

  return <SiteRowItem site={site} onPress={handlePress} />;
};

export default SiteRowItemWrapper;
