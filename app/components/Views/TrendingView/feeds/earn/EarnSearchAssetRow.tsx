import React, { useCallback } from 'react';
import {
  FontWeight,
  ListItem,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import EarnAssetIcon from '../../../../UI/Earn/components/EarnAssetIcon/EarnAssetIcon';
import { deriveEarnAssetDisplayData } from '../../../../UI/Earn/utils/earnAssets';
import type { EarnAssetSearchItem } from './earnSearchTypes';
import { EarnSearchAssetRowTestIds } from './EarnSearchAssetRow.testIds';

interface EarnSearchAssetRowProps {
  item: EarnAssetSearchItem;
  onPress: (item: EarnAssetSearchItem) => void;
  privacyMode?: boolean;
}

/**
 * Renders an Earn asset as a search result.
 *
 * @param item - Earn asset and its catalogue display data.
 * @param onPress - Callback invoked when the row is pressed.
 * @param privacyMode - Whether the asset balance should be masked.
 */
const EarnSearchAssetRow = ({
  item,
  onPress,
  privacyMode = false,
}: EarnSearchAssetRowProps) => {
  const { asset } = item;
  const { metadata, hasMinDepositAmount, fiatBalance, highestRateCopy } =
    deriveEarnAssetDisplayData(asset);

  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  const description = hasMinDepositAmount ? (
    <SensitiveText
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      isHidden={privacyMode}
      length={SensitiveTextLength.Medium}
      testID={EarnSearchAssetRowTestIds.BALANCE}
    >
      {fiatBalance}
    </SensitiveText>
  ) : (
    <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
      {metadata.symbol}
    </Text>
  );

  return (
    <ListItem
      key={`earn-search-asset-row-${asset.assetId}`}
      isInteractive
      accessibilityRole="button"
      onPress={handlePress}
      testID={EarnSearchAssetRowTestIds.ROW}
      avatar={<EarnAssetIcon asset={asset} />}
      title={metadata.name}
      titleProps={{
        numberOfLines: 1,
      }}
      description={description}
      descriptionProps={{
        numberOfLines: 1,
      }}
      value={highestRateCopy}
      valueProps={{
        color: TextColor.SuccessDefault,
        numberOfLines: 1,
        variant: TextVariant.BodyMd,
        fontWeight: FontWeight.Medium,
      }}
      twClassName="py-2 min-h-0"
    />
  );
};

export default EarnSearchAssetRow;
