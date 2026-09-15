import React from 'react';
import { StyleSheet } from 'react-native';
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
import { MarketFooterCardTestIds } from './MarketFooterCard.testIds';

export interface MarketFooterCardProps {
  game: PredictGame;
  awayQuote: GameSelectionQuote;
  homeQuote: GameSelectionQuote;
  drawQuote?: GameSelectionQuote;
  selectedMarketId?: string;
  onSelectMarket: (marketId: string) => void;
}

const teamAbbreviation = (team: PredictTeam): string =>
  (team.abbreviation ?? team.name.slice(0, 3)).toUpperCase();

const styles = StyleSheet.create({
  selectedButton: {
    borderWidth: 2,
  },
});

const FooterButton = ({
  selection,
  quote,
  label,
  accessibilityName,
  backgroundColor,
  textColor,
  isSelected,
  onSelectMarket,
}: {
  selection: 'away' | 'home' | 'draw';
  quote: GameSelectionQuote;
  label: string;
  accessibilityName: string;
  backgroundColor?: string;
  textColor?: string;
  isSelected: boolean;
  onSelectMarket: (marketId: string) => void;
}) => {
  const price = formatAskPrice(quote.outcome.askPrice);
  const displayLabel = price ? `${label} · ${price}` : label;

  return (
    <Button
      testID={MarketFooterCardTestIds.button(selection)}
      accessibilityLabel={
        price
          ? `${accessibilityName}, ${price}`
          : `${accessibilityName}, ${strings('predict.market.footer_price_unavailable')}`
      }
      accessibilityState={{ selected: isSelected, disabled: false }}
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Lg}
      onPress={() => onSelectMarket(quote.market.id)}
      style={[
        { backgroundColor },
        isSelected ? styles.selectedButton : undefined,
      ]}
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
  selectedMarketId,
  onSelectMarket,
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
        isSelected={selectedMarketId === awayQuote.market.id}
        onSelectMarket={onSelectMarket}
      />
      <FooterButton
        selection="home"
        quote={homeQuote}
        label={teamAbbreviation(game.homeTeam)}
        accessibilityName={game.homeTeam.name}
        backgroundColor={game.homeTeam.primaryColor ?? colors.success.default}
        textColor={inverseText}
        isSelected={selectedMarketId === homeQuote.market.id}
        onSelectMarket={onSelectMarket}
      />
      {drawQuote ? (
        <FooterButton
          selection="draw"
          quote={drawQuote}
          label={strings('predict.market.draw')}
          accessibilityName={strings('predict.market.draw')}
          isSelected={selectedMarketId === drawQuote.market.id}
          onSelectMarket={onSelectMarket}
        />
      ) : null}
    </Box>
  );
};
