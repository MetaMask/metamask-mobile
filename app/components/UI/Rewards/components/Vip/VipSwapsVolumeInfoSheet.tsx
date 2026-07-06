import React from 'react';
import {
  BottomSheet,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
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
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';

export const VIP_SWAPS_VOLUME_INFO_SHEET_TEST_IDS = {
  SHEET: 'vip-swaps-volume-info-sheet',
  CLOSE: 'vip-swaps-volume-info-sheet-close',
} as const;

interface VipSwapsVolumeInfoSheetProps {
  onClose: () => void;
}

const VipSwapsVolumeInfoSheet: React.FC<VipSwapsVolumeInfoSheetProps> = ({
  onClose,
}) => {
  const surfaceClass = useElevatedSurface();

  return (
    <BottomSheet
      onClose={onClose}
      twClassName={surfaceClass}
      testID={VIP_SWAPS_VOLUME_INFO_SHEET_TEST_IDS.SHEET}
    >
      <Box twClassName="px-4 pb-4">
        {/* Header row: spacer + close button */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.End}
          twClassName="mb-4"
        >
          <ButtonIcon
            iconName={IconName.Close}
            iconProps={{ color: IconColor.IconDefault }}
            onPress={onClose}
            testID={VIP_SWAPS_VOLUME_INFO_SHEET_TEST_IDS.CLOSE}
          />
        </Box>

        {/* Info icon */}
        <Box alignItems={BoxAlignItems.Center} twClassName="mb-4">
          <Icon
            name={IconName.Info}
            size={IconSize.Xl}
            color={IconColor.IconAlternative}
          />
        </Box>

        <Box twClassName="gap-2">
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            twClassName="text-center"
          >
            {strings('rewards.vip.swaps_volume_info_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('rewards.vip.swaps_volume_info_description')}
          </Text>
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default VipSwapsVolumeInfoSheet;
