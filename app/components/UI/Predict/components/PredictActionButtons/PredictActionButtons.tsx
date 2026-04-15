import React, { useMemo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import PredictBetButtons from './PredictBetButtons';
import PredictClaimButton from './PredictClaimButton';
import PredictDetailsButtonsSkeleton from '../PredictDetailsButtonsSkeleton';
import { PredictActionButtonsProps } from './PredictActionButtons.types';
import { PredictMarketStatus, PredictOutcomeToken } from '../../types';
import { useLiveMarketPrices } from '../../hooks/useLiveMarketPrices';
import { isDrawCapableLeague } from '../../constants/sports';
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

const PredictActionButtons: React.FC<PredictActionButtonsProps> = ({
  market,
  outcome,
  onBetPress,
  onClaimPress,
  claimableAmount = 0,
  isLoading = false,
  isClaimPending = false,
  isCarousel,
  testID = BASE_PREDICT_ACTION_BUTTONS_TEST_IDS.PREDICT_ACTION_BUTTON,
}) => {
  const isGameMarket = Boolean(market.game);
  const isMarketOpen = market.status === PredictMarketStatus.OPEN;

  const isDrawCapable =
    isGameMarket &&
    market.game &&
    isDrawCapableLeague(market.game.league) &&
    market.outcomes.length >= 3;

  const sortedOutcomes = useMemo(() => {
    if (!isDrawCapable) {
      return null;
    }
    return [...market.outcomes].sort(
      (a, b) => (a.groupItemThreshold ?? 0) - (b.groupItemThreshold ?? 0),
    );
  }, [isDrawCapable, market.outcomes]);

  const tokenIds = useMemo(() => {
    if (sortedOutcomes) {
      return sortedOutcomes
        .map((marketOutcome) => marketOutcome.tokens[0]?.id)
        .filter((tokenId): tokenId is string => Boolean(tokenId));
    }

    return outcome.tokens.map((token) => token.id);
  }, [sortedOutcomes, outcome.tokens]);

  const { getPrice } = useLiveMarketPrices(tokenIds, {
    enabled: isMarketOpen && !isLoading,
  });

  const buttonConfig = useMemo<ButtonConfig | null>(() => {
    if (sortedOutcomes && market.game) {
      const homeOutcome = sortedOutcomes[0];
      const drawOutcome = sortedOutcomes[1];
      const awayOutcome = sortedOutcomes[2];

      const homeToken = homeOutcome?.tokens[0];
      const drawToken = drawOutcome?.tokens[0];
      const awayToken = awayOutcome?.tokens[0];

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

    const tokens = outcome.tokens;
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
      return {
        yesLabel: awayTeam.abbreviation,
        yesPrice: Math.round(yesPrice * 100),
        yesTeamColor: awayTeam.color,
        yesToken,
        noLabel: homeTeam.abbreviation,
        noPrice: Math.round(noPrice * 100),
        noTeamColor: homeTeam.color,
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
  }, [outcome.tokens, isGameMarket, market.game, sortedOutcomes, getPrice]);

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
    const drawToken = buttonConfig.drawToken;

    return (
      <Box twClassName="w-full mt-4">
        <PredictBetButtons
          yesLabel={buttonConfig.yesLabel}
          yesPrice={buttonConfig.yesPrice}
          onYesPress={() => onBetPress(buttonConfig.yesToken)}
          drawLabel={buttonConfig.drawLabel}
          drawPrice={buttonConfig.drawPrice}
          onDrawPress={drawToken ? () => onBetPress(drawToken) : undefined}
          noLabel={buttonConfig.noLabel}
          noPrice={buttonConfig.noPrice}
          onNoPress={() => onBetPress(buttonConfig.noToken)}
          yesTeamColor={buttonConfig.yesTeamColor}
          noTeamColor={buttonConfig.noTeamColor}
          testID={`${testID}${PREDICT_ACTION_BUTTONS_TEST_IDS.PREDICT_BET_BUTTON}`}
          isCarousel={isCarousel}
        />
      </Box>
    );
  }

  return null;
};

export default PredictActionButtons;
