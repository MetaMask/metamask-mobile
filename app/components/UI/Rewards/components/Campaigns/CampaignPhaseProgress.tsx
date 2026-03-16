import React, { useMemo } from 'react';
import ProgressBar from 'react-native-progress/Bar';
import {
  Box,
  BoxFlexDirection,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';
import type {
  CampaignDto,
  OndoCampaignPhase,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';

export const CAMPAIGN_PHASE_PROGRESS_TEST_IDS = {
  CONTAINER: 'campaign-phase-progress-container',
  PHASE_NAME: 'campaign-phase-progress-name',
  PHASE_BAR: 'campaign-phase-progress-bar',
  PHASE_LABEL: 'campaign-phase-progress-label',
} as const;

interface PhaseProgress {
  phase: OndoCampaignPhase;
  isActive: boolean;
  isPast: boolean;
  progress: number;
  label: string;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function computePhaseProgressList(
  campaign: CampaignDto,
): PhaseProgress[] | null {
  const phases = campaign.details?.howItWorks?.phases;
  if (!phases || phases.length === 0) return null;

  const sortedPhases = [...phases].sort((a, b) => a.sortOrder - b.sortOrder);
  const numPhases = sortedPhases.length;
  const campaignStart = new Date(campaign.startDate).getTime();
  const campaignEnd = new Date(campaign.endDate).getTime();
  const totalMs = campaignEnd - campaignStart;
  if (totalMs <= 0) return null;

  const phaseDurationMs = totalMs / numPhases;
  const phaseDurationDays = Math.round(phaseDurationMs / MS_PER_DAY);
  const now = Date.now();

  return sortedPhases.map((phase, index) => {
    const phaseStartMs = campaignStart + index * phaseDurationMs;
    const phaseEndMs = phaseStartMs + phaseDurationMs;
    const isActive = now >= phaseStartMs && now < phaseEndMs;
    const isPast = now >= phaseEndMs;

    let progress = 0;
    if (isPast) {
      progress = 1;
    } else if (isActive) {
      progress = (now - phaseStartMs) / phaseDurationMs;
    }

    let label = '';
    if (isActive) {
      const daysLeft = Math.ceil((phaseEndMs - now) / MS_PER_DAY);
      label = strings('rewards.campaign.days_left', { count: daysLeft });
    } else if (!isPast) {
      const startDay = index * phaseDurationDays + 1;
      label = strings('rewards.campaign.starts_day', { day: startDay });
    }

    return { phase, isActive, isPast, progress, label };
  });
}

interface CampaignPhaseProgressProps {
  campaign: CampaignDto;
}

const CampaignPhaseProgress: React.FC<CampaignPhaseProgressProps> = ({
  campaign,
}) => {
  const theme = useTheme();
  const phaseList = useMemo(
    () => computePhaseProgressList(campaign),
    [campaign],
  );

  if (!phaseList) return null;

  return (
    <Box
      twClassName="gap-2 pt-2"
      testID={CAMPAIGN_PHASE_PROGRESS_TEST_IDS.CONTAINER}
    >
      {/* Phase name row */}
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2">
        {phaseList.map((item, index) => (
          <Box key={item.phase.sortOrder} twClassName="flex-1">
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={
                item.isActive || item.isPast
                  ? TextColor.SuccessDefault
                  : undefined
              }
              twClassName={
                [
                  index > 0 ? 'text-right' : '',
                  item.isActive || item.isPast ? '' : 'text-alternative',
                ]
                  .filter(Boolean)
                  .join(' ') || undefined
              }
              testID={`${CAMPAIGN_PHASE_PROGRESS_TEST_IDS.PHASE_NAME}-${index}`}
            >
              {item.phase.name}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Progress bars row */}
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2">
        {phaseList.map((item, index) => (
          <Box
            key={item.phase.sortOrder}
            twClassName="flex-1"
            testID={`${CAMPAIGN_PHASE_PROGRESS_TEST_IDS.PHASE_BAR}-${index}`}
          >
            <ProgressBar
              progress={item.progress}
              width={null as unknown as number}
              color={theme.colors.success.default}
              height={6}
              borderRadius={3}
              borderWidth={0}
              unfilledColor={theme.colors.border.muted}
            />
          </Box>
        ))}
      </Box>

      {/* Phase label row */}
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2">
        {phaseList.map((item, index) => (
          <Box key={item.phase.sortOrder} twClassName="flex-1">
            {item.label ? (
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={item.isActive ? TextColor.SuccessDefault : undefined}
                twClassName={
                  [
                    index > 0 ? 'text-right' : '',
                    item.isActive ? '' : 'text-alternative',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
                testID={`${CAMPAIGN_PHASE_PROGRESS_TEST_IDS.PHASE_LABEL}-${index}`}
              >
                {item.label}
              </Text>
            ) : null}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default CampaignPhaseProgress;
