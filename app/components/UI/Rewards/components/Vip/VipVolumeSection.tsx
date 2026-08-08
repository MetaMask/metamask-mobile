import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconColor,
  IconName,
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
  SWAPS_INFO: 'vip-volume-section-swaps-info',
  PERPS: 'vip-volume-section-perps',
} as const;

interface VipVolumeSectionLabels {
  points: string;
  swapsVolume: string;
  pointsFromReferrals: string;
  perpsVolume: string;
  vipReferrals: string;
}

interface VipVolumeSectionProps {
  volume: VipVolumeDto;
  title: string;
  period: string;
  labels: VipVolumeSectionLabels;
  /**
   * Optional callback fired when the swaps-volume help icon is pressed.
   * When provided, an info icon is rendered next to the swaps-volume label.
   */
  onSwapsVolumeInfoPress?: () => void;
}

const VipVolumeSection: React.FC<VipVolumeSectionProps> = ({
  volume,
  title,
  period,
  labels,
  onSwapsVolumeInfoPress,
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
          {labels.points}
        </Text>
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {formatNumber(volume.points)}
        </Text>
      </Box>
      <Box twClassName="flex-1" testID={VIP_VOLUME_SECTION_TEST_IDS.SWAPS}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-1"
        >
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {labels.swapsVolume}
          </Text>
          {onSwapsVolumeInfoPress ? (
            <ButtonIcon
              iconName={IconName.Info}
              iconProps={{ color: IconColor.IconAlternative }}
              size={ButtonIconSize.Sm}
              onPress={onSwapsVolumeInfoPress}
              accessibilityLabel={strings(
                'rewards.vip.swaps_volume_info_label',
              )}
              testID={VIP_VOLUME_SECTION_TEST_IDS.SWAPS_INFO}
            />
          ) : null}
        </Box>
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
          {labels.pointsFromReferrals}
        </Text>
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {formatNumber(volume.pointsFromReferrals)}
        </Text>
      </Box>

      <Box twClassName="flex-1" testID={VIP_VOLUME_SECTION_TEST_IDS.PERPS}>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {labels.perpsVolume}
        </Text>
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {formatUsd(volume.perpsUsd)}
        </Text>
      </Box>
    </Box>
    <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-6 mt-1">
      <Box twClassName="flex-1" testID={VIP_VOLUME_SECTION_TEST_IDS.REFERRALS}>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {labels.vipReferrals}
        </Text>
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {volume.referrals}/{volume.referralsCap}
        </Text>
      </Box>
    </Box>
  </Box>
);

export default VipVolumeSection;
