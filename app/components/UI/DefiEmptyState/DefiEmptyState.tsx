import React from 'react';
import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useAssetFromTheme } from '../../../util/theme';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  TabEmptyState,
  type TabEmptyStateProps,
} from '../../../component-library/components-temp/TabEmptyState';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { selectExplorePageV2EnabledFlag } from '../../../selectors/featureFlagController/explorePageV2';
import { EXPLORE_TAB_INDEX } from '../../Views/TrendingView/TrendingView';

import emptyStateDefiLight from '../../../images/empty-state-defi-light.png';
import emptyStateDefiDark from '../../../images/empty-state-defi-dark.png';

export interface DefiEmptyStateProps extends TabEmptyStateProps {}

export const DefiEmptyState: React.FC<DefiEmptyStateProps> = (props) => {
  const defiImage = useAssetFromTheme(emptyStateDefiLight, emptyStateDefiDark);
  const { navigate } = useNavigation();
  const tw = useTailwind();
  const isExplorePageV2Enabled = useSelector(selectExplorePageV2EnabledFlag);

  const handleExploreDefi = () => {
    if (isExplorePageV2Enabled) {
      navigate(Routes.TRENDING_VIEW, {
        screen: Routes.TRENDING_FEED,
        params: {
          initialTab: EXPLORE_TAB_INDEX.SITES,
        },
      });
      return;
    }

    // Open the Explore tab on the main feed, then push Sites (root stack).
    navigate(Routes.TRENDING_VIEW, {
      screen: Routes.TRENDING_FEED,
    });
    navigate(Routes.SITES_FULL_VIEW);
  };

  return (
    <TabEmptyState
      icon={
        <Image
          source={defiImage}
          resizeMode="contain"
          style={tw.style('w-[72px] h-[72px]')}
        />
      }
      description={strings('defi_positions.empty_state.description')}
      actionButtonText={strings('defi_positions.empty_state.explore_defi')}
      onAction={handleExploreDefi}
      {...props}
    />
  );
};
