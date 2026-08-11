import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useVipEquityMultiplier } from '../../hooks/useVipEquityMultiplier';
import { formatCompactUsd } from '../../utils/formatUtils';
import RewardsErrorBanner from '../RewardsErrorBanner';
import VipCircularProgress from './VipCircularProgress';

export const VIP_EQUITY_MULTIPLIER_SECTION_TEST_IDS = {
  CONTAINER: 'vip-equity-multiplier-section',
  TITLE: 'vip-equity-multiplier-title',
  RADIAL: 'vip-equity-multiplier-radial',
  RADIAL_PROGRESS: 'vip-equity-multiplier-radial-progress',
  RADIAL_LABEL: 'vip-equity-multiplier-radial-label',
  SKELETON: 'vip-equity-multiplier-skeleton',
  ERROR: 'vip-equity-multiplier-error',
} as const;

const parseUsdOrZero = (value: string | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

interface VipEquityMultiplierSectionProps {
  /**
   * Failure copy from the VIP dashboard payload. The multiplier request cannot
   * supply copy for its own failure, and the dashboard succeeded independently.
   */
  failedTitle: string;
  failedDescription: string;
}

/**
 * Display-only equity multiplier section. Server owns eligibility, formula,
 * and copy. Never derives unlock from pointsAllocation / isEquityUnlocked.
 * `localizedText` arrives resolved for the current state, so it is rendered
 * flat — branching on `state` here would mean a release for any new state.
 *
 * Renders four ways. `hidden` — not enrolled, VIP off, or no band configured;
 * nothing is drawn. `loading` — a skeleton keeps the block's height stable
 * rather than shifting the page when the estimate lands. `error` — shown
 * explicitly so a transient failure is distinguishable from "you do not
 * qualify". `ready` — server copy plus the holdings radial.
 */
const VipEquityMultiplierSection: React.FC<VipEquityMultiplierSectionProps> = ({
  failedTitle,
  failedDescription,
}) => {
  const tw = useTailwind();
  const { status, data, holdingsUsd, retry } = useVipEquityMultiplier();

  if (status === 'hidden') {
    return null;
  }

  if (status === 'loading') {
    return (
      <Box
        twClassName="gap-3 px-4"
        testID={VIP_EQUITY_MULTIPLIER_SECTION_TEST_IDS.SKELETON}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-3"
        >
          <Box twClassName="flex-1 gap-1">
            <Skeleton style={tw.style('h-4 w-2/5 rounded-lg')} />
            <Skeleton style={tw.style('h-4 w-full rounded-lg')} />
            <Skeleton style={tw.style('h-4 w-3/4 rounded-lg')} />
          </Box>
          <Skeleton style={tw.style('h-24 w-24 rounded-full')} />
        </Box>
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box twClassName="px-4">
        <RewardsErrorBanner
          title={failedTitle}
          description={failedDescription}
          onConfirm={retry}
          confirmButtonLabel={strings('rewards.vip.retry_button')}
          testID={VIP_EQUITY_MULTIPLIER_SECTION_TEST_IDS.ERROR}
        />
      </Box>
    );
  }

  if (!data) {
    return null;
  }

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
            {data.localizedText.description}
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
