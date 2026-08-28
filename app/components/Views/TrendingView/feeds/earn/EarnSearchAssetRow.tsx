import React, { useCallback } from 'react';
import {
  FontWeight,
  ListItem,
  SensitiveText,
  SensitiveTextLength,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import EarnAssetIcon from '../../../../UI/Earn/components/EarnAssetIcon/EarnAssetIcon';
import { deriveEarnAssetDisplayData } from '../../../../UI/Earn/utils/earnAssets';
import type { EarnAssetSearchItem } from './earnSearchTypes';
import EarnNoFeeTag from '../../../../UI/Earn/components/EarnNoFeeTag';
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
  const {
    metadata,
    hasSubsidizedFee,
    hasMinDepositAmount,
    fiatBalance,
    rateCopy,
  } = deriveEarnAssetDisplayData(asset);

  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  const description = hasMinDepositAmount ? (
    <SensitiveText
      variant={TextVariant.BodySm}
      isHidden={privacyMode}
      length={SensitiveTextLength.Medium}
      testID={EarnSearchAssetRowTestIds.BALANCE}
    >
      {fiatBalance}
    </SensitiveText>
  ) : (
    metadata.symbol
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
      titleEndAccessory={hasSubsidizedFee ? <EarnNoFeeTag /> : undefined}
      titleProps={{
        numberOfLines: 1,
      }}
      description={description}
      descriptionProps={{
        numberOfLines: 1,
      }}
      value={rateCopy}
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
