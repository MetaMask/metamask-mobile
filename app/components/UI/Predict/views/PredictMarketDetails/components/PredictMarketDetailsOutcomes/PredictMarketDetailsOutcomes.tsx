import React, { memo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import PredictMarketOutcome from '../../../../components/PredictMarketOutcome';
import PredictMarketOutcomeResolved from '../../../../components/PredictMarketOutcomeResolved';
import PredictResolvedOutcomesDropdown from '../../../../components/PredictResolvedOutcomesDropdown';
import {
  PredictMarketStatus,
  type PredictMarket,
  type PredictOutcome,
  type PredictOutcomeToken,
} from '../../../../types';
import type { PredictEntryPoint } from '../../../../types/navigation';
import { getPredictMarketDetailsSelector } from '../../../../Predict.testIds';

export interface PredictMarketDetailsOutcomesProps {
  market: PredictMarket | null;
  marketStatus: PredictMarketStatus | undefined;
  singleOutcomeMarket: boolean;
  multipleOutcomes: boolean;
  multipleOpenOutcomesPartiallyResolved: boolean;
  winningOutcome: PredictOutcome | undefined;
  losingOutcome: PredictOutcome | undefined;
  winningOutcomeToken: PredictOutcomeToken | undefined;
  losingOutcomeToken: PredictOutcomeToken | undefined;
  openOutcomes: PredictOutcome[];
  closedOutcomes: PredictOutcome[];
  entryPoint: string | undefined;
  isResolvedExpanded: boolean;
  onResolvedExpandedToggle: (
    value: boolean | ((prev: boolean) => boolean),
  ) => void;
}

const PredictMarketDetailsOutcomes = memo(
  ({
    market,
    marketStatus,
    singleOutcomeMarket,
    multipleOutcomes,
    multipleOpenOutcomesPartiallyResolved,
    winningOutcome,
    losingOutcome,
    winningOutcomeToken,
    losingOutcomeToken,
    openOutcomes,
    closedOutcomes,
    entryPoint,
    isResolvedExpanded,
    onResolvedExpandedToggle,
  }: PredictMarketDetailsOutcomesProps) => {
    if (!market) {
      return null;
    }

    // Closed market with single outcome (binary)
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

    // Closed market with multiple outcomes
    if (marketStatus === PredictMarketStatus.CLOSED && multipleOutcomes) {
      return closedOutcomes.map((outcome) => (
        <PredictMarketOutcomeResolved key={outcome.id} outcome={outcome} />
      ));
    }

    // Open market with partially resolved outcomes
    if (
      marketStatus === PredictMarketStatus.OPEN &&
      multipleOutcomes &&
      multipleOpenOutcomesPartiallyResolved
    ) {
      return (
        <Box>
          {openOutcomes.map((outcome) => (
            <PredictMarketOutcome
              key={outcome.id}
              market={market}
              outcome={outcome}
              entryPoint={entryPoint as PredictEntryPoint | undefined}
            />
          ))}
          <PredictResolvedOutcomesDropdown
            count={closedOutcomes.length}
            isExpanded={isResolvedExpanded}
            onToggle={() => onResolvedExpandedToggle((prev: boolean) => !prev)}
            collapsedIconTestID={getPredictMarketDetailsSelector.icon(
              'ArrowDown',
            )}
            expandedIconTestID={getPredictMarketDetailsSelector.icon('ArrowUp')}
          >
            {closedOutcomes.map((outcome) => (
              <PredictMarketOutcomeResolved
                key={outcome.id}
                outcome={outcome}
                noContainer
              />
            ))}
          </PredictResolvedOutcomesDropdown>
        </Box>
      );
    }

    // Default: show all outcomes
    return (
      <Box>
        {market &&
          (marketStatus === PredictMarketStatus.OPEN
            ? openOutcomes
            : (market.outcomes ?? [])
          ).map((outcome, index) => (
            <PredictMarketOutcome
              key={
                outcome?.id ??
                outcome?.tokens?.[0]?.id ??
                outcome?.title ??
                `outcome-${index}`
              }
              market={market}
              outcome={outcome}
              entryPoint={entryPoint as PredictEntryPoint | undefined}
            />
          ))}
      </Box>
    );
  },
);

PredictMarketDetailsOutcomes.displayName = 'PredictMarketDetailsOutcomes';

export default PredictMarketDetailsOutcomes;
