import React, { useCallback } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonBase,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import EarnAssetIcon from '../../../../UI/Earn/components/EarnAssetIcon/EarnAssetIcon';
import {
  earnAssetToToken,
  getEarnAssetMetadata,
  hasEarnAssetBalance,
} from '../../../../UI/Earn/utils/earnAssets';
import { getEarnAssetRateText } from '../../../../UI/Earn/utils/earnSection/getEarnAssetRateText';
import type { EarnAssetSearchItem } from './earnSearchTypes';

interface EarnAssetRowProps {
  item: EarnAssetSearchItem;
  onPress: (item: EarnAssetSearchItem) => void;
}

const EarnAssetRow = ({ item, onPress }: EarnAssetRowProps) => {
  const { asset } = item;
  const metadata = getEarnAssetMetadata(asset);
  const token = earnAssetToToken(asset);
  const isHeld = hasEarnAssetBalance(asset);

  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  return (
    <ButtonBase
      accessibilityRole="button"
      onPress={handlePress}
      testID="earn-search-asset-row"
      twClassName="w-full px-4 py-3"
      contentWrapperProps={{ twClassName: 'w-full' }}
    >
      <Box
        alignItems={BoxAlignItems.Center}
        flexDirection={BoxFlexDirection.Row}
        twClassName="w-full gap-3"
        accessible={false}
      >
        <EarnAssetIcon token={token} />
        <Box twClassName="min-w-0 flex-1 gap-1">
          <Text
            color={TextColor.TextDefault}
            fontWeight={FontWeight.Medium}
            variant={TextVariant.BodyMd}
            numberOfLines={1}
          >
            {metadata.name}
          </Text>
          <Text
            color={TextColor.TextAlternative}
            variant={TextVariant.BodySm}
            numberOfLines={1}
          >
            {`${token.balance} ${metadata.symbol}`}
          </Text>
        </Box>
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodySm}
          numberOfLines={1}
        >
          {getEarnAssetRateText({
            asset,
            useGetCopy: isHeld,
          })}
        </Text>
      </Box>
    </ButtonBase>
  );
};

export default EarnAssetRow;
