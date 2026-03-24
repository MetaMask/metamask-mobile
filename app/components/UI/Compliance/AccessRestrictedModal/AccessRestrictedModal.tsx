import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  ButtonBase,
  ButtonBaseSize,
  BottomSheetHeader,
} from '@metamask/design-system-react-native';
import BottomSheet from '../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../locales/i18n';
import { AccessRestrictedModalProps } from './AccessRestrictedModal.types';
import { AccessRestrictedModalSelectorsIDs } from './AccessRestrictedModal.testIds';

const AccessRestrictedModal: React.FC<AccessRestrictedModalProps> = ({
  isVisible,
  onClose,
  onContactSupport,
}) => {
  if (!isVisible) return null;

  return (
    <BottomSheet
      shouldNavigateBack={false}
      onClose={onClose}
      testID={AccessRestrictedModalSelectorsIDs.BOTTOM_SHEET}
    >
      <BottomSheetHeader
        onClose={onClose}
        titleTestID={AccessRestrictedModalSelectorsIDs.TITLE}
      >
        {strings('access_restricted.title')}
      </BottomSheetHeader>

      <Box twClassName="px-4 pb-6">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={AccessRestrictedModalSelectorsIDs.DESCRIPTION}
        >
          {strings('access_restricted.description_line1')}
          {'\n\n'}
          {strings('access_restricted.description_line2')}
        </Text>

        <ButtonBase
          onPress={onContactSupport}
          testID={AccessRestrictedModalSelectorsIDs.CONTACT_SUPPORT_BUTTON}
          size={ButtonBaseSize.Lg}
          twClassName="w-full rounded-xl bg-muted mt-6"
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('access_restricted.contact_support')}
          </Text>
        </ButtonBase>
      </Box>
    </BottomSheet>
  );
};

export default AccessRestrictedModal;
