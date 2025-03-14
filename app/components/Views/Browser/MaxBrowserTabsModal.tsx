import React, { useRef } from 'react'
import { View, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetRef } from '../../../component-library/components/BottomSheets/BottomSheet';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Button, { ButtonSize, ButtonVariants, ButtonWidthTypes } from '../../../component-library/components/Buttons/Button';
import ReusableModal from '../../UI/ReusableModal';
import { strings } from '../../../../locales/i18n';
import Text from '../../../component-library/components/Texts/Text';
import { useNavigation } from '@react-navigation/native';
const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: 20
  },
  dialogDescription: {
    marginBottom: 20,
  },
});

const MaxBrowserTabsModal = () => {
  const modalRef = useRef<BottomSheetRef>(null);

  const dismissModal = (): void => {
    modalRef.current?.onCloseBottomSheet();
  };


  return (
    <ReusableModal>
      <BottomSheet ref={modalRef}>
        <SheetHeader title={strings('browser.max_tabs_title')} />
        <View style={styles.sheet}>
          <Text style={styles.dialogDescription}>{strings('browser.max_tabs_desc')}</Text>
          <Button
            variant={ButtonVariants.Primary}
            label={strings('browser.got_it')}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            onPress={dismissModal}
          />
        </View>
      </BottomSheet>
    </ReusableModal>
  )
};

export default MaxBrowserTabsModal;
