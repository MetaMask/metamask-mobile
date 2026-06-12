import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import type {
  PredictThePitchPositionDto,
  PredictThePitchPositionsDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { formatPercentage, formatPrice } from '../../../Predict/utils/format';
import { strings } from '../../../../../../locales/i18n';
import RewardsErrorBanner from '../RewardsErrorBanner';
import RewardsInfoBanner from '../RewardsInfoBanner';

dayjs.extend(relativeTime);

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

const styles = StyleSheet.create({
  positionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 16,
    width: '100%',
  },
  positionImageContainer: {
    paddingTop: 4,
  },
  positionImage: {
    width: 40,
    height: 40,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  positionDetails: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    flex: 1,
    minWidth: 0,
  },
  positionPnl: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    flexShrink: 0,
  },
});

const formatMarketEndDate = (dateString: string): string => {
  const date = dayjs(dateString);
  const now = dayjs();

  if (date.isAfter(now)) {
    return strings('predict.market_details.resolved_early');
  }

  return `${strings('predict.market_details.ended')} ${date.fromNow()}`;
};

const PredictThePitchPositionIcon: React.FC<{
  iconUrl: string | null;
}> = ({ iconUrl }) => {
  const tw = useTailwind();

  if (iconUrl) {
    return (
      <View style={styles.positionImageContainer}>
        <Image source={{ uri: iconUrl }} style={styles.positionImage} />
      </View>
    );
  }

  return (
    <View style={styles.positionImageContainer}>
      <Box
        twClassName="h-10 w-10 rounded-full bg-muted"
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        style={tw.style('self-start')}
      >
        <Icon
          name={IconName.Chart}
          size={IconSize.Md}
          color={IconColor.IconDefault}
        />
      </Box>
    </View>
  );
};

const PredictThePitchOpenPositionRow: React.FC<{
  position: PredictThePitchPositionDto;
  index: number;
}> = ({ position, index }) => {
  const tw = useTailwind();
  const currentValue = position.capitalDeployed + position.pnl;
  const percentPnl = position.roi * 100;
  const positionInfo = strings('predict.position_info', {
    initialValue: formatPrice(position.capitalDeployed, {
      maximumDecimals: 2,
    }),
    outcome: position.outcomeAsset ?? '-',
    shares: formatPrice(position.fillShares, {
      maximumDecimals: 2,
    }),
  });

  return (
    <View
      style={styles.positionContainer}
      testID={`${PREDICT_THE_PITCH_PORTFOLIO_TEST_IDS.ROW}-${index}`}
    >
      <PredictThePitchPositionIcon iconUrl={position.iconUrl} />
      <View style={styles.positionDetails}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Medium}
          style={tw.style('font-medium')}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {position.conditionName}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {positionInfo}
        </Text>
      </View>
      <View style={styles.positionPnl}>
        <Text variant={TextVariant.BodyMd} numberOfLines={1}>
          {formatPrice(currentValue, { maximumDecimals: 2 })}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={
            percentPnl >= 0 ? TextColor.SuccessDefault : TextColor.ErrorDefault
          }
          numberOfLines={1}
        >
          {formatPercentage(percentPnl)}
        </Text>
      </View>
    </View>
  );
};

const PredictThePitchResolvedPositionRow: React.FC<{
  position: PredictThePitchPositionDto;
  index: number;
}> = ({ position, index }) => {
  const tw = useTailwind();
  const currentValue = position.capitalDeployed + position.pnl;
  const percentPnl = position.roi * 100;
  const subtitle = `${strings('predict.market_details.amount_on_outcome', {
    amount: formatPrice(position.capitalDeployed, {
      maximumDecimals: 2,
    }),
    outcome: position.outcomeAsset ?? '-',
  })} • ${formatMarketEndDate(position.fillDate)}`;

  return (
    <View
      style={styles.positionContainer}
      testID={`${PREDICT_THE_PITCH_PORTFOLIO_TEST_IDS.ROW}-${index}`}
    >
      <PredictThePitchPositionIcon iconUrl={position.iconUrl} />
      <View style={styles.positionDetails}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Medium}
          style={tw.style('font-medium')}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {position.conditionName}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {subtitle}
        </Text>
      </View>
      <View style={styles.positionPnl}>
        {percentPnl > 0 ? (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.SuccessDefault}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {strings('predict.market_details.won')}{' '}
            {formatPrice(currentValue, { maximumDecimals: 2 })}
          </Text>
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.ErrorDefault}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {strings('predict.market_details.lost')}{' '}
            {formatPrice(position.capitalDeployed - currentValue, {
              maximumDecimals: 2,
            })}
          </Text>
        )}
      </View>
    </View>
  );
};

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

const PredictThePitchPortfolio: React.FC<PredictThePitchPortfolioProps> = ({
  positions,
  isLoading,
  hasError,
  refetch,
  maxEntries,
}) => {
  const entries = useMemo(() => {
    const allPositions = positions?.positions ?? [];
    return maxEntries ? allPositions.slice(0, maxEntries) : allPositions;
  }, [positions, maxEntries]);

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
    <Box testID={PREDICT_THE_PITCH_PORTFOLIO_TEST_IDS.CONTAINER}>
      {entries.map((position, index) =>
        position.status === 'resolved' ? (
          <PredictThePitchResolvedPositionRow
            key={`${position.outcomeAssetId}-${index}`}
            position={position}
            index={index}
          />
        ) : (
          <PredictThePitchOpenPositionRow
            key={`${position.outcomeAssetId}-${index}`}
            position={position}
            index={index}
          />
        ),
      )}
    </Box>
  );
};

export default PredictThePitchPortfolio;
