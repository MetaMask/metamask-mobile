import React from 'react';
import {
  BottomSheet,
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
import BottomSheetHeaderGlass from '../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../../selectors/featureFlagController/glassHeaders';

const AccessRestrictedModal: React.FC<AccessRestrictedModalProps> = ({
  isVisible,
  onClose,
  onContactSupport,
}) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  if (!isVisible) return null;

  return (
    <BottomSheet
      onClose={onClose}
      testID={AccessRestrictedModalSelectorsIDs.BOTTOM_SHEET}
    >
      <BottomSheetHeaderGlass
        isGlass={isGlassHeader}
        onClose={onClose}
        textProps={{ testID: AccessRestrictedModalSelectorsIDs.TITLE }}
      >
        {strings('access_restricted.title')}
      </BottomSheetHeaderGlass>

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
