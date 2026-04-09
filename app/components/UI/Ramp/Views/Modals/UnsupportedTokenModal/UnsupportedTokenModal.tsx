import React, { useRef } from 'react';
import { View } from 'react-native';

import { Text, TextVariant } from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCompactStandard from '../../../../../../component-library/components-temp/HeaderCompactStandard';
import { strings } from '../../../../../../../locales/i18n';
import styleSheet from './UnsupportedTokenModal.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import { createNavigationDetails } from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';

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
      <HeaderCompactStandard
        title={strings('deposit.token_modal.unsupported_token_title')}
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
        closeButtonProps={{ testID: 'bottomsheetheader-close-button' }}
      />

      <View style={styles.content}>
        <Text variant={TextVariant.BodyMd}>
          {strings('deposit.token_modal.unsupported_token_description')}
        </Text>
      </View>
    </BottomSheet>
  );
}

export default UnsupportedTokenModal;
