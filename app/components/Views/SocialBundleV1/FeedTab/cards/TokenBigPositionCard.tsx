import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
  Text,
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback } from 'react';
import { View } from 'react-native';
import type { TokenBigFeedItem } from '../mocks/types';
import CardShell from './CardShell';
import PositionChartLine from './PositionChartLine';

interface TokenBigPositionCardProps {
  item: TokenBigFeedItem;
}

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const tw = useTailwind();
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      style={tw.style('gap-4')}
    >
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {label}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {value}
      </Text>
    </Box>
  );
};

/**
 * Simple two-segment holders bar used by the token big-position card:
 * yellow slice = top holders %, purple slice = dev holders %, remainder grey.
 */
const HoldersBar: React.FC<{ topPct: number; devPct: number }> = ({
  topPct,
  devPct,
}) => {
  const tw = useTailwind();
  const restPct = Math.max(0, 100 - topPct - devPct);
  return (
    <View
      style={tw.style(
        'flex-row h-2 rounded-full overflow-hidden bg-background-muted',
      )}
    >
      <View style={[tw.style('bg-info-default'), { flex: topPct }]} />
      <View style={[tw.style('bg-warning-default'), { flex: devPct }]} />
      <View style={[tw.style('bg-background-muted'), { flex: restPct }]} />
    </View>
  );
};

const TokenBigPositionCard: React.FC<TokenBigPositionCardProps> = ({
  item,
}) => {
  const tw = useTailwind();
  const { position } = item;
  const noop = useCallback(() => undefined, []);

  return (
    <CardShell
      tokenSymbol={position.tokenSymbol}
      tokenLogo={position.tokenLogo}
      sidePill={{
        label: position.side === 'buy' ? 'Buy' : 'Sell',
        tone: position.side === 'buy' ? 'positive' : 'negative',
      }}
      subtitle={`${position.marketCap} \u00b7 ${position.volume}`}
      pnlAbs={position.pnlAbs}
      pnlPct={position.pnlPct}
      pnlTone="positive"
    >
      <PositionChartLine chart={position.chart} />

      <Box style={tw.style('gap-2')}>
        <Row label="Entry price" value={position.entryPrice} />
        <Row label="Hold time" value={position.holdTime} />

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          style={tw.style('gap-4')}
        >
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            Holders
          </Text>
          <Box style={tw.style('flex-1 max-w-[220px] gap-1')}>
            <HoldersBar
              topPct={position.holdersTopPct}
              devPct={position.holdersDevPct}
            />
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
            >
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
              >
                Top 10% {position.holdersTopPct}%
              </Text>
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
              >
                Devs {position.holdersDevPct}%
              </Text>
            </Box>
          </Box>
        </Box>
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

export default TokenBigPositionCard;
