import React, { createContext, useContext, useMemo } from 'react';
import { Pressable as NativePressable } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import type {
  PredictEvent,
  PredictGame,
  PredictMarket,
  PredictOutcome,
} from '../../../types';
import { formatVolume } from '../../shared/formatting';
import { TeamLogo as SharedTeamLogo } from '../../shared/ui';
import {
  createGameCardProjection,
  type GameCardProjection,
  type GameCardQuote,
  type GameSelection,
} from './createGameCardProjection';

type OrderHandler = (
  event: PredictEvent,
  market: PredictMarket,
  outcome: PredictOutcome,
) => void;

export type GameOutcomeLabelVariant =
  | typeof TextVariant.BodySm
  | typeof TextVariant.BodyMd;

interface GameCardContextValue {
  event: PredictEvent;
  game: PredictGame;
  projection: GameCardProjection;
  actions: {
    openEvent: () => void;
    order?: OrderHandler;
  };
}

const GameCardContext = createContext<GameCardContextValue | undefined>(
  undefined,
);

const useGameCard = () => {
  const value = useContext(GameCardContext);
  if (!value) {
    throw new Error('GameCard parts must be rendered inside GameCard.Provider');
  }
  return value;
};

const useTeam = (selection: GameSelection) => {
  const value = useGameCard();
  return {
    ...value,
    ...value.projection.teams[selection],
  };
};

interface ProviderProps {
  children: React.ReactNode;
  event: PredictEvent;
  game: PredictGame;
  onPress: () => void;
  onOrder?: OrderHandler;
}

const Provider = ({
  children,
  event,
  game,
  onPress,
  onOrder,
}: ProviderProps) => {
  const value = useMemo<GameCardContextValue>(
    () => ({
      event,
      game,
      projection: createGameCardProjection(event, game),
      actions: { openEvent: onPress, order: onOrder },
    }),
    [event, game, onOrder, onPress],
  );

  return (
    <GameCardContext.Provider value={value}>
      {children}
    </GameCardContext.Provider>
  );
};

const Header = () => {
  const { event, projection } = useGameCard();
  const { isLive, liveText, statusText, competition } = projection.status;
  const nonLiveLine = [statusText, competition].filter(Boolean).join(' • ');

  return (
    <Box className="gap-0.5" testID={`predict-next-game-header-${event.id}`}>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Regular}
        color={TextColor.TextDefault}
        numberOfLines={1}
        testID={`predict-next-game-header-${event.id}-title`}
      >
        {event.title}
      </Text>
      {isLive || nonLiveLine ? (
        <Box
          className="flex-row items-center"
          testID={`predict-next-game-status-${event.id}`}
        >
          {isLive ? (
            <>
              <Box
                testID={`predict-next-game-live-dot-${event.id}`}
                className="mr-1.5 h-3 w-3 shrink-0 rounded-full bg-error-default"
              />
              {liveText ? (
                <Text
                  variant={TextVariant.BodyXs}
                  fontWeight={FontWeight.Regular}
                  color={TextColor.ErrorDefault}
                  numberOfLines={1}
                >
                  {liveText}
                </Text>
              ) : null}
              {competition ? (
                <Text
                  variant={TextVariant.BodyXs}
                  fontWeight={FontWeight.Regular}
                  color={TextColor.TextAlternative}
                  numberOfLines={1}
                  className="min-w-0 shrink"
                >
                  {liveText ? ` • ${competition}` : competition}
                </Text>
              ) : null}
            </>
          ) : (
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Regular}
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              {nonLiveLine}
            </Text>
          )}
        </Box>
      ) : null}
    </Box>
  );
};

const OUTCOME_PILL_CLASS_NAME =
  'min-w-[64px] h-[40px] rounded-full border border-success-muted bg-transparent px-3';

const OutcomePill = ({
  selection,
  name,
  quote,
  percentLabel,
  canOrder,
}: {
  selection: GameSelection | 'draw';
  name: string;
  quote?: GameCardQuote;
  percentLabel?: string;
  canOrder: boolean;
}) => {
  const { event, actions } = useGameCard();
  const testID = `predict-next-game-quote-${event.id}-${selection}`;

  if (!quote || percentLabel === undefined) {
    return (
      <Button
        testID={testID}
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Md}
        accessibilityLabel={strings(
          'predict_next.event.game_quote_price_unavailable_accessibility_label',
          { team: name },
        )}
        className={OUTCOME_PILL_CLASS_NAME}
        isDisabled
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          -
        </Text>
      </Button>
    );
  }

  // Without an order handler (the Venue does not support buy) or when the
  // Market is not active, the probability is shown without a buy button.
  if (!canOrder || !actions.order) {
    return (
      <Box
        testID={testID}
        className={`${OUTCOME_PILL_CLASS_NAME} items-center justify-center`}
        accessible
        accessibilityLabel={strings(
          'predict_next.event.game_quote_price_accessibility_label',
          { team: name, price: percentLabel },
        )}
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.SuccessDefault}
          numberOfLines={1}
        >
          {percentLabel}
        </Text>
      </Box>
    );
  }

  return (
    <Button
      testID={testID}
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Md}
      onPress={() => actions.order?.(event, quote.market, quote.outcome)}
      accessibilityLabel={strings(
        'predict_next.event.game_quote_buy_accessibility_label',
        { team: name, price: percentLabel },
      )}
      className={OUTCOME_PILL_CLASS_NAME}
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.SuccessDefault}
        numberOfLines={1}
      >
        {percentLabel}
      </Text>
    </Button>
  );
};

