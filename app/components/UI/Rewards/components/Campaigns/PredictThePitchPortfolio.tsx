import React, { useMemo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import type { PredictThePitchPositionsDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import RewardsErrorBanner from '../RewardsErrorBanner';
import RewardsInfoBanner from '../RewardsInfoBanner';
import {
  PredictThePitchOpenPositionRow,
  PredictThePitchResolvedPositionRow,
  PredictThePitchSoldPositionRow,
} from './PredictThePitchPositionRows';

export const PREDICT_THE_PITCH_PORTFOLIO_TEST_IDS = {
  CONTAINER: 'predict-the-pitch-portfolio-container',
  ROW: 'predict-the-pitch-portfolio-row',
  LOADING: 'predict-the-pitch-portfolio-loading',
  ERROR: 'predict-the-pitch-portfolio-error',
  EMPTY: 'predict-the-pitch-portfolio-empty',
} as const;

interface PredictThePitchPortfolioProps {
  positions: PredictThePitchPositionsDto | null;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => void;
  maxEntries?: number;
}

const SKELETON_ROW_COUNT = 3;

const PredictThePitchPortfolioSkeleton: React.FC<{ rowCount: number }> = ({
  rowCount,
}) => {
  const tw = useTailwind();

  return (
    <Box
      twClassName="gap-3 py-1"
      testID={PREDICT_THE_PITCH_PORTFOLIO_TEST_IDS.LOADING}
    >
      {Array.from({ length: rowCount }, (_, index) => (
        <Box key={index} twClassName="flex-row items-start gap-4 py-2">
          <Skeleton width={40} height={40} style={tw.style('rounded-full')} />
          <Box twClassName="flex-1 gap-2">
            <Skeleton width="100%" height={18} style={tw.style('rounded-md')} />
            <Skeleton width="70%" height={16} style={tw.style('rounded-md')} />
          </Box>
          <Box twClassName="items-end gap-2">
            <Skeleton width={64} height={18} style={tw.style('rounded-md')} />
            <Skeleton width={48} height={16} style={tw.style('rounded-md')} />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

/** Flat preview list for campaign details — no Open/Closed section headers. */
const PredictThePitchPortfolio: React.FC<PredictThePitchPortfolioProps> = ({
  positions,
  isLoading,
  hasError,
  refetch,
  maxEntries,
}) => {
  const { openEntries, resolvedEntries } = useMemo(() => {
    const open = positions?.openPositions ?? [];
    const resolved = positions?.resolvedPositions ?? [];
    if (!maxEntries) {
      return { openEntries: open, resolvedEntries: resolved };
    }

    const limitedOpen = open.slice(0, maxEntries);
    const remaining = maxEntries - limitedOpen.length;
    const limitedResolved = remaining > 0 ? resolved.slice(0, remaining) : [];

    return { openEntries: limitedOpen, resolvedEntries: limitedResolved };
  }, [positions, maxEntries]);

  const totalEntries = openEntries.length + resolvedEntries.length;

  if (isLoading && !positions) {
    return (
      <PredictThePitchPortfolioSkeleton
        rowCount={maxEntries ?? SKELETON_ROW_COUNT}
      />
    );
  }

  if (hasError && !positions) {
    return (
      <RewardsErrorBanner
        title={strings('rewards.predict_the_pitch_campaign.positions_error')}
        description={strings(
          'rewards.predict_the_pitch_campaign.positions_error_description',
        )}
        onConfirm={refetch}
        confirmButtonLabel={strings(
          'rewards.predict_the_pitch_campaign.positions_retry',
        )}
        testID={PREDICT_THE_PITCH_PORTFOLIO_TEST_IDS.ERROR}
      />
    );
  }

  if (totalEntries === 0) {
    return (
      <RewardsInfoBanner
        title={strings('rewards.predict_the_pitch_campaign.positions_empty')}
        description={strings(
          'rewards.predict_the_pitch_campaign.positions_empty_description',
        )}
        showInfoIcon={false}
        testID={PREDICT_THE_PITCH_PORTFOLIO_TEST_IDS.EMPTY}
      />
    );
  }

  return (
    <Box testID={PREDICT_THE_PITCH_PORTFOLIO_TEST_IDS.CONTAINER}>
      {openEntries.map((position, index) => (
        <PredictThePitchOpenPositionRow
          key={`${position.outcomeAssetId}-${index}`}
          position={position}
          index={index}
        />
      ))}
      {resolvedEntries.map((position, index) => {
        const rowIndex = openEntries.length + index;

        if (position.status === 'resolved') {
          return (
            <PredictThePitchResolvedPositionRow
              key={`${position.outcomeAssetId}-${index}`}
              position={position}
              index={rowIndex}
            />
          );
        }

        return (
          <PredictThePitchSoldPositionRow
            key={`${position.outcomeAssetId}-${index}`}
            position={position}
            index={rowIndex}
          />
        );
      })}
    </Box>
  );
};

export default PredictThePitchPortfolio;
