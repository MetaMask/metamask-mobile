import React, { useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';

import {
  BottomSheet,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import styleSheet from './UnsupportedTokenModal.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import { createNavigationDetails } from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import HeaderStandardGlass from '../../../../../../component-library/components-temp/HeaderStandardGlass';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../../../../selectors/featureFlagController/glassHeaders';

export const createUnsupportedTokenModalNavigationDetails =
  createNavigationDetails(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.UNSUPPORTED_TOKEN,
  );

function UnsupportedTokenModal() {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { styles } = useStyles(styleSheet, {});

  return (
    <BottomSheet ref={sheetRef} goBack={navigation.goBack}>
      <HeaderStandardGlass
        isFloating={false}
        isGlass={isGlassHeader}
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
