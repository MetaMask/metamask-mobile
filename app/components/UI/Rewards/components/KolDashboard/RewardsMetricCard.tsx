import React from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

interface RewardsMetricCardProps {
  /** Avatar node so callers can pass a design-system icon or a Phosphor SVG. */
  avatar: React.ReactNode;
  label: string;
  amount: string;
  onPress: () => void;
  testID: string;
}

/** Half-width total that sits under the hero card on the Ways to earn tab. */
const RewardsMetricCard: React.FC<RewardsMetricCardProps> = ({
  avatar,
  label,
  amount,
  onPress,
  testID,
}) => {
  const tw = useTailwind();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={tw.style('flex-1')}
      testID={testID}
    >
      <Box twClassName="rounded-2xl bg-muted p-4">
        {avatar}
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="mt-3"
        >
          {label}
        </Text>
        <Text variant={TextVariant.HeadingMd}>{amount}</Text>
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {strings('rewards.kol.recorded_earnings')}
        </Text>
      </Box>
    </Pressable>
  );
};

export default RewardsMetricCard;
