import React from 'react';
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
import { strings } from '../../../../../../../../locales/i18n';
import {
  SECURITY_EMPTY_VALUE,
  SECURITY_STAT_LABEL_KEYS,
} from '../SecurityTab.constants';
import { SecurityTabSelectors } from '../SecurityTab.testIds';
import type { SecurityRowKey, SecurityStatKey } from '../SecurityTab.types';
import SecurityRowLabel from './SecurityRowLabel';

export interface SecurityStatRowProps {
  statKey: SecurityStatKey;
  /**
   * Already formatted for display. `null` renders the em dash.
   *
   * Formatting happens upstream on purpose: `0` is a real reading for buy/sell
   * tax, so the missing test has to run against the raw API value before a
   * formatter can turn `null` into `"0%"`.
   */
  value: string | null;
  onExplain: (rowKey: SecurityRowKey) => void;
}

/**
 * One label-and-value line in a Security tab section.
 *
 * Missing values render as a dimmed em dash rather than a zero or an optimistic
 * default, because several of these readings are risk signals and a fabricated
 * "0%" reads as reassurance the data does not support.
 */
export const SecurityStatRow: React.FC<SecurityStatRowProps> = ({
  statKey,
  value,
  onExplain,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    justifyContent={BoxJustifyContent.Between}
    alignItems={BoxAlignItems.Center}
    twClassName="gap-4 py-1.5"
    testID={SecurityTabSelectors.row(statKey)}
  >
    <SecurityRowLabel
      rowKey={statKey}
      label={strings(SECURITY_STAT_LABEL_KEYS[statKey])}
      onPress={onExplain}
    />
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={value === null ? TextColor.TextAlternative : TextColor.TextDefault}
      numberOfLines={1}
      twClassName="shrink"
      testID={SecurityTabSelectors.rowValue(statKey)}
    >
      {value ?? SECURITY_EMPTY_VALUE}
    </Text>
  </Box>
);

export default SecurityStatRow;
