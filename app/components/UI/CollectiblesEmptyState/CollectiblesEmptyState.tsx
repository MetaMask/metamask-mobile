import React from 'react';
import { Image } from 'react-native';
import {
  TabEmptyState,
  type TabEmptyStateProps,
} from '../../../component-library/components-temp/TabEmptyState';
import { useAssetFromTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import emptyStateNftsLight from '../../../images/empty-state-nfts-light.png';
import emptyStateNftsDark from '../../../images/empty-state-nfts-dark.png';

interface CollectiblesEmptyStateProps extends TabEmptyStateProps {}

export const CollectiblesEmptyState: React.FC<CollectiblesEmptyStateProps> = ({
  ...props
}) => {
  const collectiblesImage = useAssetFromTheme(
    emptyStateNftsLight,
    emptyStateNftsDark,
  );
  const tw = useTailwind();
  return (
    <TabEmptyState
      icon={
        <Image
          source={collectiblesImage}
          resizeMode="contain"
          style={tw.style('w-[72px] h-[72px]')}
        />
      }
      description={strings('wallet.nft_empty_description')}
      actionButtonText={strings('wallet.discover_nfts')}
      {...props}
    />
  );
};
