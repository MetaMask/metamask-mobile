import React from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxFlexWrap,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';

export type HomepageUnrealizedPnlTone = 'positive' | 'negative' | 'neutral';

const toneToColor = (tone: HomepageUnrealizedPnlTone): TextColor => {
  if (tone === 'positive') {
    return TextColor.SuccessDefault;
  }
  if (tone === 'negative') {
    return TextColor.ErrorDefault;
  }
  return TextColor.TextDefault;
};

export interface HomepageSectionUnrealizedPnlRowProps {
  /** Muted label after the value (e.g. Unrealized P&L) */
  label: string;
  /** When true, shows a placeholder instead of value + label */
  isLoading?: boolean;
  /** Main numeric segment, e.g. +$95.39 (+9.4%) */
  valueText?: string;
  tone?: HomepageUnrealizedPnlTone;
  /**
   * When set, used for the value text color instead of deriving from `tone`
   * (Perps home “Your positions” line passes design-system colors from account state).
   */
  valueColor?: TextColor;
  /** Container test id (homepage sections). */
  testID?: string;
  /** Value segment test id; default `${testID}-value` when `testID` is set. */
  valueTestID?: string;
  /** Label segment test id; default `${testID}-label` when `testID` is set. */
  labelTestID?: string;
  /**
   * Horizontal padding (design-system spacing). `4` = 16px — wallet homepage;
   * `0` when the parent section already applies horizontal inset (Perps “Your positions”).
   */
  paddingHorizontal?: 0 | 4;
  /** `1` = 4px below title when the parent does not use `gap` (Perps home section). */
  marginTop?: 1;
}

/**
 * Section sub-row: colored unrealized P&L value + muted label.
 * Used on wallet homepage (Perps / Predict) and Perps tab “Your positions”.
 * Spacing: 8px gap between value and label; optional `marginTop` 4px below title when needed.
 */
const HomepageSectionUnrealizedPnlRow: React.FC<
  HomepageSectionUnrealizedPnlRowProps
> = ({
  label,
  isLoading,
  valueText,
  tone = 'neutral',
  valueColor: valueColorProp,
  testID,
  valueTestID: valueTestIDProp,
  labelTestID: labelTestIDProp,
  paddingHorizontal = 4,
  marginTop,
}) => {
  const tw = useTailwind();
  const resolvedValueColor = valueColorProp ?? toneToColor(tone);
  const valueTestID =
    valueTestIDProp ?? (testID ? `${testID}-value` : undefined);
  const labelTestID =
    labelTestIDProp ?? (testID ? `${testID}-label` : undefined);

  if (isLoading) {
    return (
      <Box
        marginTop={marginTop}
        paddingHorizontal={paddingHorizontal}
        testID={testID}
      >
        <Skeleton width={280} height={18} style={tw.style('rounded-md')} />
      </Box>
    );
  }

  if (!valueText) {
    return null;
  }

  return (
    <Box marginTop={marginTop} testID={testID}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        flexWrap={BoxFlexWrap.Wrap}
        paddingHorizontal={paddingHorizontal}
        gap={2}
      >
        <Text
          variant={TextVariant.BodySm}
          color={resolvedValueColor}
          fontWeight={FontWeight.Medium}
          testID={valueTestID}
        >
          {valueText}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          fontWeight={FontWeight.Medium}
          testID={labelTestID}
        >
          {label}
        </Text>
      </Box>
    </Box>
  );
};

export default HomepageSectionUnrealizedPnlRow;
