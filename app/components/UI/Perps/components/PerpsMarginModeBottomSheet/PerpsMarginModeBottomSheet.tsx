import React, { useRef } from 'react';
import { TouchableOpacity, View } from 'react-native';
import BottomSheet, {
  type BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import {
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

interface PerpsMarginModeBottomSheetProps {
  onClose: () => void;
}

const PerpsMarginModeBottomSheet: React.FC<PerpsMarginModeBottomSheetProps> = ({
  onClose,
}) => {
  const sheetRef = useRef<BottomSheetRef>(null);

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack={false} onClose={onClose}>
      <BottomSheetHeader onClose={onClose}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('perps.margin_mode.title')}
        </Text>
      </BottomSheetHeader>
      <Box twClassName="pb-2">
        {/* Isolated — selected */}
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Box twClassName="flex-row items-start gap-4 px-4 py-4">
            <Box twClassName="flex-1">
              <Text variant={TextVariant.BodyMdMedium}>
                {strings('perps.margin_mode.isolated_title')}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                twClassName="mt-1"
              >
                {strings('perps.margin_mode.isolated_description')}
              </Text>
            </Box>
            {/* eslint-disable-next-line react-native/no-inline-styles */}
            <View style={{ width: 40, alignItems: 'center', paddingTop: 2 }}>
              <Icon
                name={IconName.Check}
                color={IconColor.Default}
                size={IconSize.Sm}
              />
            </View>
          </Box>
        </TouchableOpacity>
        {/* Cross — disabled, coming soon */}
        <Box twClassName="flex-row items-start gap-4 px-4 py-4 opacity-40">
          <Box twClassName="flex-1">
            <Text
              variant={TextVariant.BodyMdMedium}
              color={TextColor.TextMuted}
            >
              {strings('perps.margin_mode.cross_title')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextMuted}
              twClassName="mt-1"
            >
              {strings('perps.margin_mode.cross_description')}
            </Text>
          </Box>
        </Box>
      </Box>
    </BottomSheet>
  );
};

PerpsMarginModeBottomSheet.displayName = 'PerpsMarginModeBottomSheet';

export default PerpsMarginModeBottomSheet;
