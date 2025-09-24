import React from 'react';
import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAssetFromTheme } from '../../../util/theme';
import {
  TabEmptyState,
  type TabEmptyStateProps,
} from '../../../component-library/components-temp/TabEmptyState';
import { strings } from '../../../../locales/i18n';
import { useSwapBridgeNavigation } from '../Bridge/hooks/useSwapBridgeNavigation';
import { SwapBridgeNavigationLocation } from '../Bridge/hooks/useSwapBridgeNavigation';

import emptyStateActivityLight from '../../../images/empty-state-activity-light.png';
import emptyStateActivityDark from '../../../images/empty-state-activity-dark.png';

export interface TransactionActivityEmptyStateProps extends TabEmptyStateProps {}

export const TransactionActivityEmptyState: React.FC<TransactionActivityEmptyStateProps> = (props) => {
  const activityImage = useAssetFromTheme(emptyStateActivityLight, emptyStateActivityDark);
  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.TokenDetails,
    sourcePage: 'TransactionActivity',
  });

  const handleSwapTokens = () => {
    goToSwaps();
  };

  return (
    <TabEmptyState
      icon={<Image source={activityImage} />}
      description={strings('wallet.empty_state.activity.description')}
      actionButtonText={strings('wallet.empty_state.activity.swap_tokens')}
      onAction={handleSwapTokens}
      {...props}
    />
  );
};