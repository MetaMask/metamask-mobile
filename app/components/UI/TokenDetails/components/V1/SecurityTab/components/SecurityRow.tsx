import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../../util/theme';
import DottedUnderline from '../../../../../DottedUnderline';
import { SECURITY_EMPTY_VALUE } from '../SecurityTab.constants';
import { SecurityTabSelectors } from '../SecurityTab.testIds';
import type { SecurityRowKey } from '../SecurityTab.types';

export interface SecurityRowProps {
  rowKey: SecurityRowKey;
  /** Already-localized row label. */
  label: string;
  /**
   * Already formatted for display. `null` renders the em dash.
   *
   * Formatting happens upstream on purpose: `0` is a real reading for buy/sell
   * tax, so the missing test has to run against the raw API value before a
   * formatter can turn `null` into `"0%"`.
   */
  value: string | null;
  /**
   * Pass/fail glyph, which only the contract checks carry.
   *
   * Suppressed when `value` is `null`, so a row with nothing to report shows
   * the bare dash rather than a glyph beside it.
   */
  icon?: { name: IconName; color: IconColor };
  /** Defaults to the standard value colour; checks override with pass/fail. */
  valueColor?: TextColor;
  onExplain: (rowKey: SecurityRowKey) => void;
}

/**
 * One label-and-value line on the Security tab, used by every section.
 *
 * Missing values render as a dimmed em dash rather than a zero or an optimistic
 * default, because several of these readings are risk signals and a fabricated
 * "0%" reads as reassurance the data does not support.
 *
 * The dotted underline is the page's established affordance for "there is a
 * definition behind this" — the stat bar introduced it in ASSETS-4019 and this
 * tab reuses the same `DottedUnderline` and the same explainer sheet, so the
 * two surfaces teach the user one gesture rather than two.
 *
 * The underline colour comes from `useTheme` rather than a Tailwind class
 * because `DottedUnderline` draws an SVG stroke, which needs a resolved
 * `ColorValue`.
 */
export const SecurityRow: React.FC<SecurityRowProps> = ({
  rowKey,
  label,
  value,
  icon,
  valueColor,
  onExplain,
}) => {
  const { colors } = useTheme();

  const handlePress = useCallback(() => onExplain(rowKey), [onExplain, rowKey]);

  const isMissing = value === null;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      justifyContent={BoxJustifyContent.Between}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-4 py-1.5"
      testID={SecurityTabSelectors.row(rowKey)}
    >
      <TouchableOpacity
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={strings('token_details_v1.security_tab.explain', {
          term: label,
        })}
        testID={SecurityTabSelectors.rowLabel(rowKey)}
      >
        <DottedUnderline color={colors.text.alternative}>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextAlternative}
          >
            {label}
          </Text>
        </DottedUnderline>
      </TouchableOpacity>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="shrink gap-1"
      >
        {icon && !isMissing ? (
          <Icon
            name={icon.name}
            size={IconSize.Sm}
            color={icon.color}
            testID={SecurityTabSelectors.rowIcon(rowKey)}
          />
        ) : null}
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={
            isMissing
              ? TextColor.TextAlternative
              : (valueColor ?? TextColor.TextDefault)
          }
          numberOfLines={1}
          twClassName="shrink"
          testID={SecurityTabSelectors.rowValue(rowKey)}
        >
          {value ?? SECURITY_EMPTY_VALUE}
        </Text>
      </Box>
    </Box>
  );
};

export default SecurityRow;
