import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { formatCompactValue } from '../../utils/formatUtils';
import type { VipEquityAllocation } from '../../../../../core/Engine/controllers/rewards-controller/types';
import VipCircularProgress from './VipCircularProgress';

export const VIP_POINTS_SECTION_TEST_IDS = {
  CONTAINER: 'vip-points-section',
  TITLE: 'vip-points-section-title',
  RADIAL: 'vip-points-section-radial',
  RADIAL_PROGRESS: 'vip-points-section-radial-progress',
  RADIAL_LABEL: 'vip-points-section-radial-label',
  LIFETIME_POINTS: 'vip-points-section-lifetime-points',
} as const;

/** Replaced client-side with the formatted lifetime figure — the server owns
 * the copy, the client owns number formatting for this card. */
const POINTS_PLACEHOLDER = '{points}';

interface VipPointsSectionProps {
  pointsAllocation: VipEquityAllocation;
  title: string;
  equityLockedTitle: string;
  equityLockedDescription: string;
  equityUnlockedTitle: string;
  equityUnlockedDescription: string;
  equityLifetimePointsDescription: string;
}

const VipPointsSection: React.FC<VipPointsSectionProps> = ({
  pointsAllocation,
  title,
  equityLockedTitle,
  equityLockedDescription,
  equityUnlockedTitle,
  equityUnlockedDescription,
  equityLifetimePointsDescription,
}) => {
  const isEquityUnlocked =
    pointsAllocation.earned >= pointsAllocation.threshold;
  const subtitle = isEquityUnlocked ? equityUnlockedTitle : equityLockedTitle;

  // Only meaningful once equity is unlocked, and only worth showing when the
  // VIP has actually accrued something — a "lifetime total of 0" would read as
  // a bug rather than as reassurance.
  const lifetimeQualifyingPoints = pointsAllocation.lifetimeQualifyingPoints;
  const lifetimePointsText =
    isEquityUnlocked &&
    lifetimeQualifyingPoints !== null &&
    lifetimeQualifyingPoints > 0
      ? equityLifetimePointsDescription
          .split(POINTS_PLACEHOLDER)
          .join(formatCompactValue(lifetimeQualifyingPoints))
      : null;

  const description = isEquityUnlocked
    ? lifetimePointsText
      ? `${equityUnlockedDescription} ${lifetimePointsText}`
      : equityUnlockedDescription
    : equityLockedDescription;

  return (
    <Box
      twClassName="gap-3 px-4"
      testID={VIP_POINTS_SECTION_TEST_IDS.CONTAINER}
    >
      <Text
        variant={TextVariant.HeadingMd}
        fontWeight={FontWeight.Bold}
        testID={VIP_POINTS_SECTION_TEST_IDS.TITLE}
      >
        {title}
      </Text>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-3"
      >
        <Box twClassName="flex-1">
          <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
            {subtitle}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={
              lifetimePointsText
                ? VIP_POINTS_SECTION_TEST_IDS.LIFETIME_POINTS
                : undefined
            }
          >
            {description}
          </Text>
        </Box>
        <VipCircularProgress
          percent={pointsAllocation.percent}
          testID={VIP_POINTS_SECTION_TEST_IDS.RADIAL}
          progressTestID={VIP_POINTS_SECTION_TEST_IDS.RADIAL_PROGRESS}
          labelTestID={VIP_POINTS_SECTION_TEST_IDS.RADIAL_LABEL}
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
            {formatCompactValue(pointsAllocation.earned)}
          </Text>
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            {`/${formatCompactValue(pointsAllocation.threshold)}`}
          </Text>
        </VipCircularProgress>
      </Box>
    </Box>
  );
};

export default VipPointsSection;
