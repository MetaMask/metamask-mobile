import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../../util/theme';
import DottedUnderline from '../../../../../DottedUnderline';
import { SecurityTabSelectors } from '../SecurityTab.testIds';
import type { SecurityRowKey } from '../SecurityTab.types';

export interface SecurityRowLabelProps {
  rowKey: SecurityRowKey;
  /** Already-localized row label. */
  label: string;
  onPress: (rowKey: SecurityRowKey) => void;
}

/**
 * Tappable, dotted-underlined label shared by every Security tab row.
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
export const SecurityRowLabel: React.FC<SecurityRowLabelProps> = ({
  rowKey,
  label,
  onPress,
}) => {
  const { colors } = useTheme();

  const handlePress = useCallback(() => onPress(rowKey), [onPress, rowKey]);

  return (
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
  );
};

export default SecurityRowLabel;
