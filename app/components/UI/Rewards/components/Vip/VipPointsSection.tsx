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
import { strings } from '../../../../../../locales/i18n';
import { formatCompactValue, formatNumber } from '../../utils/formatUtils';
import type {
  VipPointsAllocationDto,
  VipTierDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { VIP_GOLD_TEXT_DEFAULT } from './Vip.constants';

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
  description: string;
  // Optional: when the user has qualified (currentTier.equityRebateBps > 0),
  // the section pivots to show their active equity rebate % and progress to
  // the next equity tier (per G7 plan). Pre-qualification behaviour is
  // unchanged when these are omitted or when equityRebateBps === 0.
  currentTier?: VipTierDto;
  nextTier?: VipTierDto;
}

const RADIAL_SIZE = 96;
const STROKE_WIDTH = 8;
const RADIUS = (RADIAL_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const clampPercent = (value: number): number =>
  Math.max(0, Math.min(100, value));

const VipPointsSection: React.FC<VipPointsSectionProps> = ({
  pointsAllocation,
  title,
  subtitle,
  description,
  currentTier,
  nextTier,
}) => {
  const tw = useTailwind();
  const trackColor = tw.color('background-muted') ?? 'transparent';
  const fillColor = VIP_GOLD_TEXT_DEFAULT ?? 'transparent';

  // Branch on whether the user has crossed the equity-qualification gate.
  // The pre-qualification path keeps the original (subtitle / description)
  // copy + cumulative-points ring so every existing test stays valid.
  const isQualified = Boolean(currentTier && currentTier.equityRebateBps > 0);
  const isTopTier = Boolean(
    isQualified &&
      currentTier &&
      nextTier &&
      currentTier.tier === nextTier.tier,
  );

  // Header copy: qualified users see their active rebate %; everyone else
  // gets the section title we were already passing in.
  const headerText =
    isQualified && currentTier
      ? strings('rewards.vip.equity_rebate_header', {
          value: formatNumber(currentTier.equityRebateBps / 100, 2),
        })
      : title;

  // Sub-copy: qualified-but-not-top → "↑ X% at next tier"; top tier → terminal
  // string; pre-qual → existing subtitle/description block.
  const qualifiedSubCopy =
    isQualified && nextTier && !isTopTier
      ? strings('rewards.vip.equity_rebate_next_tier', {
          value: formatNumber(nextTier.equityRebateBps / 100, 2),
        })
      : isTopTier
        ? strings('rewards.vip.equity_rebate_top_tier')
        : null;

  // Ring math: pre-qual uses cumulative / 100M (pointsAllocation.percent);
  // qualified+more-to-go uses rolling 30d earned / next tier's points req;
  // top tier fills the ring completely.
  const filledPercent = (() => {
    if (!isQualified) return clampPercent(pointsAllocation.percent);
    if (isTopTier) return 100;
    if (nextTier && nextTier.pointsRequirement > 0) {
      return clampPercent(
        (pointsAllocation.earned / nextTier.pointsRequirement) * 100,
      );
    }
    return 0;
  })();
  const dashOffset = CIRCUMFERENCE * (1 - filledPercent / 100);

  // Ring label: pre-qual = "earned / max" (100M); qualified = "earned / next
  // tier requirement"; top tier = "earned" only (no denominator).
  const labelEarned = pointsAllocation.earned;
  const labelMax =
    isQualified && !isTopTier && nextTier
      ? nextTier.pointsRequirement
      : pointsAllocation.max;
  const showLabelMax = !isTopTier;

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
        {headerText}
      </Text>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-3"
      >
        <Box twClassName="flex-1">
          {qualifiedSubCopy !== null ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {qualifiedSubCopy}
            </Text>
          ) : (
            <>
              <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
                {subtitle}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {description}
              </Text>
            </>
          )}
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
              {formatCompactValue(labelEarned)}
            </Text>
            {showLabelMax ? (
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
              >
                {`/${formatCompactValue(labelMax)}`}
              </Text>
            ) : null}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default VipPointsSection;
