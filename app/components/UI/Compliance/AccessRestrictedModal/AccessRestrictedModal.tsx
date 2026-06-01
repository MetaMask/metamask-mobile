import React from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  ButtonBase,
  ButtonBaseSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { AccessRestrictedModalProps } from './AccessRestrictedModal.types';
import { AccessRestrictedModalSelectorsIDs } from './AccessRestrictedModal.testIds';
import { useElevatedSurface } from '../../../../util/theme/themeUtils';

const AccessRestrictedModal: React.FC<AccessRestrictedModalProps> = ({
  isVisible,
  onClose,
  onContactSupport,
}) => {
  const surfaceClass = useElevatedSurface();

  if (!isVisible) return null;

  return (
    <BottomSheet
      onClose={onClose}
      testID={AccessRestrictedModalSelectorsIDs.BOTTOM_SHEET}
      twClassName={surfaceClass}
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
