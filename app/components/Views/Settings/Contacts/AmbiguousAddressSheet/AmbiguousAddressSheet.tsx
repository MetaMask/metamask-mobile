import React, { useRef } from 'react';
import { useNavigation } from '@react-navigation/native';

import { strings } from '../../../../../../locales/i18n';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Text,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';

/**
 * AmbiguousAddressSheet Component.
 *
 */
const AmbiguousAddressSheet = () => {
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);

  const onCancelPress = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet ref={sheetRef} goBack={() => navigation.goBack()}>
      <BottomSheetHeader
        onClose={onCancelPress}
        closeButtonProps={{ testID: 'ambiguous-address-sheet-close' }}
      >
        {strings('duplicate_address.title')}
      </BottomSheetHeader>

      <Text twClassName="px-4 mb-4">{strings('duplicate_address.body')}</Text>

      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('duplicate_address.button'),
          onPress: onCancelPress,
        }}
      />
    </BottomSheet>
  );
};

export default AmbiguousAddressSheet;
