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
import type { GameSelectionQuote } from '../game';
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
  // The quote's Outcome carries the Game Selection tag for the dual-line
  // chart and may be the No side; a Team control displays and trades the Yes
  // side of the winner Market. A winner Market without a Yes Outcome fails
  // closed like findGameTradingQuote: no price is shown and the control
  // cannot order the tagged No side.
  const yesOutcome = quote.market.outcomes.find(
    (outcome) => outcome.side === 'yes',
  );
  const price = yesOutcome ? formatAskPrice(yesOutcome.askPrice) : undefined;
  const displayLabel = price ? `${label} · ${price}` : label;
  const isTradeable =
    yesOutcome !== undefined && isOutcomeTradeable(quote.market, yesOutcome);

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
        if (yesOutcome) {
          onOrder({ market: quote.market, outcome: yesOutcome });
        }
      }}
      style={[{ backgroundColor }]}
      twClassName="h-12 min-w-0 flex-1 rounded-xl px-2"
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

  return (
    <Box
      testID={MarketFooterCardTestIds.ROOT}
      twClassName="flex-row gap-[10px] px-4 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      <FooterButton
        selection="away"
        quote={awayQuote}
        label={teamAbbreviation(game.awayTeam)}
        accessibilityName={game.awayTeam.name}
        backgroundColor={game.awayTeam.primaryColor ?? colors.info.default}
        textColor={inverseText}
        onOrder={onOrder}
      />
      <FooterButton
        selection="home"
        quote={homeQuote}
        label={teamAbbreviation(game.homeTeam)}
        accessibilityName={game.homeTeam.name}
        backgroundColor={game.homeTeam.primaryColor ?? colors.success.default}
        textColor={inverseText}
        onOrder={onOrder}
      />
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
