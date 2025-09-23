import React from 'react';
import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAssetFromTheme } from '../../../util/theme';
import {
  TabEmptyState,
  type TabEmptyStateProps,
} from '../../../component-library/components-temp/TabEmptyState';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import Routes from '../../../constants/navigation/Routes';

import emptyStateDefiLight from '../../../images/empty-state-defi-light.png';
import emptyStateDefiDark from '../../../images/empty-state-defi-dark.png';

export interface DefiEmptyStateProps extends TabEmptyStateProps {
  onExploreDefi?: () => void;
}

export const DefiEmptyState: React.FC<DefiEmptyStateProps> = ({
  onExploreDefi,
  ...props
}) => {
  const defiImage = useAssetFromTheme(emptyStateDefiLight, emptyStateDefiDark);
  const { navigate } = useNavigation();

  const handleExploreDefi = () => {
    if (onExploreDefi) {
      onExploreDefi();
    } else {
      // Navigate to explore tokens page in the in-app browser
      navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: AppConstants.EXPLORE_TOKENS.URL,
          timestamp: Date.now(),
        },
      });
    }
  };

  return (
    <TabEmptyState
      icon={<Image source={defiImage} />}
      description={strings('defi.empty_state.description')}
      actionButtonText={strings('defi.empty_state.explore_defi')}
      onAction={handleExploreDefi}
      {...props}
    />
  );
};
