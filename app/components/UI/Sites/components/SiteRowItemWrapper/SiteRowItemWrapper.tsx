import React from 'react';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import SiteRowItem, { type SiteData } from '../SiteRowItem/SiteRowItem';
import { updateLastTrendingScreen } from '../../../../Nav/Main/MainNavigator';

interface SiteRowItemWrapperProps {
  site: SiteData;
  navigation: NavigationProp<ParamListBase>;
}

const SiteRowItemWrapper: React.FC<SiteRowItemWrapperProps> = ({
  site,
  navigation,
}) => {
  const handlePress = () => {
    // Update last trending screen state
    updateLastTrendingScreen('TrendingBrowser');

    // Navigate to TrendingBrowser (within TrendingView stack)
    navigation.navigate('TrendingBrowser', {
      newTabUrl: site.url,
      timestamp: Date.now(),
      fromTrending: true,
    });
  };

  return <SiteRowItem site={site} onPress={handlePress} />;
};

export default SiteRowItemWrapper;
