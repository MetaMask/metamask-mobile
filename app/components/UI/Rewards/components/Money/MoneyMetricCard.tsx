import React from 'react';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
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
  /** Copy under the amount, e.g. "recorded claims". */
  caption: string;
  /** Renders a placeholder in place of the amount while the summary loads. */
  isLoading?: boolean;
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
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="mt-3"
      >
        {label}
      </Text>
      {isLoading ? (
        <Skeleton style={tw.style('mt-1 h-6 w-20 rounded-md')} />
      ) : null}
      {!isLoading && amount ? (
        <Text variant={TextVariant.HeadingMd}>{amount}</Text>
      ) : null}
      <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
        {caption}
      </Text>
    </Box>
  );
};

export default MoneyMetricCard;
