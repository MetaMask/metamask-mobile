import React, { useCallback } from 'react';
import {
  FontWeight,
  ListItem,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import EarnAssetIcon from '../../../../UI/Earn/components/EarnAssetIcon/EarnAssetIcon';
import {
  earnAssetToToken,
  getEarnAssetMetadata,
  hasEarnAssetSubsidizedFee,
} from '../../../../UI/Earn/utils/earnAssets';
import { getEarnAssetRateText } from '../../../../UI/Earn/utils/earnSection/getEarnAssetRateText';
import type { EarnAssetSearchItem } from './earnSearchTypes';
import { isEarnAssetBalanceBelowMinDepositAmount } from '../../../../UI/Earn/utils/earnAssets/earnAssetBalance';
import EarnNoFeeTag from '../../../../UI/Earn/components/EarnNoFeeTag';

interface EarnSearchAssetRowProps {
  item: EarnAssetSearchItem;
  onPress: (item: EarnAssetSearchItem) => void;
}

const EarnSearchAssetRow = ({ item, onPress }: EarnSearchAssetRowProps) => {
  const { asset } = item;
  const metadata = getEarnAssetMetadata(asset);
  const token = earnAssetToToken(asset);

  const hasMinDepositAmount = !isEarnAssetBalanceBelowMinDepositAmount(asset);

  const hasSubsidizedFee = hasEarnAssetSubsidizedFee(asset);

  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  return (
    <ListItem
      key={`earn-search-asset-row-${asset.assetId}`}
      isInteractive
      accessibilityRole="button"
      onPress={handlePress}
      testID="earn-search-asset-row"
      avatar={<EarnAssetIcon token={token} />}
      title={metadata.name}
      titleEndAccessory={hasSubsidizedFee ? <EarnNoFeeTag /> : undefined}
      titleProps={{
        numberOfLines: 1,
      }}
      description={hasMinDepositAmount ? token?.balanceFiat : token.symbol}
      descriptionProps={{
        numberOfLines: 1,
      }}
      value={getEarnAssetRateText({ asset })}
      valueProps={{
        color: TextColor.SuccessDefault,
        numberOfLines: 1,
        variant: TextVariant.BodyMd,
        fontWeight: FontWeight.Regular,
      }}
      twClassName="py-2 min-h-0"
    />
  );
};

export default EarnSearchAssetRow;
