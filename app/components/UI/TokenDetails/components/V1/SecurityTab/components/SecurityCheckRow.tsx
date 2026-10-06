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
import { strings } from '../../../../../../../../locales/i18n';
import {
  SECURITY_CHECK_LABEL_KEYS,
  SECURITY_EMPTY_VALUE,
} from '../SecurityTab.constants';
import { SecurityTabSelectors } from '../SecurityTab.testIds';
import type {
  SecurityCheck,
  SecurityCheckKey,
  SecurityCheckOutcome,
  SecurityRowKey,
} from '../SecurityTab.types';
import SecurityRowLabel from './SecurityRowLabel';

interface OutcomeConfig {
  /** `null` draws no glyph, leaving the dash to carry the "no data" meaning. */
  iconName: IconName | null;
  iconColor: IconColor;
  textColor: TextColor;
}

/**
 * Typed as a full `Record` so a third outcome cannot be added to
 * `SecurityCheckOutcome` without deciding how it looks.
 */
const OUTCOME_CONFIG: Record<SecurityCheckOutcome, OutcomeConfig> = {
  pass: {
    iconName: IconName.CheckBold,
    iconColor: IconColor.SuccessDefault,
    textColor: TextColor.SuccessDefault,
  },
  fail: {
    iconName: IconName.Close,
    iconColor: IconColor.ErrorDefault,
    textColor: TextColor.ErrorDefault,
  },
  unknown: {
    iconName: null,
    iconColor: IconColor.IconAlternative,
    textColor: TextColor.TextAlternative,
  },
};

export interface SecurityCheckRowProps {
  checkKey: SecurityCheckKey;
  /**
   * Absent when the chain lists this check but Blockaid has not resolved it,
   * which renders the same dash as an explicit `unknown`.
   */
  check?: SecurityCheck;
  onExplain: (rowKey: SecurityRowKey) => void;
}

/**
 * One contract check — a label, a pass/fail glyph and the check's own wording.
 *
 * An unresolved check shows a dimmed dash and no glyph. That matters more here
 * than on the stat rows: Blockaid reports only the risks it detected and never
 * the checks it ran, so a green tick for "nothing found" would claim a test
 * result that does not exist.
 */
export const SecurityCheckRow: React.FC<SecurityCheckRowProps> = ({
  checkKey,
  check,
  onExplain,
}) => {
  const outcome = check?.outcome ?? 'unknown';
  const { iconName, iconColor, textColor } = OUTCOME_CONFIG[outcome];
  const value = outcome === 'unknown' ? null : (check?.value ?? null);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      justifyContent={BoxJustifyContent.Between}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-4 py-1.5"
      testID={SecurityTabSelectors.row(checkKey)}
    >
      <SecurityRowLabel
        rowKey={checkKey}
        label={strings(SECURITY_CHECK_LABEL_KEYS[checkKey])}
        onPress={onExplain}
      />
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="shrink gap-1"
      >
        {iconName && value !== null ? (
          <Icon
            name={iconName}
            size={IconSize.Sm}
            color={iconColor}
            testID={SecurityTabSelectors.rowIcon(checkKey)}
          />
        ) : null}
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={value === null ? TextColor.TextAlternative : textColor}
          numberOfLines={1}
          twClassName="shrink"
          testID={SecurityTabSelectors.rowValue(checkKey)}
        >
          {value ?? SECURITY_EMPTY_VALUE}
        </Text>
      </Box>
    </Box>
  );
};

export default SecurityCheckRow;
