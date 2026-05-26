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
import { strings } from '../../../../../../locales/i18n';
import { formatNumber, formatUsd } from '../../utils/formatUtils';
import type { VipVolumeDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

export const VIP_VOLUME_SECTION_TEST_IDS = {
  CONTAINER: 'vip-volume-section',
  PERIOD: 'vip-volume-section-period',
  POINTS: 'vip-volume-section-points',
  POINTS_FROM_REFERRALS: 'vip-volume-section-points-from-referrals',
  REFERRALS: 'vip-volume-section-referrals',
  REFERRALS_CAP: 'vip-volume-section-referrals-cap',
  SWAPS: 'vip-volume-section-swaps',
  PERPS: 'vip-volume-section-perps',
  ON_TRACK: 'vip-volume-section-on-track',
} as const;

interface VipVolumeSectionProps {
  volume: VipVolumeDto;
  title: string;
  period: string;
}

const VipVolumeSection: React.FC<VipVolumeSectionProps> = ({
  volume,
  title,
  period,
}) => (
  <Box twClassName="gap-3 px-4" testID={VIP_VOLUME_SECTION_TEST_IDS.CONTAINER}>
    <Box twClassName="gap-1">
      <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
        {title}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        testID={VIP_VOLUME_SECTION_TEST_IDS.PERIOD}
      >
        {period}
      </Text>
    </Box>

    <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-6 mt-1">
      <Box twClassName="flex-1" testID={VIP_VOLUME_SECTION_TEST_IDS.POINTS}>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('rewards.vip.points_label')}
        </Text>
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {formatNumber(volume.points)}
        </Text>
      </Box>
      <Box twClassName="flex-1" testID={VIP_VOLUME_SECTION_TEST_IDS.SWAPS}>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('rewards.vip.swaps_label')}
        </Text>
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {formatUsd(volume.swapsUsd)}
        </Text>
      </Box>
    </Box>

    <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-6 mt-1">
      <Box
        twClassName="flex-1"
        testID={VIP_VOLUME_SECTION_TEST_IDS.POINTS_FROM_REFERRALS}
      >
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('rewards.vip.points_from_referrals_label')}
        </Text>
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {formatNumber(volume.pointsFromReferrals)}
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
    <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-6 mt-1">
      <Box twClassName="flex-1" testID={VIP_VOLUME_SECTION_TEST_IDS.REFERRALS}>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('rewards.vip.referrals_label')}
        </Text>
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {volume.referrals}/{volume.referralsCap}
        </Text>
      </Box>
    </Box>
  </Box>
);

export default VipVolumeSection;
