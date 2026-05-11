import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import { formatUsd } from '../../utils/formatUtils';
import type {
  VipPeriodDto,
  VipVolumeDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';

export const VIP_VOLUME_SECTION_TEST_IDS = {
  CONTAINER: 'vip-volume-section',
  PERIOD: 'vip-volume-section-period',
  SWAPS: 'vip-volume-section-swaps',
  PERPS: 'vip-volume-section-perps',
  ON_TRACK: 'vip-volume-section-on-track',
} as const;

interface VipVolumeSectionProps {
  period: VipPeriodDto;
  volume: VipVolumeDto;
  daysToNextTier: number;
  titleOverride?: string;
  periodOverride?: string;
  statusOverride?: string;
}

const formatMonthDay = (iso: string, locale: string): string => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
};

const formatPeriod = (period: VipPeriodDto): string => {
  const locale = I18n.locale ?? 'en-US';
  return `${formatMonthDay(period.start, locale)} - ${formatMonthDay(
    period.end,
    locale,
  )}`;
};

const VipVolumeSection: React.FC<VipVolumeSectionProps> = ({
  period,
  volume,
  daysToNextTier,
  titleOverride,
  periodOverride,
  statusOverride,
}) => (
  <Box
    twClassName="bg-section rounded-2xl p-4 gap-3"
    testID={VIP_VOLUME_SECTION_TEST_IDS.CONTAINER}
  >
    <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
      {titleOverride ?? strings('rewards.vip.volume_section_title')}
    </Text>
    <Text
      variant={TextVariant.BodySm}
      color={TextColor.TextAlternative}
      testID={VIP_VOLUME_SECTION_TEST_IDS.PERIOD}
    >
      {periodOverride ?? formatPeriod(period)}
    </Text>

    <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-6 mt-1">
      <Box twClassName="flex-1" testID={VIP_VOLUME_SECTION_TEST_IDS.SWAPS}>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('rewards.vip.swaps_label')}
        </Text>
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {formatUsd(volume.swapsUsd)}
        </Text>
      </Box>
      <Box twClassName="flex-1" testID={VIP_VOLUME_SECTION_TEST_IDS.PERPS}>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('rewards.vip.perps_label')}
        </Text>
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {formatUsd(volume.perpsUsd)}
        </Text>
      </Box>
    </Box>

    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-2 mt-1"
      testID={VIP_VOLUME_SECTION_TEST_IDS.ON_TRACK}
    >
      <Icon
        name={IconName.TrendUp}
        size={IconSize.Sm}
        color={IconColor.SuccessDefault}
      />
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {statusOverride ??
          strings('rewards.vip.on_track_days', { count: daysToNextTier })}
      </Text>
    </Box>
  </Box>
);

export default VipVolumeSection;
