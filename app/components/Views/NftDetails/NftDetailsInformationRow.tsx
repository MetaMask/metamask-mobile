import React from 'react';
import { TouchableOpacity } from 'react-native-gesture-handler';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { NftDetailsInformationRowProps } from './NftDetails.types';

/**
 * NFT details key/value row. Typography and spacing match token details rows
 * (`TokenDetailsListItem`): alternative medium label, default body value,
 * 4px vertical padding, space-between.
 */
const NftDetailsInformationRow = ({
  title,
  value,
  icon,
  onValuePress,
}: NftDetailsInformationRowProps) => {
  if (!value) {
    return null;
  }

  const valueText = (
    <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
      {value}
    </Text>
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="py-1"
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >
        {title}
      </Text>
      {icon ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-1"
        >
          {onValuePress ? (
            <TouchableOpacity onPress={onValuePress}>
              {valueText}
            </TouchableOpacity>
          ) : (
            valueText
          )}
          {icon}
        </Box>
      ) : (
        valueText
      )}
    </Box>
  );
};

export default NftDetailsInformationRow;
