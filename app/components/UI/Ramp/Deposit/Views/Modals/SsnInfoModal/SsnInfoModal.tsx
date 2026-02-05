import React, { useRef } from 'react';
import { View } from 'react-native';

import styleSheet from './SsnInfoModal.styles';

import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCompactStandard from '../../../../../../../component-library/components-temp/HeaderCompactStandard';

import { useStyles } from '../../../../../../hooks/useStyles';
import { createNavigationDetails } from '../../../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../../../locales/i18n';
import Routes from '../../../../../../../constants/navigation/Routes';

export const createSsnInfoModalNavigationDetails = createNavigationDetails(
  Routes.DEPOSIT.MODALS.ID,
  Routes.DEPOSIT.MODALS.SSN_INFO,
);

function SsnInfoModal() {
  const sheetRef = useRef<BottomSheetRef>(null);

  const { styles } = useStyles(styleSheet, {});

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <HeaderCompactStandard
        title={strings('deposit.ssn_info_modal.title')}
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
      />

      <View style={styles.content}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
          {strings('deposit.ssn_info_modal.description')}
        </Text>
      </View>
    </BottomSheet>
  );
}

export default SsnInfoModal;
