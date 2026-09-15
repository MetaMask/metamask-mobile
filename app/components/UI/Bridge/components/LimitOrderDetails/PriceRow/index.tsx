import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  KeyValueRow,
  KeyValueRowVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { PriceRowSelectorsIDs } from './testIds';
import type { PriceRowProps } from './types';

const PriceRow: React.FC<PriceRowProps> = ({
  value,
  onPress,
  testID = PriceRowSelectorsIDs.CONTAINER,
}) => (
  <KeyValueRow
    variant={KeyValueRowVariant.Summary}
    keyLabel={strings('bridge.slippage')}
    keyTextProps={{
      variant: TextVariant.BodyMd,
      color: TextColor.TextAlternative,
      fontWeight: FontWeight.Regular,
    }}
    value={
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={strings('bridge.slippage')}
        onPress={onPress}
        activeOpacity={0.6}
        testID={testID}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={PriceRowSelectorsIDs.VALUE}
          >
            {value}
          </Text>
          <Icon
            name={IconName.Edit}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
            twClassName="-mt-0.5"
          />
        </Box>
      </TouchableOpacity>
    }
    twClassName="h-8"
  />
);

export default PriceRow;
