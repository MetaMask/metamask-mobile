import React from 'react';
import {
  IconName,
  KeyValueRow,
  type KeyValueRowProps,
  KeyValueRowVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { PerpsRebateSelectorsIDs } from '../../Perps.testIds';

interface PerpsRebateProps {
  rebateBips?: number;
}

interface PerpsRebateRowProps extends PerpsRebateProps {
  onInfoPress?: () => void;
  testID?: string;
  valueTestID?: string;
  infoTestID?: string;
  keyTextProps?: KeyValueRowProps['keyTextProps'];
  valueTextProps?: KeyValueRowProps['valueTextProps'];
  twClassName?: string;
  style?: KeyValueRowProps['style'];
}

interface PerpsRebateFooterTextProps extends PerpsRebateProps {
  feeText: string;
  onInfoPress?: () => void;
  testID?: string;
  infoTestID?: string;
}

/**
 * Formats basis points of the MetaMask fee as a percentage.
 */
export function formatPerpsRebatePercentage(rebateBips: number): string {
  return Number.parseFloat((rebateBips / 100).toFixed(2)).toString();
}

/**
 * Returns a displayable rebate only for eligible quote values.
 */
export function getDisplayablePerpsRebateBips(
  eligible: boolean | undefined,
  rebateBips: number | undefined,
): number | undefined {
  return eligible && rebateBips !== undefined && rebateBips > 0
    ? rebateBips
    : undefined;
}

/**
 * Rebate summary row displayed directly after a Perps fees row.
 */
export const PerpsRebateRow: React.FC<PerpsRebateRowProps> = ({
  rebateBips,
  onInfoPress,
  testID = PerpsRebateSelectorsIDs.ROW,
  valueTestID = PerpsRebateSelectorsIDs.VALUE,
  infoTestID = PerpsRebateSelectorsIDs.INFO_BUTTON,
  keyTextProps,
  valueTextProps,
  twClassName,
  style,
}) => {
  if (rebateBips === undefined || rebateBips <= 0) {
    return null;
  }

  const percentage = formatPerpsRebatePercentage(rebateBips);

  return (
    <KeyValueRow
      testID={testID}
      variant={KeyValueRowVariant.Summary}
      keyLabel={strings('perps.rebate.label')}
      {...(onInfoPress && {
        keyEndButtonIconProps: {
          iconName: IconName.Info,
          onPress: onInfoPress,
          testID: infoTestID,
          accessibilityLabel: strings('perps.rebate.info_accessibility_label'),
        },
      })}
      value={strings('perps.rebate.back', { percentage })}
      valueTextProps={{
        ...valueTextProps,
        testID: valueTestID,
        color: TextColor.SuccessDefault,
      }}
      keyTextProps={keyTextProps}
      twClassName={twClassName}
      style={style}
    />
  );
};

/**
 * Compact rebate treatment for fee disclaimers in confirmation-sheet footers.
 */
export const PerpsRebateFooterText: React.FC<PerpsRebateFooterTextProps> = ({
  feeText,
  rebateBips,
  onInfoPress,
  testID = PerpsRebateSelectorsIDs.FOOTER,
  infoTestID = PerpsRebateSelectorsIDs.FOOTER_INFO_BUTTON,
}) => {
  if (rebateBips === undefined || rebateBips <= 0) {
    return (
      <Text
        variant={TextVariant.BodyXs}
        color={TextColor.TextAlternative}
        testID={testID}
      >
        {feeText}
      </Text>
    );
  }

  const percentage = formatPerpsRebatePercentage(rebateBips);

  return (
    <Text
      variant={TextVariant.BodyXs}
      color={TextColor.TextAlternative}
      testID={testID}
      accessibilityLabel={`${feeText}${strings('perps.rebate.footer_accessibility', { percentage })}`}
    >
      {feeText}
      {strings('perps.rebate.footer_separator')}
      <Text
        variant={TextVariant.BodyXs}
        color={TextColor.SuccessDefault}
        onPress={onInfoPress}
        testID={infoTestID}
        accessibilityRole={onInfoPress ? 'link' : undefined}
        accessibilityLabel={strings('perps.rebate.info_accessibility_label')}
        twClassName={onInfoPress ? 'underline' : undefined}
      >
        {strings('perps.rebate.earned', { percentage })}
      </Text>
      {strings('perps.rebate.earned_suffix')}
    </Text>
  );
};
