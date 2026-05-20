import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { formatCompactUsd } from '../../utils/formatUtils';
import type { VipPointsAllocationDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

export const VIP_POINTS_SECTION_TEST_IDS = {
  CONTAINER: 'vip-points-section',
  TITLE: 'vip-points-section-title',
  RADIAL: 'vip-points-section-radial',
  RADIAL_LABEL: 'vip-points-section-radial-label',
} as const;

interface VipPointsSectionProps {
  pointsAllocation: VipPointsAllocationDto;
  title: string;
  subtitle: string;
}

const RADIAL_SIZE = 96;
const STROKE_WIDTH = 8;
const RADIUS = (RADIAL_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const clampPercent = (value: number): number =>
  Math.max(0, Math.min(100, value));

const formatPointsCompact = (value: number): string =>
  formatCompactUsd(value).replace(/^\$/, '');

const VipPointsSection: React.FC<VipPointsSectionProps> = ({
  pointsAllocation,
  title,
  subtitle,
}) => {
  const tw = useTailwind();
  const filledPercent = clampPercent(pointsAllocation.percent);
  const dashOffset = CIRCUMFERENCE * (1 - filledPercent / 100);
  const trackColor = tw.color('background-muted') ?? 'transparent';
  const fillColor = tw.color('success-default') ?? 'transparent';

  return (
    <Box twClassName="gap-3" testID={VIP_POINTS_SECTION_TEST_IDS.CONTAINER}>
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
        <Box twClassName="flex-1 gap-1">
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {subtitle}
          </Text>
        </Box>
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          style={{ width: RADIAL_SIZE, height: RADIAL_SIZE }}
          testID={VIP_POINTS_SECTION_TEST_IDS.RADIAL}
        >
          <Svg
            width={RADIAL_SIZE}
            height={RADIAL_SIZE}
            viewBox={`0 0 ${RADIAL_SIZE} ${RADIAL_SIZE}`}
          >
            <Circle
              cx={RADIAL_SIZE / 2}
              cy={RADIAL_SIZE / 2}
              r={RADIUS}
              stroke={trackColor}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            <Circle
              cx={RADIAL_SIZE / 2}
              cy={RADIAL_SIZE / 2}
              r={RADIUS}
              stroke={fillColor}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${RADIAL_SIZE / 2} ${RADIAL_SIZE / 2})`}
            />
          </Svg>
          <Box
            twClassName="absolute"
            alignItems={BoxAlignItems.Center}
            testID={VIP_POINTS_SECTION_TEST_IDS.RADIAL_LABEL}
          >
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
              {formatPointsCompact(pointsAllocation.earned)}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {`/${formatPointsCompact(pointsAllocation.max)}`}
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default VipPointsSection;
