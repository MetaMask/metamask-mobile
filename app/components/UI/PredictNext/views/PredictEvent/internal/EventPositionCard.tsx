import React from 'react';
import { Image as ExpoImage } from 'expo-image';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import { getTeamAbbreviation } from '../../../events/game';
import {
  formatAskPrice,
  getAskPricePercent,
} from '../../../events/shared/formatting';
import { isOutcomeTradeable } from '../../../events/shared/tradeable';
import { TeamLogo } from '../../../events/shared/ui';
import type {
  PredictGame,
  PredictMarket,
  PredictOutcome,
  PredictPosition,
  PredictTeam,
} from '../../../types';
import { getOutcomeName } from '../../../utils/entryCopy';
import { formatSharesAmount } from '../../../utils/formatShares';
import {
  formatPositionPnl,
  formatUsdAmount,
  pnlToneClassName,
} from '../../../utils/positionValue';

const NO_VALUE = '–';

export interface EventPositionCardTestIds {
  root: string;
  value: string;
  pnl: string;
  chance: string;
  buy: string;
  cashOut: string;
}

interface EventPositionCardProps {
  position: PredictPosition;
  /** The Event's Market for this Position, when it is loaded. */
  market?: PredictMarket;
  game?: PredictGame;
  isPrivacyMode: boolean;
  onOrder: (market: PredictMarket, outcome: PredictOutcome) => void;
  onCashOut: (position: PredictPosition) => void;
  testIds: EventPositionCardTestIds;
}

/** The Team the Market's yes side backs; both sides show it. */
const getMarketTeam = (
  market?: PredictMarket,
  game?: PredictGame,
): PredictTeam | undefined => {
  const selection = market?.outcomes.find(
    (outcome) => outcome.side === 'yes',
  )?.gameSelection;
  if (selection === 'home') {
    return game?.homeTeam;
  }
  return selection === 'away' ? game?.awayTeam : undefined;
};

/** "Yes · Chicago", or "Yes · Derrick Henry 60+ yards" for a titled card. */
const getTitle = (
  position: PredictPosition,
  heldOutcome?: PredictOutcome,
  market?: PredictMarket,
): string => {
  const outcome =
    position.context?.outcomeLabel ??
    (heldOutcome?.label || getOutcomeName(position.side));
  const name = market?.group?.label
    ? `${market.group.label} ${outcome}`
    : outcome;
  return strings('predict_next.event.position.title', {
    side: strings(`predict_next.portfolio.outcome_side.${position.side}`),
    name,
  });
};

const PositionImage = ({
  team,
  imageUrl,
}: {
  team?: PredictTeam;
  imageUrl?: string;
}) => {
  const tw = useTailwind();
  if (team) {
    return (
      <TeamLogo
        team={team}
        abbreviation={getTeamAbbreviation(team)}
        size="medium"
      />
    );
  }
  return imageUrl ? (
    <ExpoImage
      source={imageUrl}
      recyclingKey={imageUrl}
      contentFit="cover"
      style={tw.style('h-10 w-10 rounded-lg')}
      accessible={false}
    />
  ) : null;
};

/**
 * One open Position on the Event screen: what it is, its chance to win, its
 * value and PnL, and Buy more and Cash Out. Amounts follow privacy mode.
 */
export const EventPositionCard = ({
  position,
  market,
  game,
  isPrivacyMode,
  onOrder,
  onCashOut,
  testIds,
}: EventPositionCardProps) => {
  const heldOutcome = market?.outcomes.find(
    (outcome) => outcome.side === position.side,
  );
  const title = getTitle(position, heldOutcome, market);
  const chance = getAskPricePercent(heldOutcome?.askPrice);
  const chanceText =
    chance === undefined
      ? undefined
      : strings('predict_next.event.position.chance_to_win', {
          percent: Math.round(chance),
        });
  const price = formatAskPrice(heldOutcome?.askPrice);
  const canBuy =
    market !== undefined &&
    heldOutcome !== undefined &&
    isOutcomeTradeable(market, heldOutcome);
  const { averagePrice, currentValue, unrealizedPnl, unrealizedPnlPercent } =
    position;
  const holding =
    isPrivacyMode || averagePrice === undefined
      ? undefined
      : strings('predict_next.event.position.holding', {
          shares: formatSharesAmount(position.shares),
          price: formatAskPrice(averagePrice) ?? NO_VALUE,
        });

  return (
    <Box testID={testIds.root} twClassName="gap-4 rounded-2xl bg-section p-4">
      <Box twClassName="flex-row items-center gap-3">
        <PositionImage
          team={getMarketTeam(market, game)}
          imageUrl={position.context?.imageUrl}
        />
        <Box
          twClassName="min-w-0 flex-1"
          accessible
          accessibilityLabel={[title, chanceText, holding]
            .filter(Boolean)
            .join(', ')}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={2}
          >
            {title}
          </Text>
          {chanceText === undefined ? null : (
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-alternative"
              testID={testIds.chance}
            >
              {chanceText}
            </Text>
          )}
        </Box>
        <Box twClassName="items-end">
          <SensitiveText
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            isHidden={isPrivacyMode}
            length={SensitiveTextLength.Short}
            testID={testIds.value}
          >
            {currentValue === undefined
              ? NO_VALUE
              : formatUsdAmount(currentValue)}
          </SensitiveText>
          {unrealizedPnl === undefined ? null : (
            <SensitiveText
              variant={TextVariant.BodySm}
              twClassName={pnlToneClassName(unrealizedPnl)}
              isHidden={isPrivacyMode}
              length={SensitiveTextLength.Short}
              testID={testIds.pnl}
            >
              {formatPositionPnl(unrealizedPnl, unrealizedPnlPercent)}
            </SensitiveText>
          )}
        </Box>
      </Box>
      <Box twClassName="flex-row gap-2">
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          twClassName="h-12 min-w-0 flex-1 rounded-full bg-muted"
          isDisabled={!canBuy}
          accessibilityState={{ disabled: !canBuy }}
          onPress={
            canBuy && market && heldOutcome
              ? () => onOrder(market, heldOutcome)
              : undefined
          }
          testID={testIds.buy}
        >
          {strings('predict_next.event.position.buy', {
            price: price ?? NO_VALUE,
          })}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          twClassName="h-12 min-w-0 flex-1 rounded-full bg-muted"
          onPress={() => onCashOut(position)}
          testID={testIds.cashOut}
        >
          {strings('predict_next.portfolio.cash_out')}
        </Button>
      </Box>
    </Box>
  );
};
