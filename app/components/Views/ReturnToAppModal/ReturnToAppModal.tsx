// Third party dependencies.
import React, { useRef } from 'react';

// External dependencies.
import { strings } from '../../../../locales/i18n';
import SheetBottom, {
  SheetBottomRef,
} from '../../../component-library/components/Sheet/SheetBottom';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import styleSheet from './ReturnToAppModal.styles';
import { useStyles } from '../../../component-library/hooks';
import Text from '../../../component-library/components/Texts/Text';

const ReturnToAppModal = () => {
  const { styles } = useStyles(styleSheet, {});

  const sheetRef = useRef<SheetBottomRef>(null);

  return (
    <SheetBottom ref={sheetRef}>
      <SheetHeader title={strings('sdk_return_to_app_modal.title')} />
      <Text style={styles.description}>
        {strings('sdk_return_to_app_modal.description')}
      </Text>
    </SheetBottom>
  );
};

export default ReturnToAppModal;
