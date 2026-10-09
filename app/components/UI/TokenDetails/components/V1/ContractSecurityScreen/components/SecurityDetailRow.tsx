import React from 'react';
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
import { SECURITY_EMPTY_VALUE } from '../../SecurityTab/SecurityTab.constants';
import type { SecurityCheckKey } from '../../SecurityTab/SecurityTab.types';
import { ContractSecuritySelectors } from '../ContractSecurityScreen.testIds';

export interface SecurityDetailRowProps {
  checkKey: SecurityCheckKey;
  /** Already-localized row label. */
  label: string;
  /**
   * Already formatted for display. `null` renders the em dash.
   *
   * Same rule as the tab: a check Blockaid never resolved has to read as a
   * dash, not as a pass.
   */
  value: string | null;
  /** Already-localized definition, printed under the row. */
  description: string;
  /**
   * Pass/fail glyph. Suppressed when `value` is `null`, so a row with nothing
   * to report shows the bare dash rather than a glyph beside it.
   */
  icon?: { name: IconName; color: IconColor };
  /** Defaults to the standard value colour; checks override with pass/fail. */
  valueColor?: TextColor;
}

/**
 * One check on the Contract security screen: label, value, and the definition
 * spelled out underneath.
 *
 * A sibling of `SecurityRow` rather than a variant of it. The tab's row makes
 * its label the tap target — the dotted underline is the affordance for a
 * definition hidden behind a gesture — whereas this row prints the definition
 * and so has nothing to tap. Sharing one component would mean a prop that
 * switches off the other's whole reason for existing.
 *
 * Every line is `BodySm`. The label and value separate themselves from the
 * definition by weight and colour rather than size — medium on default against
 * regular on alternative — which is what lets the labels carry the scan line
 * while a sentence sits under each one.
 *
 * Carries no vertical spacing or rule of its own. Both belong between rows
 * rather than to any one of them, so the group puts a `SectionDivider` in each
 * gap and the row stays unaware of where it sits in the list.
 */
export const SecurityDetailRow: React.FC<SecurityDetailRowProps> = ({
  checkKey,
  label,
  value,
  description,
  icon,
  valueColor,
}) => {
  const isMissing = value === null;

  return (
    <Box twClassName="gap-1" testID={ContractSecuritySelectors.row(checkKey)}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-4"
      >
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          testID={ContractSecuritySelectors.rowLabel(checkKey)}
        >
          {label}
        </Text>
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
              testID={ContractSecuritySelectors.rowIcon(checkKey)}
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
            testID={ContractSecuritySelectors.rowValue(checkKey)}
          >
            {value ?? SECURITY_EMPTY_VALUE}
          </Text>
        </Box>
      </Box>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        testID={ContractSecuritySelectors.rowDescription(checkKey)}
      >
        {description}
      </Text>
    </Box>
  );
};

export default SecurityDetailRow;
