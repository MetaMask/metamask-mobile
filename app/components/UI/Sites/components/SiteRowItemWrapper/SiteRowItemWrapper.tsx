import React from 'react';
import type { NavigationProp } from '@react-navigation/native';
import type { RootParamList } from '../../../../../types/navigation';
import SiteRowItem, { type SiteData } from '../SiteRowItem/SiteRowItem';
import Routes from '../../../../../constants/navigation/Routes';
interface SiteRowItemWrapperProps {
  site: SiteData;
  navigation: NavigationProp<RootParamList>;
}

const SiteRowItemWrapper: React.FC<SiteRowItemWrapperProps> = ({
  site,
  navigation,
}) => {
  const handlePress = () => {
    // Use function cast for nested navigation with dynamic params
    (navigation.navigate as (route: string, params: object) => void)(
      Routes.BROWSER.HOME,
      {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: site.url,
          timestamp: Date.now(),
          fromTrending: true,
        },
      },
    );
  };

  return <SiteRowItem site={site} onPress={handlePress} />;
};

export default SiteRowItemWrapper;
