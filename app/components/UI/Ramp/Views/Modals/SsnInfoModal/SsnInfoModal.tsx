import React, { useRef } from 'react';
import { View } from 'react-native';

import styleSheet from './SsnInfoModal.styles';

import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import { useStyles } from '../../../../../hooks/useStyles';
import { createNavigationDetails } from '../../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import HeaderStandardGlass from '../../../../../../component-library/components-temp/HeaderStandardGlass';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../../../../selectors/featureFlagController/glassHeaders';

export const createSsnInfoModalNavigationDetails = createNavigationDetails(
  Routes.RAMP.MODALS.ID,
  Routes.RAMP.MODALS.SSN_INFO,
);

function SsnInfoModal() {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const sheetRef = useRef<BottomSheetRef>(null);

  const { styles } = useStyles(styleSheet, {});

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <HeaderStandardGlass
        isFloating={false}
        isGlass={isGlassHeader}
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
