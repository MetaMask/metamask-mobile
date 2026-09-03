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
import { ExpirationRowSelectorsIDs } from './testIds';
import type { ExpirationRowProps } from './types';

const ExpirationRow: React.FC<ExpirationRowProps> = ({
  value,
  onPress,
  testID = ExpirationRowSelectorsIDs.CONTAINER,
}) => (
  <KeyValueRow
    variant={KeyValueRowVariant.Summary}
    keyLabel={strings('bridge.limit.expires')}
    keyTextProps={{
      variant: TextVariant.BodySm,
      color: TextColor.TextAlternative,
    }}
    value={
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={strings('bridge.limit.expires')}
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
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            testID={ExpirationRowSelectorsIDs.VALUE}
          >
            {value}
          </Text>
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        </Box>
      </TouchableOpacity>
    }
    twClassName="h-8"
  />
);

export default ExpirationRow;
