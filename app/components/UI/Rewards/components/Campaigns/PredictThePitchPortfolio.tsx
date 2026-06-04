import React, { useMemo } from 'react';
import { Image } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type {
  PredictThePitchPositionDto,
  PredictThePitchPositionsDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';
import RewardsErrorBanner from '../RewardsErrorBanner';
import RewardsInfoBanner from '../RewardsInfoBanner';
import { formatPercentChange, formatUsd } from '../../utils/formatUtils';

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

const getRoiColor = (roi: number): TextColor =>
  roi >= 0 ? TextColor.SuccessDefault : TextColor.ErrorDefault;

const PredictThePitchPositionIcon: React.FC<{
  position: PredictThePitchPositionDto;
}> = ({ position }) => {
  const tw = useTailwind();

  if (position.iconUrl) {
    return (
      <Image
        source={{ uri: position.iconUrl }}
        style={tw.style('h-9 w-9 rounded-full bg-muted')}
      />
    );
  }

  return (
    <Box
      twClassName="h-9 w-9 rounded-full bg-muted"
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
    >
      <Icon
        name={IconName.Chart}
        size={IconSize.Md}
        color={IconColor.IconDefault}
      />
    </Box>
  );
};

const PredictThePitchPositionRow: React.FC<{
  position: PredictThePitchPositionDto;
  index: number;
}> = ({ position, index }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="gap-3 py-2"
    testID={`${PREDICT_THE_PITCH_PORTFOLIO_TEST_IDS.ROW}-${index}`}
  >
    <PredictThePitchPositionIcon position={position} />
    <Box twClassName="flex-1 min-w-0">
      <Text variant={TextVariant.BodyMd} numberOfLines={1}>
        {position.displayName}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        numberOfLines={1}
      >
        {position.eventSlug ?? '-'}
      </Text>
    </Box>
    <Box alignItems={BoxAlignItems.End}>
      <Text variant={TextVariant.BodyMd}>{formatUsd(position.moneySpent)}</Text>
      <Text
        variant={TextVariant.BodySm}
        color={getRoiColor(position.roi)}
        numberOfLines={1}
      >
        {formatPercentChange(position.roi)}
      </Text>
    </Box>
  </Box>
);

const PredictThePitchPortfolio: React.FC<PredictThePitchPortfolioProps> = ({
  positions,
  isLoading,
  hasError,
  refetch,
  maxEntries,
}) => {
  const tw = useTailwind();
  const entries = useMemo(() => {
    const allPositions = positions?.positions ?? [];
    return maxEntries ? allPositions.slice(0, maxEntries) : allPositions;
  }, [positions, maxEntries]);

  if (isLoading && !positions) {
    return (
      <Box
        twClassName="gap-3"
        testID={PREDICT_THE_PITCH_PORTFOLIO_TEST_IDS.LOADING}
      >
        {Array.from({ length: maxEntries ?? 5 }).map((_, index) => (
          <Skeleton key={index} style={tw.style('h-12 rounded-lg')} />
        ))}
      </Box>
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

  if (entries.length === 0) {
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
    <Box
      twClassName="gap-1"
      testID={PREDICT_THE_PITCH_PORTFOLIO_TEST_IDS.CONTAINER}
    >
      {entries.map((position, index) => (
        <PredictThePitchPositionRow
          key={`${position.conditionId}-${index}`}
          position={position}
          index={index}
        />
      ))}
    </Box>
  );
};

export default PredictThePitchPortfolio;
