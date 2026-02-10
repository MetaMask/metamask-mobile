import React from 'react';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import SiteRowItem, { type SiteData } from '../SiteRowItem/SiteRowItem';
import Routes from '../../../../../constants/navigation/Routes';
interface SiteRowItemWrapperProps {
  site: SiteData;
  navigation: NavigationProp<ParamListBase>;
}

const SiteRowItemWrapper: React.FC<SiteRowItemWrapperProps> = ({
  site,
  navigation,
}) => {
  const handlePress = () => {
    navigation.navigate(Routes.BROWSER.VIEW, {
      newTabUrl: site.url,
      timestamp: Date.now(),
      fromTrending: true,
    });
  };

  return <SiteRowItem site={site} onPress={handlePress} />;
};

export default SiteRowItemWrapper;
