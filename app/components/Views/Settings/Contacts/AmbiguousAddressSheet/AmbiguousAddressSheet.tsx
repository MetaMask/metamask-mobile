import React, { useRef } from 'react';

import { strings } from '../../../../../../locales/i18n';
import {
  BottomSheet,
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';

/**
 * AmbiguousAddressSheet Component.
 *
 */
const AmbiguousAddressSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);

  const onCancelPress = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet ref={sheetRef}>
      <Box twClassName="items-center justify-center self-center p-4">
        <Text variant={TextVariant.HeadingMd}>
          {strings('duplicate_address.title')}
        </Text>
        <Text variant={TextVariant.BodyMd}>
          {strings('duplicate_address.body')}
        </Text>
        <Box twClassName="flex-row pt-4">
          <Button
            variant={ButtonVariant.Primary}
            isFullWidth
            size={ButtonSize.Lg}
            accessibilityRole={'button'}
            accessible
            onPress={onCancelPress}
          >
            {strings('duplicate_address.button')}
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default AmbiguousAddressSheet;
