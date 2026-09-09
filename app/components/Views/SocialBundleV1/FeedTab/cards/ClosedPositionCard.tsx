import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { View } from 'react-native';
import type { ClosedFeedItem } from '../mocks/types';
import CardShell from './CardShell';

interface ClosedPositionCardProps {
  item: ClosedFeedItem;
}

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => {
  const tw = useTailwind();
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.SpaceBetween}
      style={tw.style('gap-4')}
    >
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {label}
      </Text>
      {typeof value === 'string' ? (
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {value}
        </Text>
      ) : (
        value
      )}
    </Box>
  );
};

const ClosedPositionCard: React.FC<ClosedPositionCardProps> = ({ item }) => {
  const tw = useTailwind();
  const { position } = item;

  const sideLabel = `${position.leverage} ${position.side === 'short' ? 'SHORT' : 'LONG'}`;

  return (
    <CardShell
      tokenSymbol={position.tokenSymbol}
      tokenLogo={position.tokenLogo}
      sidePill={{
        label: sideLabel,
        tone: position.side === 'short' ? 'negative' : 'positive',
      }}
    >
      <Box style={tw.style('gap-1')}>
        <Text variant={TextVariant.HeadingLg} color={TextColor.SuccessDefault}>
          {position.pnlAbs}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.SuccessDefault}
        >
          {position.pnlPct}
        </Text>
      </Box>

      <Box style={tw.style('gap-2')}>
        <Row label="Entry price" value={position.entryPrice} />
        <Row label="Exit price" value={position.exitPrice} />
        <Row label="Max hold time" value={position.maxHoldTime} />
        <Row
          label="Status"
          value={
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              style={tw.style('gap-1.5')}
            >
              <View style={tw.style('w-2 h-2 rounded-full bg-error-default')} />
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                Closed
              </Text>
            </Box>
          }
        />
      </Box>
    </CardShell>
  );
};

export default ClosedPositionCard;