const TeamOutcomeRow = ({
  selection,
  labelVariant,
}: {
  selection: GameSelection;
  labelVariant: GameOutcomeLabelVariant;
}) => {
  const tw = useTailwind();
  const {
    event,
    game,
    projection,
    team,
    abbreviation,
    label,
    quote,
    percent,
    percentLabel,
    canOrder,
    actions,
  } = useTeam(selection);
  const score = projection.showScore ? game.score?.[selection] : undefined;
  const barPercent =
    percent !== undefined ? Math.max(0, Math.min(100, percent)) : undefined;

  return (
    <Box
      className="min-h-[40px] flex-row items-center gap-3"
      testID={`predict-next-game-team-${event.id}-${selection}`}
    >
      <NativePressable
        onPress={actions.openEvent}
        accessible={false}
        style={tw.style('min-w-0 flex-1 flex-row items-center gap-3')}
        testID={`predict-next-game-team-content-${event.id}-${selection}`}
      >
        <SharedTeamLogo
          team={team}
          abbreviation={abbreviation}
          size="xs"
          flipped={false}
          testID={`predict-next-game-logo-${event.id}-${selection}`}
          fallbackTestID={`predict-next-game-logo-fallback-${event.id}-${selection}`}
        />
        <Box className="min-w-0 flex-1 gap-1.5">
          <Text
            variant={labelVariant}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextDefault}
            numberOfLines={1}
            accessibilityLabel={team.name}
            testID={`predict-next-game-team-label-${event.id}-${selection}`}
          >
            {label}
          </Text>
          {barPercent !== undefined ? (
            <Box
              testID={`predict-next-game-bar-${event.id}-${selection}`}
              className="h-[2px] rounded-full bg-success-default"
              style={{ width: `${barPercent}%` }}
            />
          ) : null}
        </Box>
        {score !== undefined ? (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={1}
            className="min-w-[24px] shrink-0 text-right"
            testID={`predict-next-game-score-${event.id}-${selection}`}
          >
            {score}
          </Text>
        ) : null}
      </NativePressable>
      <OutcomePill
        selection={selection}
        name={team.name}
        quote={quote}
        percentLabel={percentLabel}
        canOrder={canOrder}
      />
    </Box>
  );
};

const DrawOutcomeRow = ({
  labelVariant,
}: {
  labelVariant: GameOutcomeLabelVariant;
}) => {
  const tw = useTailwind();
  const { event, game, projection, actions } = useGameCard();
  const { draw } = projection;

  if (!draw) {
    return null;
  }

  const drawLabel = strings('predict_next.event.game_draw_label');
  const hasScore =
    projection.showScore &&
    (game.score?.away !== undefined || game.score?.home !== undefined);
  const barPercent =
    draw.percent !== undefined
      ? Math.max(0, Math.min(100, draw.percent))
      : undefined;

  return (
    <Box
      className="min-h-[40px] flex-row items-center gap-3"
      testID={`predict-next-game-team-${event.id}-draw`}
    >
      <NativePressable
        onPress={actions.openEvent}
        accessible={false}
        style={tw.style('min-w-0 flex-1 flex-row items-center gap-3')}
        testID={`predict-next-game-team-content-${event.id}-draw`}
      >
        <Box
          className="h-7 w-7 shrink-0"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID={`predict-next-game-logo-spacer-${event.id}-draw`}
        />
        <Box className="min-w-0 flex-1 gap-1.5">
          <Text
            variant={labelVariant}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextDefault}
            numberOfLines={1}
            accessibilityLabel={drawLabel}
            testID={`predict-next-game-team-label-${event.id}-draw`}
          >
            {drawLabel}
          </Text>
          {barPercent !== undefined ? (
            <Box
              testID={`predict-next-game-bar-${event.id}-draw`}
              className="h-[2px] rounded-full bg-success-default"
              style={{ width: `${barPercent}%` }}
            />
          ) : null}
        </Box>
        {hasScore ? (
          <Box
            className="min-w-[24px] shrink-0"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            testID={`predict-next-game-score-spacer-${event.id}-draw`}
          />
        ) : null}
      </NativePressable>
      <OutcomePill
        selection="draw"
        name={drawLabel}
        quote={draw.quote}
        percentLabel={draw.percentLabel}
        canOrder={draw.canOrder}
      />
    </Box>
  );
};

