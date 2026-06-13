import React, { memo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import PredictMarketOutcome from '../../../../components/PredictMarketOutcome';
import PredictMarketOutcomeResolved from '../../../../components/PredictMarketOutcomeResolved';
import {
  PredictMarketStatus,
  type PredictMarket,
  type PredictOutcome,
  type PredictOutcomeToken,
} from '../../../../types';

export interface PredictMarketDetailsOutcomesProps {
  market: PredictMarket | null;
  marketStatus: PredictMarketStatus | undefined;
  singleOutcomeMarket: boolean;
  multipleOutcomes: boolean;
  winningOutcome: PredictOutcome | undefined;
  losingOutcome: PredictOutcome | undefined;
  winningOutcomeToken: PredictOutcomeToken | undefined;
  losingOutcomeToken: PredictOutcomeToken | undefined;
  closedOutcomes: PredictOutcome[];
}

const PredictMarketDetailsOutcomes = memo(
  ({
    market,
    marketStatus,
    singleOutcomeMarket,
    multipleOutcomes,
    winningOutcome,
    losingOutcome,
    winningOutcomeToken,
    losingOutcomeToken,
    closedOutcomes,
  }: PredictMarketDetailsOutcomesProps) => {
    if (!market) {
      return null;
    }

    if (marketStatus === PredictMarketStatus.CLOSED && singleOutcomeMarket) {
      return (
        <Box>
          {winningOutcome && (
            <PredictMarketOutcome
              market={market}
              outcome={winningOutcome}
              outcomeToken={winningOutcomeToken}
              isClosed
            />
          )}
          {losingOutcome && (
            <PredictMarketOutcome
              market={market}
              outcome={losingOutcome}
              outcomeToken={losingOutcomeToken}
              isClosed
            />
          )}
        </Box>
      );
    }

    if (marketStatus === PredictMarketStatus.CLOSED && multipleOutcomes) {
      return closedOutcomes.map((outcome) => (
        <PredictMarketOutcomeResolved key={outcome.id} outcome={outcome} />
      ));
    }

    return (
      <Box>
        {(market.outcomes ?? []).map((outcome, index) => (
          <PredictMarketOutcome
            key={
              outcome?.id ??
              outcome?.tokens?.[0]?.id ??
              outcome?.title ??
              `outcome-${index}`
            }
            market={market}
            outcome={outcome}
          />
        ))}
      </Box>
    );
  },
);

PredictMarketDetailsOutcomes.displayName = 'PredictMarketDetailsOutcomes';

export default PredictMarketDetailsOutcomes;
