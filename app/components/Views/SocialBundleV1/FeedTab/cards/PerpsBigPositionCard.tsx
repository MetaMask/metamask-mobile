import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback } from 'react';
import type { PerpsBigFeedItem } from '../mocks/types';
import CardShell from './CardShell';
import PositionChartLine from './PositionChartLine';

interface PerpsBigPositionCardProps {
  item: PerpsBigFeedItem;
}

const Row: React.FC<{ label: string; value: string; muted?: boolean }> = ({
  label,
  value,
  muted,
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
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={muted ? TextColor.TextAlternative : TextColor.TextDefault}
      >
        {value}
      </Text>
    </Box>
  );
};

const PerpsBigPositionCard: React.FC<PerpsBigPositionCardProps> = ({
  item,
}) => {
  const tw = useTailwind();
  const { position } = item;
  const noop = useCallback(() => undefined, []);

  const isShort = position.side === 'short';

  return (
    <CardShell
      tokenSymbol={position.tokenSymbol}
      tokenLogo={position.tokenLogo}
      sidePill={{
        label: isShort ? 'Short' : 'Long',
        tone: isShort ? 'negative' : 'positive',
      }}
      subtitle={`${position.entryPrice} \u00b7 ${position.notional}`}
      pnlAbs={position.pnlAbs}
      pnlPct={position.pnlPct}
      pnlTone="positive"
    >
      <PositionChartLine chart={position.chart} />

      <Box style={tw.style('gap-2')}>
        <Row label="Leverage" value={position.leverage} />
        <Row
          label="Auto-close"
          value={`TP ${position.takeProfit}  /  SL ${position.stopLoss}`}
        />
        <Row label="Liq. price" value={position.liquidationPrice} />
      </Box>

      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Md}
        onPress={noop}
        startIconName={IconName.Refresh}
        isFullWidth
      >
        Copy trade
      </Button>
    </CardShell>
  );
};

export default PerpsBigPositionCard;