const OutcomeRows = ({
  labelVariant = TextVariant.BodyMd,
}: {
  labelVariant?: GameOutcomeLabelVariant;
}) => {
  const { projection } = useGameCard();
  const [first, second] = projection.teamOrder;

  return (
    <Box className="gap-2">
      <TeamOutcomeRow selection={first} labelVariant={labelVariant} />
      {projection.draw ? <DrawOutcomeRow labelVariant={labelVariant} /> : null}
      <TeamOutcomeRow selection={second} labelVariant={labelVariant} />
    </Box>
  );
};

const VolumeFooter = () => {
  const { event, actions } = useGameCard();
  const volume = formatVolume(event.volume);

  if (volume === undefined) {
    return null;
  }

  return (
    <NativePressable
      onPress={actions.openEvent}
      accessible={false}
      testID={`predict-next-game-${event.id}-footer`}
    >
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Regular}
        color={TextColor.TextAlternative}
        testID={`predict-next-event-volume-${event.id}`}
      >
        {strings('predict_next.event.card_volume_label', { volume })}
      </Text>
    </NativePressable>
  );
};

const SMALL_QUOTE_CLASS_NAME = 'h-8 w-[54px] px-0';

/**
 * A small card's 54x32 price pill. A priced, active quote opens the order
 * flow for its Outcome; without a price it shows "-" and takes no action.
 */
const SmallQuote = ({ selection }: { selection: GameSelection }) => {
  const { event, team, quote, formattedPrice, canOrder, actions } =
    useTeam(selection);
  const testID = `predict-next-game-quote-${event.id}-${selection}`;

  if (!quote || !formattedPrice) {
    return (
      <Button
        testID={testID}
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Sm}
        accessibilityLabel={strings(
          'predict_next.event.game_quote_price_unavailable_accessibility_label',
          { team: team.name },
        )}
        className={SMALL_QUOTE_CLASS_NAME}
        isDisabled
      >
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          -
        </Text>
      </Button>
    );
  }

  // Without an order handler (the Venue does not support buy) the price is
  // shown, never offered as a button.
  if (!canOrder || !actions.order) {
    return (
      <Box
        testID={testID}
        className="h-8 w-[54px] items-center justify-center rounded-full bg-muted"
        accessible
        accessibilityLabel={strings(
          'predict_next.event.game_quote_price_accessibility_label',
          { team: team.name, price: formattedPrice },
        )}
      >
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {formattedPrice}
        </Text>
      </Box>
    );
  }

  return (
    <Button
      testID={testID}
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Sm}
      onPress={() => actions.order?.(event, quote.market, quote.outcome)}
      accessibilityLabel={strings(
        'predict_next.event.game_quote_buy_accessibility_label',
        { team: team.name, price: formattedPrice },
      )}
      className={SMALL_QUOTE_CLASS_NAME}
    >
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {formattedPrice}
      </Text>
    </Button>
  );
};

/**
 * A small card Team row: logo and abbreviation, which open the Event, and the
 * Team's price pill. The pill sits outside the Event press target, so a pill
 * without a price does nothing when tapped and screen readers reach each
 * pill on its own.
 */
const SmallTeamRow = ({ selection }: { selection: GameSelection }) => {
  const tw = useTailwind();
  const { event, team, abbreviation, actions } = useTeam(selection);

  return (
    <Box
      className="flex-row items-center gap-2"
      testID={`predict-next-game-team-${event.id}-${selection}`}
    >
      {/* The header row is the Event's accessible button; this repeats it for touch only. */}
      <NativePressable
        onPress={actions.openEvent}
        accessible={false}
        style={tw.style('min-w-0 flex-1 flex-row items-center gap-2')}
        testID={`predict-next-game-team-content-${event.id}-${selection}`}
      >
        <SharedTeamLogo
          team={team}
          abbreviation={abbreviation}
          size="small"
          flipped={false}
          testID={`predict-next-game-logo-${event.id}-${selection}`}
          fallbackTestID={`predict-next-game-logo-fallback-${event.id}-${selection}`}
        />
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          numberOfLines={1}
          className="min-w-0 flex-1"
          accessibilityLabel={team.name}
          testID={`predict-next-game-team-label-${event.id}-${selection}`}
        >
          {abbreviation}
        </Text>
      </NativePressable>
      <SmallQuote selection={selection} />
    </Box>
  );
};

const Navigation = ({ children }: { children: React.ReactNode }) => {
  const { event, actions } = useGameCard();
  return (
    <NativePressable
      onPress={actions.openEvent}
      accessibilityRole="button"
      accessibilityLabel={event.title}
      testID={`predict-next-event-content-${event.venueId}-${event.id}`}
    >
      {children}
    </NativePressable>
  );
};

export const GameCard = {
  Provider,
  Navigation,
  Header,
  OutcomeRows,
  VolumeFooter,
  SmallTeamRow,
};
