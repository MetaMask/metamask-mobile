import React, { useRef } from 'react';
import { View } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import { strings } from '../../../../locales/i18n';
import styleSheet from './MaxBrowserTabsModal.styles';
import { useStyles } from '../../../component-library/hooks';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import {
  Text,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';

const MaxBrowserTabsModal = () => {
  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet);
  const modalRef = useRef<BottomSheetRef>(null);

  const dismissModal = (): void => {
    modalRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet ref={modalRef}>
      <View style={styles.infoIconWrap}>
        <Icon
          size={IconSize.Lg}
          name={IconName.Info}
          color={colors.primary.default}
        />
      </View>
      <SheetHeader title={strings('browser.max_tabs_title')} />
      <View style={styles.sheet}>
        <Text style={styles.dialogDescription}>
          {strings('browser.max_tabs_desc')}
        </Text>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={dismissModal}
        >
          {strings('browser.got_it')}
        </Button>
      </View>
    </BottomSheet>
  );
};

export default MaxBrowserTabsModal;
