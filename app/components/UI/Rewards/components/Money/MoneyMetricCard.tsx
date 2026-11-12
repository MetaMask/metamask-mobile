import React from 'react';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

export interface MoneyMetricCardProps {
  iconName: IconName;
  label: string;
  /** Formatted USD total, or null when the amount is not known. */
  amount: string | null;
  /** Copy under the amount, e.g. "recorded earnings". */
  caption: string;
  /** Renders a placeholder in place of the amount while the summary loads. */
  isLoading?: boolean;
  /** Opens an info sheet for this metric. Hidden when omitted. */
  onInfoPress?: () => void;
  testID: string;
}

/**
 * Half-width earnings total under a Money hero card. Presentational: the hero
 * picks which claim family feeds it, since that mapping is not something a card
 * can infer from an amount.
 */
const MoneyMetricCard: React.FC<MoneyMetricCardProps> = ({
  iconName,
  label,
  amount,
  caption,
  isLoading = false,
  onInfoPress,
  testID,
}) => {
  const tw = useTailwind();

  return (
    <Box twClassName="min-w-0 flex-1 rounded-2xl bg-muted p-4" testID={testID}>
      <AvatarIcon
        iconName={iconName}
        size={AvatarIconSize.Md}
        severity={AvatarIconSeverity.Neutral}
        iconProps={{ color: IconColor.IconDefault }}
      />
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="mt-3 gap-0.5"
      >
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="shrink"
          numberOfLines={1}
        >
          {label}
        </Text>
        {onInfoPress ? (
          // Xs is a 20px hit box around a 16px glyph, so the 2px gap reads as 4px.
          <ButtonIcon
            iconName={IconName.Info}
            size={ButtonIconSize.Xs}
            hitSlop={8}
            iconProps={{ color: IconColor.IconAlternative }}
            onPress={onInfoPress}
            accessibilityLabel={label}
            testID={`${testID}-info`}
          />
        ) : null}
      </Box>
      {isLoading ? (
        <Skeleton style={tw.style('mt-1 h-6 w-20 rounded-md')} />
      ) : null}
      {!isLoading ? (
        <Text variant={TextVariant.HeadingMd}>{amount || '—'}</Text>
      ) : null}
      <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
        {caption}
      </Text>
    </Box>
  );
};

export default MoneyMetricCard;
