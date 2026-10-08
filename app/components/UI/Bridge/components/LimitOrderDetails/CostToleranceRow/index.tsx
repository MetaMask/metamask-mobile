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
import { LimitOrderCostToleranceTooltip } from '../../LimitOrderCostToleranceTooltip';
import { CostToleranceRowSelectorsIDs } from './testIds';
import type { CostToleranceRowProps } from './types';

const CostToleranceRow: React.FC<CostToleranceRowProps> = ({
  value,
  onPress,
  testID = CostToleranceRowSelectorsIDs.CONTAINER,
}) => (
  <KeyValueRow
    variant={KeyValueRowVariant.Summary}
    keyLabel={strings('bridge.cost_tolerance')}
    keyTextProps={{
      variant: TextVariant.BodyMd,
      color: TextColor.TextAlternative,
      fontWeight: FontWeight.Regular,
    }}
    keyEndAccessory={
      <LimitOrderCostToleranceTooltip
        testID={CostToleranceRowSelectorsIDs.TOOLTIP}
      />
    }
    value={
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={strings('bridge.cost_tolerance')}
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
            testID={CostToleranceRowSelectorsIDs.VALUE}
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

export default CostToleranceRow;
