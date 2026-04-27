import React from 'react';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { AppNavigationProp } from '../../../../../../../core/NavigationService/types';
import { useTrendingTokenPress } from '../../../../hooks/useTrendingTokenPress';
import { CRYPTO_MOVERS_HOME_FILTER_CONTEXT } from '../../../../sections.config';
import SectionPill from '../SectionPills/SectionPill';

const CryptoMoversPillItem: React.FC<{
  item: unknown;
  index: number;
  navigation: AppNavigationProp;
  extra?: unknown;
}> = ({ item, index }) => {
  const token = item as TrendingAsset;
  const { onPress } = useTrendingTokenPress({
    token,
    index,
    filterContext: CRYPTO_MOVERS_HOME_FILTER_CONTEXT,
  });
  return (
    <SectionPill
      token={token}
      onPress={onPress}
      testID={`section-pill-${token.assetId}`}
    />
  );
};

export default CryptoMoversPillItem;
