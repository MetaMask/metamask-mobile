import React, { useRef } from 'react'
import { View } from 'react-native';
import BottomSheet, { BottomSheetRef } from '../../../component-library/components/BottomSheets/BottomSheet';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Button, { ButtonSize, ButtonVariants, ButtonWidthTypes } from '../../../component-library/components/Buttons/Button';
import { strings } from '../../../../locales/i18n';
import Text from '../../../component-library/components/Texts/Text';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import styleSheet from './MaxBrowserTabsModal.styles';
import { useStyles } from '../../../component-library/hooks';

const MaxBrowserTabsModal = () => {
  const { styles } = useStyles(styleSheet, {});
  const modalRef = useRef<BottomSheetRef>(null);

  const dismissModal = (): void => {
    modalRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet ref={modalRef}>
      <View style={styles.infoIconWrap}>
        <MaterialCommunityIcons
          name="information"
          size={28}
          style={styles.infoIcon}
        />
      </View>
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
  )
};

export default MaxBrowserTabsModal;
