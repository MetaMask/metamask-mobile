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
import { useVipEquityMultiplier } from '../../hooks/useVipEquityMultiplier';
import { formatCompactUsd } from '../../utils/formatUtils';
import VipCircularProgress from './VipCircularProgress';

export const VIP_EQUITY_MULTIPLIER_SECTION_TEST_IDS = {
  CONTAINER: 'vip-equity-multiplier-section',
  TITLE: 'vip-equity-multiplier-title',
  RADIAL: 'vip-equity-multiplier-radial',
  RADIAL_PROGRESS: 'vip-equity-multiplier-radial-progress',
  RADIAL_LABEL: 'vip-equity-multiplier-radial-label',
} as const;

const parseUsdOrZero = (value: string | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Display-only equity multiplier section. Server owns eligibility, formula,
 * and copy. Never derives unlock from pointsAllocation / isEquityUnlocked.
 */
const VipEquityMultiplierSection: React.FC = () => {
  const { shouldRender, data, holdingsUsd } = useVipEquityMultiplier();

  if (!shouldRender || !data) {
    return null;
  }

  const description = data.eligible
    ? data.localizedText.eligibleDescription
    : data.localizedText.ineligibleDescription;

  const holdingsValue = parseUsdOrZero(holdingsUsd);
  const capValue = parseUsdOrZero(data.capUsd);

  return (
    <Box
      twClassName="gap-3 px-4"
      testID={VIP_EQUITY_MULTIPLIER_SECTION_TEST_IDS.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-3"
      >
        <Box twClassName="flex-1">
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            testID={VIP_EQUITY_MULTIPLIER_SECTION_TEST_IDS.TITLE}
          >
            {data.localizedText.title}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {description}
          </Text>
        </Box>
        <VipCircularProgress
          percent={data.progressPercent}
          testID={VIP_EQUITY_MULTIPLIER_SECTION_TEST_IDS.RADIAL}
          progressTestID={
            VIP_EQUITY_MULTIPLIER_SECTION_TEST_IDS.RADIAL_PROGRESS
          }
          labelTestID={VIP_EQUITY_MULTIPLIER_SECTION_TEST_IDS.RADIAL_LABEL}
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
            {formatCompactUsd(holdingsValue, { maximumFractionDigits: 2 })}
          </Text>
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            {`/${formatCompactUsd(capValue, { maximumFractionDigits: 2 })}`}
          </Text>
        </VipCircularProgress>
      </Box>
    </Box>
  );
};

export default VipEquityMultiplierSection;
