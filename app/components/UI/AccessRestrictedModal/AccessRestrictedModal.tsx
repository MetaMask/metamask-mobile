import React, { useRef } from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { strings } from '../../../../locales/i18n';
import { AccessRestrictedModalProps } from './AccessRestrictedModal.types';
import { AccessRestrictedModalSelectorsIDs } from './AccessRestrictedModal.testIds';

const AccessRestrictedModal: React.FC<AccessRestrictedModalProps> = ({
  isVisible,
  onClose,
  onContactSupport,
}) => {
  const tw = useTailwind();
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
      testID={AccessRestrictedModalSelectorsIDs.BOTTOM_SHEET}
    >
      <BottomSheetHeader onClose={onClose}>
        <Text
          variant={TextVariant.HeadingSM}
          testID={AccessRestrictedModalSelectorsIDs.TITLE}
        >
          {strings('access_restricted.title')}
        </Text>
      </BottomSheetHeader>

      <Box twClassName="px-4 pb-6">
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          testID={AccessRestrictedModalSelectorsIDs.DESCRIPTION}
        >
          {strings('access_restricted.description_line1')}
          {'\n\n'}
          {strings('access_restricted.description_line2')}
        </Text>

        <Pressable
          onPress={onContactSupport}
          testID={AccessRestrictedModalSelectorsIDs.CONTACT_SUPPORT_BUTTON}
          style={({ pressed }) =>
            tw.style(
              'w-full h-12 items-center justify-center rounded-xl bg-muted mt-6',
              pressed && 'opacity-70',
            )
          }
        >
          <Text variant={TextVariant.BodyMDMedium}>
            {strings('access_restricted.contact_support')}
          </Text>
        </Pressable>
      </Box>
    </BottomSheet>
  );
};

export default AccessRestrictedModal;
