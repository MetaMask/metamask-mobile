import React from 'react';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import SiteRowItem, { type SiteData } from './SiteRowItem/SiteRowItem';
import Routes from '../../../../constants/navigation/Routes';

interface SiteRowItemWrapperProps {
  site: SiteData;
  navigation: NavigationProp<ParamListBase>;
}

const SiteRowItemWrapper: React.FC<SiteRowItemWrapperProps> = ({
  site,
  navigation,
}) => {
  const handlePress = () => {
    // Navigate to the browser with a new tab
    navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: site.url,
        timestamp: Date.now(),
      },
    });
  };

  return <SiteRowItem site={site} onPress={handlePress} />;
};

export default SiteRowItemWrapper;
