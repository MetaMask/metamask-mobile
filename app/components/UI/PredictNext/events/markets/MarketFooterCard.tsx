import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import type { PredictGame, PredictTeam } from '../../types';
import {
  getGameTeamOrder,
  toGameTradingQuote,
  type GameSelection,
  type GameSelectionQuote,
} from '../game';
import { formatAskPrice } from '../shared/formatting';
import { isOutcomeTradeable } from '../shared/tradeable';
import { MarketFooterCardTestIds } from './MarketFooterCard.testIds';

export interface MarketFooterCardProps {
  game: PredictGame;
  awayQuote: GameSelectionQuote;
  homeQuote: GameSelectionQuote;
  drawQuote?: GameSelectionQuote;
  /** Starts the Order flow for the Yes Outcome of the quote's winner Market. */
  onOrder: (quote: GameSelectionQuote) => void;
}

const teamAbbreviation = (team: PredictTeam): string =>
  (team.abbreviation ?? team.name.slice(0, 3)).toUpperCase();

const FooterButton = ({
  selection,
  quote,
  label,
  accessibilityName,
  backgroundColor,
  textColor,
  onOrder,
}: {
  selection: 'away' | 'home' | 'draw';
  quote: GameSelectionQuote;
  label: string;
  accessibilityName: string;
  backgroundColor?: string;
  textColor?: string;
  onOrder: (quote: GameSelectionQuote) => void;
}) => {
  const tradingQuote = toGameTradingQuote(quote);
  const price = tradingQuote
    ? formatAskPrice(tradingQuote.outcome.askPrice)
    : undefined;
  const displayLabel = price ? `${label} · ${price}` : label;
  const isTradeable =
    tradingQuote !== undefined &&
    isOutcomeTradeable(tradingQuote.market, tradingQuote.outcome);

  return (
    <Button
      testID={MarketFooterCardTestIds.button(selection)}
      accessibilityLabel={
        price
          ? `${accessibilityName}, ${price}`
          : `${accessibilityName}, ${strings('predict.market.footer_price_unavailable')}`
      }
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Lg}
      isDisabled={!isTradeable}
      onPress={() => {
        if (tradingQuote) {
          onOrder(tradingQuote);
        }
      }}
      style={[{ backgroundColor }]}
      className="h-12 min-w-0 flex-1 rounded-xl px-2"
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        numberOfLines={1}
        style={textColor ? { color: textColor } : undefined}
      >
        {displayLabel}
      </Text>
    </Button>
  );
};

export const MarketFooterCard = ({
  game,
  awayQuote,
  homeQuote,
  drawQuote,
  onOrder,
}: MarketFooterCardProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inverseText = colors.overlay.inverse;
  const teams: Record<
    GameSelection,
    { team: PredictTeam; quote: GameSelectionQuote; fallbackColor: string }
  > = {
    away: {
      team: game.awayTeam,
      quote: awayQuote,
      fallbackColor: colors.info.default,
    },
    home: {
      team: game.homeTeam,
      quote: homeQuote,
      fallbackColor: colors.success.default,
    },
  };

  return (
    <Box
      testID={MarketFooterCardTestIds.ROOT}
      className="flex-row gap-2 px-4 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      {getGameTeamOrder(game).map((selection) => {
        const { team, quote, fallbackColor } = teams[selection];
        return (
          <FooterButton
            key={selection}
            selection={selection}
            quote={quote}
            label={teamAbbreviation(team)}
            accessibilityName={team.name}
            backgroundColor={team.primaryColor ?? fallbackColor}
            textColor={inverseText}
            onOrder={onOrder}
          />
        );
      })}
      {drawQuote ? (
        <FooterButton
          selection="draw"
          quote={drawQuote}
          label={strings('predict.market.draw')}
          accessibilityName={strings('predict.market.draw')}
          onOrder={onOrder}
        />
      ) : null}
    </Box>
  );
};
