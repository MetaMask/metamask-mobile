import React, { memo } from 'react';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { RelatedAsset } from '@metamask/ai-controllers';
import WhatsHappeningAssetPill from './WhatsHappeningAssetPill';

export interface WhatsHappeningAssetSliderProps {
  assets: RelatedAsset[];
}

const WhatsHappeningAssetSlider: React.FC<WhatsHappeningAssetSliderProps> = ({
  assets,
}) => {
  const tw = useTailwind();

  if (assets.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw.style('flex-row gap-2 mt-2')}
      nestedScrollEnabled
    >
      {assets.map((asset) => (
        <WhatsHappeningAssetPill key={asset.sourceAssetId} asset={asset} />
      ))}
    </ScrollView>
  );
};

export default memo(WhatsHappeningAssetSlider);
