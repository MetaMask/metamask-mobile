import React, { memo, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { RelatedAsset } from '@metamask/ai-controllers';
import { useWhatsHappeningAssetPrices } from '../../../Views/WhatsHappeningDetailView/hooks/useWhatsHappeningAssetPrices';
import type { WhatsHappeningItem } from '../types';
import type { WhatsHappeningSourceValue } from '../constants';
import WhatsHappeningAssetPill from './WhatsHappeningAssetPill';

export interface WhatsHappeningAssetSliderProps {
  assets: RelatedAsset[];
  item: WhatsHappeningItem;
  cardIndex: number;
  source: WhatsHappeningSourceValue;
}

const WhatsHappeningAssetSlider: React.FC<WhatsHappeningAssetSliderProps> = ({
  assets,
  item,
  cardIndex,
  source,
}) => {
  const tw = useTailwind();

  const perpsAssets = useMemo(
    () => assets.filter((a) => a.hlPerpsMarket?.[0]),
    [assets],
  );

  const { perpsPriceBySymbol } = useWhatsHappeningAssetPrices(perpsAssets);

  if (perpsAssets.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw.style('flex-row gap-2 mt-2')}
      nestedScrollEnabled
    >
      {perpsAssets.map((asset) => (
        <WhatsHappeningAssetPill
          key={asset.sourceAssetId}
          asset={asset}
          perpsPriceEntry={perpsPriceBySymbol[asset.hlPerpsMarket?.[0] ?? '']}
          item={item}
          cardIndex={cardIndex}
          source={source}
        />
      ))}
    </ScrollView>
  );
};

export default memo(WhatsHappeningAssetSlider);
