import React, { useRef } from 'react';

import { strings } from '../../../../../../locales/i18n';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  ButtonSize,
  ButtonsAlignment,
  Text,
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
      <BottomSheetHeader>{strings('duplicate_address.title')}</BottomSheetHeader>
      <Box twClassName="items-center justify-center self-center p-4">
        <Text variant={TextVariant.BodyMd}>
          {strings('duplicate_address.body')}
        </Text>
      </Box>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Vertical}
        primaryButtonProps={{
          children: strings('duplicate_address.button'),
          isFullWidth: true,
          onPress: onCancelPress,
          size: ButtonSize.Lg,
        }}
      />
    </BottomSheet>
  );
};

export default AmbiguousAddressSheet;
