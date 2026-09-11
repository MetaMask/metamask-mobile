import React, { useCallback, useMemo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import PredictBetButtons from './PredictBetButtons';
import PredictClaimButton from './PredictClaimButton';
import PredictDetailsButtonsSkeleton from '../PredictDetailsButtonsSkeleton';
import {
  PredictActionButtonsProps,
  PredictBetButtonLayout,
} from './PredictActionButtons.types';
import {
  PredictMarketGame,
  PredictMarketStatus,
  PredictOutcomeToken,
} from '../../types';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import {
  getPrimaryMoneylineOutcomes,
  isDrawCapableMarket,
  resolvePredictSportCardButtons,
} from '../../utils/sports';
import {
  BASE_PREDICT_ACTION_BUTTONS_TEST_IDS,
  PREDICT_ACTION_BUTTONS_TEST_IDS,
} from './PredictActionButtons.testIds';

interface ButtonConfig {
  yesLabel: string;
  yesPrice: number;
  yesTeamColor?: string;
  yesToken: PredictOutcomeToken;
  noLabel: string;
  noPrice: number;
  noTeamColor?: string;
  noToken: PredictOutcomeToken;
  drawLabel?: string;
  drawPrice?: number;
  drawToken?: PredictOutcomeToken;
}

type GameTeam = PredictMarketGame['homeTeam'];

const normalizeLabel = (value?: string): string | undefined =>
  value?.trim().toLowerCase();

const teamMatchesToken = (
  team: GameTeam,
  token: PredictOutcomeToken,
): boolean => {
  const tokenLabels = [token.shortTitle, token.title]
    .map(normalizeLabel)
    .filter((label): label is string => Boolean(label));
  const teamLabels = [team.abbreviation, team.name, team.alias]
    .map(normalizeLabel)
    .filter((label): label is string => Boolean(label));

  return tokenLabels.some((tokenLabel) => teamLabels.includes(tokenLabel));
};

const getTokenTeam = (
  token: PredictOutcomeToken,
  game: PredictMarketGame,
): GameTeam | undefined => {
  if (teamMatchesToken(game.homeTeam, token)) {
    return game.homeTeam;
  }
  if (teamMatchesToken(game.awayTeam, token)) {
    return game.awayTeam;
  }
  return undefined;
};

const PredictActionButtons: React.FC<PredictActionButtonsProps> = ({
  market,
  outcome,
  onBetPress,
  onClaimPress,
  claimableAmount = 0,
  isLoading = false,
  isClaimPending = false,
  isCarousel,
  buttonLayout,
  buttonGapClassName,
  buttonContainerClassName,
  testID = BASE_PREDICT_ACTION_BUTTONS_TEST_IDS.PREDICT_ACTION_BUTTON,
}) => {
  const isGameMarket = Boolean(market.game);
  const isMarketOpen = market.status === PredictMarketStatus.OPEN;
  const moneylineOutcomes = useMemo(
    () => getPrimaryMoneylineOutcomes(market.outcomes),
    [market.outcomes],
  );
  const hasMainMoneylineOutcomes = moneylineOutcomes.some(
    (marketOutcome) =>
      marketOutcome.sportsMarketType?.toLowerCase() === 'moneyline',
  );
  const primaryOutcome =
    hasMainMoneylineOutcomes && !moneylineOutcomes.includes(outcome)
      ? (moneylineOutcomes[0] ?? outcome)
      : outcome;

  const isDrawCapable = Boolean(
    isGameMarket &&
      market.game &&
      isDrawCapableMarket({
        game: market.game,
        outcomes: market.outcomes,
      }),
  );

  const buttonResolution = useMemo(() => {
    if (!isDrawCapable || !market.game) {
      return null;
    }

    return resolvePredictSportCardButtons({
      outcomes: market.outcomes,
      game: market.game,
      showDraw: true,
    });
  }, [isDrawCapable, market.game, market.outcomes]);

  const hasResolvedDrawButtons = Boolean(
    buttonResolution?.home && buttonResolution.draw && buttonResolution.away,
  );

  const tokenIds = useMemo(() => {
    if (hasResolvedDrawButtons) {
      return [
        buttonResolution?.home?.token,
        buttonResolution?.draw?.token,
        buttonResolution?.away?.token,
      ]
        .map((token) => token?.id)
        .filter((tokenId): tokenId is string => Boolean(tokenId));
    }

    return primaryOutcome.tokens.map((token) => token.id);
  }, [buttonResolution, hasResolvedDrawButtons, primaryOutcome.tokens]);

  const { getPrice } = useLiveMarketPrices(tokenIds, {
    enabled: isMarketOpen && !isLoading,
  });

  const buttonConfig = useMemo<ButtonConfig | null>(() => {
    if (hasResolvedDrawButtons && buttonResolution && market.game) {
      const homeToken = buttonResolution.home?.token;
      const drawToken = buttonResolution.draw?.token;
      const awayToken = buttonResolution.away?.token;

      if (!homeToken || !drawToken || !awayToken) {
        return null;
      }

      const { homeTeam, awayTeam } = market.game;

      const homePrice = getPrice(homeToken.id);
      const drawPrice = getPrice(drawToken.id);
      const awayPrice = getPrice(awayToken.id);

      return {
        yesLabel: homeTeam.abbreviation,
        yesPrice: Math.round((homePrice?.bestAsk ?? homeToken.price) * 100),
        yesTeamColor: homeTeam.color,
        yesToken: homeToken,
        drawLabel: 'DRAW',
        drawPrice: Math.round((drawPrice?.bestAsk ?? drawToken.price) * 100),
        drawToken,
        noLabel: awayTeam.abbreviation,
        noPrice: Math.round((awayPrice?.bestAsk ?? awayToken.price) * 100),
        noTeamColor: awayTeam.color,
        noToken: awayToken,
      };
    }

    const tokens = primaryOutcome.tokens;
    if (tokens.length < 2) {
      return null;
    }

    const yesToken = tokens[0];
    const noToken = tokens[1];

    const yesLivePrice = getPrice(yesToken.id);
    const noLivePrice = getPrice(noToken.id);

    const yesPrice = yesLivePrice?.bestAsk ?? yesToken.price;
    const noPrice = noLivePrice?.bestAsk ?? noToken.price;

    if (isGameMarket && market.game) {
      const { awayTeam, homeTeam } = market.game;
      const yesTeam = getTokenTeam(yesToken, market.game) ?? awayTeam;
      const noTeam = getTokenTeam(noToken, market.game) ?? homeTeam;

      return {
        yesLabel: yesTeam.abbreviation,
        yesPrice: Math.round(yesPrice * 100),
        yesTeamColor: yesTeam.color,
        yesToken,
        noLabel: noTeam.abbreviation,
        noPrice: Math.round(noPrice * 100),
        noTeamColor: noTeam.color,
        noToken,
      };
    }

    return {
      yesLabel: yesToken.title,
      yesPrice: Math.round(yesPrice * 100),
      yesTeamColor: undefined,
      yesToken,
      noLabel: noToken.title,
      noPrice: Math.round(noPrice * 100),
      noTeamColor: undefined,
      noToken,
    };
  }, [
    primaryOutcome.tokens,
    isGameMarket,
    market.game,
    buttonResolution,
    hasResolvedDrawButtons,
    getPrice,
  ]);

  if (isLoading) {
    return (
      <PredictDetailsButtonsSkeleton
        testID={`${testID}${PREDICT_ACTION_BUTTONS_TEST_IDS.PREDICT_SKELETON}`}
      />
    );
  }

  if (claimableAmount > 0 && onClaimPress) {
    return (
      <Box twClassName="w-full mt-4">
        <PredictClaimButton
          amount={market.game ? undefined : claimableAmount}
          onPress={onClaimPress}
          isLoading={isClaimPending}
          testID={`${testID}${PREDICT_ACTION_BUTTONS_TEST_IDS.PREDICT_CLAIM_BUTTON}`}
        />
      </Box>
    );
  }

  if (market.status === PredictMarketStatus.OPEN && buttonConfig) {
    return (
      <PredictBetButtonsContainer
        buttonConfig={buttonConfig}
        onBetPress={onBetPress}
        testID={testID}
        isCarousel={isCarousel}
        buttonLayout={buttonLayout}
        buttonGapClassName={buttonGapClassName}
        buttonContainerClassName={buttonContainerClassName}
      />
    );
  }

  return null;
};

function PredictBetButtonsContainer(props: {
  buttonConfig: ButtonConfig;
  onBetPress: (token: PredictOutcomeToken) => void;
  testID: string;
  isCarousel?: boolean;
  buttonLayout?: PredictBetButtonLayout;
  buttonGapClassName?: string;
  buttonContainerClassName?: string;
}) {
  const {
    buttonConfig,
    onBetPress,
    testID,
    isCarousel,
    buttonLayout,
    buttonGapClassName,
    buttonContainerClassName = 'w-full mt-4',
  } = props;
  const { yesToken, drawToken, noToken } = buttonConfig;

  const onYesPress = useCallback(
    () => onBetPress(yesToken),
    [onBetPress, yesToken],
  );
  const onDrawPress = useMemo(
    () => (drawToken ? () => onBetPress(drawToken) : undefined),
    [onBetPress, drawToken],
  );
  const onNoPress = useCallback(
    () => onBetPress(noToken),
    [onBetPress, noToken],
  );

  return (
    <Box twClassName={buttonContainerClassName}>
      <PredictBetButtons
        yesLabel={buttonConfig.yesLabel}
        yesPrice={buttonConfig.yesPrice}
        onYesPress={onYesPress}
        drawLabel={buttonConfig.drawLabel}
        drawPrice={buttonConfig.drawPrice}
        onDrawPress={onDrawPress}
        noLabel={buttonConfig.noLabel}
        noPrice={buttonConfig.noPrice}
        onNoPress={onNoPress}
        yesTeamColor={buttonConfig.yesTeamColor}
        noTeamColor={buttonConfig.noTeamColor}
        testID={`${testID}${PREDICT_ACTION_BUTTONS_TEST_IDS.PREDICT_BET_BUTTON}`}
        isCarousel={isCarousel}
        layout={buttonLayout}
        gapClassName={buttonGapClassName}
      />
    </Box>
  );
}

export default PredictActionButtons;
