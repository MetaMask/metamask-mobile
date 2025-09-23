import React from 'react';
import { Image } from 'react-native';
import { allowLinkOpen } from '../../../util/browser';
import { useAssetFromTheme } from '../../../util/theme';
import { TabEmptyState } from '../../../component-library/components-temp/TabEmptyState';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';

import emptyStateDefiLight from '../../../images/empty-state-defi-light.png';
import emptyStateDefiDark from '../../../images/empty-state-defi-dark.png';

export interface DefiEmptyStateProps {
  onExploreDefi?: () => void;
}

export const DefiEmptyState: React.FC<DefiEmptyStateProps> = ({
  onExploreDefi,
}) => {
  const defiImage = useAssetFromTheme(emptyStateDefiLight, emptyStateDefiDark);

  const handleExploreDefi = () => {
    if (onExploreDefi) {
      onExploreDefi();
    } else {
      allowLinkOpen(AppConstants.EXPLORE_TOKENS.URL);
    }
  };

  return (
    <TabEmptyState
      icon={<Image source={defiImage} />}
      description={strings('defi.empty_state.description')}
      actionButtonText={strings('defi.empty_state.explore_defi')}
      onAction={handleExploreDefi}
    />
  );
};
