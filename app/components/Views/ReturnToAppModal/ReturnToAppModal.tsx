// Third party dependencies.
import React, { useRef } from 'react';

// External dependencies.
import { strings } from '../../../../locales/i18n';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import styleSheet from '../AccountConnect/AccountConnectSingle/AccountConnectSingle.styles';
import { useStyles } from '../../../component-library/hooks';
import Text from '../../../component-library/components/Texts/Text';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';

const ReturnToAppModal = () => {
  const { styles } = useStyles(styleSheet, {});

  const sheetRef = useRef(null);

  return (
    <BottomSheet ref={sheetRef}>
      <SheetHeader title={strings('sdk_return_to_app_modal.title')} />
      <Text style={styles.description}>
        {strings('sdk_return_to_app_modal.description')}
      </Text>
    </BottomSheet>
  );
};

export default ReturnToAppModal;
