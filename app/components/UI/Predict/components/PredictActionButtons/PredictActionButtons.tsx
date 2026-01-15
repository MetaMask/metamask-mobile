import React, { useMemo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import PredictBetButtons from './PredictBetButtons';
import PredictClaimButton from './PredictClaimButton';
import PredictDetailsButtonsSkeleton from '../PredictDetailsButtonsSkeleton';
import { PredictActionButtonsProps } from './PredictActionButtons.types';
import { PredictMarketStatus } from '../../types';

const PredictActionButtons: React.FC<PredictActionButtonsProps> = ({
  market,
  outcome,
  onBetPress,
  onClaimPress,
  claimableAmount = 0,
  isLoading = false,
  testID = 'predict-action-buttons',
}) => {
  const isGameMarket = Boolean(market.game);

  const buttonConfig = useMemo(() => {
    const tokens = outcome.tokens;
    if (tokens.length < 2) {
      return null;
    }

    const yesToken = tokens[0];
    const noToken = tokens[1];

    if (isGameMarket && market.game) {
      const { awayTeam, homeTeam } = market.game;
      return {
        yesLabel: awayTeam.abbreviation,
        yesPrice: Math.round(yesToken.price * 100),
        yesTeamColor: awayTeam.color,
        noLabel: homeTeam.abbreviation,
        noPrice: Math.round(noToken.price * 100),
        noTeamColor: homeTeam.color,
      };
    }

    return {
      yesLabel: yesToken.title,
      yesPrice: Math.round(yesToken.price * 100),
      yesTeamColor: undefined,
      noLabel: noToken.title,
      noPrice: Math.round(noToken.price * 100),
      noTeamColor: undefined,
    };
  }, [outcome.tokens, isGameMarket, market.game]);

  if (isLoading) {
    return <PredictDetailsButtonsSkeleton testID={`${testID}-skeleton`} />;
  }

  if (claimableAmount > 0 && onClaimPress) {
    return (
      <Box twClassName="w-full mt-4">
        <PredictClaimButton
          amount={market.game ? undefined : claimableAmount}
          onPress={onClaimPress}
          testID={`${testID}-claim`}
        />
      </Box>
    );
  }

  if (market.status === PredictMarketStatus.OPEN && buttonConfig) {
    return (
      <Box twClassName="w-full mt-4">
        <PredictBetButtons
          yesLabel={buttonConfig.yesLabel}
          yesPrice={buttonConfig.yesPrice}
          onYesPress={() => onBetPress(outcome.tokens[0])}
          noLabel={buttonConfig.noLabel}
          noPrice={buttonConfig.noPrice}
          onNoPress={() => onBetPress(outcome.tokens[1])}
          yesTeamColor={buttonConfig.yesTeamColor}
          noTeamColor={buttonConfig.noTeamColor}
          testID={`${testID}-bet`}
        />
      </Box>
    );
  }

  return null;
};

export default PredictActionButtons;
