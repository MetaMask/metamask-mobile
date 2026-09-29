import React, { useCallback } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
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
import type { PredictThePitchPositionDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { PredictEventValues } from '../../../Predict/constants/eventNames';
import { usePredictNavigation } from '../../../Predict/hooks/usePredictNavigation';
import type { PredictMarketDetailsParams } from '../../../Predict/types/navigation';
import { formatPercentage, formatPrice } from '../../../Predict/utils/format';
import { strings } from '../../../../../../locales/i18n';

dayjs.extend(relativeTime);

export const PREDICT_THE_PITCH_POSITION_ROW_TEST_ID =
  'predict-the-pitch-portfolio-row';

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

/** Relative exit time for manually closed (sold) positions — not market settlement. */
const formatSoldAt = (dateString: string): string =>
  strings('rewards.predict_the_pitch_campaign.position_sold_at', {
    time: dayjs(dateString).fromNow(),
  });

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

const PredictThePitchPositionRowShell: React.FC<{
  position: PredictThePitchPositionDto;
  index: number;
  children: React.ReactNode;
}> = ({ position, index, children }) => {
  const { navigateToMarketDetails } = usePredictNavigation();

  const handlePress = useCallback(() => {
    if (!position.eventId) {
      return;
    }

    navigateToMarketDetails(
      {
        marketId: position.eventId,
        entryPoint: PredictEventValues.ENTRY_POINT.REWARDS as NonNullable<
          PredictMarketDetailsParams['entryPoint']
        >,
        title: position.conditionName,
        ...(position.iconUrl ? { image: position.iconUrl } : {}),
      },
      { throughRoot: true },
    );
  }, [navigateToMarketDetails, position]);

  return (
    <Pressable
      style={styles.positionContainer}
      testID={`${PREDICT_THE_PITCH_POSITION_ROW_TEST_ID}-${index}`}
      onPress={handlePress}
      disabled={!position.eventId}
      accessibilityRole="button"
    >
      {children}
    </Pressable>
  );
};

/**
 * Active holdings — mirrors `PredictPosition`: live value + % PnL, shares in subtitle.
 */
export const PredictThePitchOpenPositionRow: React.FC<{
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
    <PredictThePitchPositionRowShell position={position} index={index}>
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
    </PredictThePitchPositionRowShell>
  );
};

/**
 * Market-settled positions — mirrors `PredictPositionResolved`: Won/Lost copy and
 * an "ended …" subtitle keyed off market resolution (not an early exit).
 */
export const PredictThePitchResolvedPositionRow: React.FC<{
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
    <PredictThePitchPositionRowShell position={position} index={index}>
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
    </PredictThePitchPositionRowShell>
  );
};

/**
 * Early exit before settlement (`status: 'sold'`). Native Predict has no list-row
 * analog — closed positions live in activity/history. Use the open row's realized
 * value + % PnL column (`PredictPosition`), but avoid settlement Won/Lost copy and
 * the "to win N shares" subtitle when fillShares is zero.
 */
export const PredictThePitchSoldPositionRow: React.FC<{
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
  })} • ${formatSoldAt(position.fillDate)}`;

  return (
    <PredictThePitchPositionRowShell position={position} index={index}>
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
    </PredictThePitchPositionRowShell>
  );
};
