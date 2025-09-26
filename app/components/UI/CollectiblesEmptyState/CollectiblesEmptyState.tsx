import React from 'react';
import { Image } from 'react-native';
import {
  TabEmptyState,
  type TabEmptyStateProps,
} from '../../../component-library/components-temp/TabEmptyState';
import { useAssetFromTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import emptyStateNftsLight from '../../../images/empty-state-nfts-light.png';
import emptyStateNftsDark from '../../../images/empty-state-nfts-dark.png';

interface CollectiblesEmptyStateProps extends TabEmptyStateProps {
  onDiscoverCollectibles?: () => void;
}

export const CollectiblesEmptyState: React.FC<CollectiblesEmptyStateProps> = ({
  onDiscoverCollectibles,
  ...props
}) => {
  const collectiblesImage = useAssetFromTheme(
    emptyStateNftsLight,
    emptyStateNftsDark,
  );
  return (
    <TabEmptyState
      icon={<Image source={collectiblesImage} resizeMode="contain" />}
      description={strings('wallet.nft_empty_description')}
      actionButtonText={strings('wallet.discover_nfts')}
      onAction={onDiscoverCollectibles}
      {...props}
    />
  );
};
