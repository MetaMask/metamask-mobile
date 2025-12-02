import React, { useRef } from 'react';
import { View } from 'react-native';

import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../../../locales/i18n';
import styleSheet from './UnsupportedTokenModal.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';

export const createUnsupportedTokenModalNavigationDetails =
  createNavigationDetails(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.UNSUPPORTED_TOKEN,
  );

function UnsupportedTokenModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(styleSheet, {});

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <BottomSheetHeader
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
        closeButtonProps={{ testID: 'bottomsheetheader-close-button' }}
      >
        {strings('deposit.token_modal.unsupported_token_title')}
      </BottomSheetHeader>

      <View style={styles.content}>
        <Text variant={TextVariant.BodyMD}>
          {strings('deposit.token_modal.unsupported_token_description')}
        </Text>
      </View>
    </BottomSheet>
  );
}

export default UnsupportedTokenModal;
