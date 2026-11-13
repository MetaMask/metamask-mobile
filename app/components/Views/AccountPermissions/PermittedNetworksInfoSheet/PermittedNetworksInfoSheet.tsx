// Third party dependencies
import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';

// External dependencies
import { View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './PermittedNetworksInfoSheet.styles';
import { PermittedNetworksInfoSheetTestIds } from './PermittedNetworksInfoSheet.constants';
import {
  BottomSheet,
  type BottomSheetRef,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import BottomSheetHeaderGlass from '../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../../selectors/featureFlagController/glassHeaders';

const PermittedNetworksInfoSheet = () => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const { styles } = useStyles(styleSheet, {});

  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const onDismiss = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet ref={sheetRef} goBack={handleGoBack}>
      <View
        style={styles.container}
        testID={PermittedNetworksInfoSheetTestIds.CONTAINER}
      >
        <BottomSheetHeaderGlass isGlass={isGlassHeader}>
          {strings('permissions.permitted_networks')}
        </BottomSheetHeaderGlass>
        <View
          style={styles.descriptionContainer}
          testID={PermittedNetworksInfoSheetTestIds.DESCRIPTION_CONTAINER}
        >
          <Text variant={TextVariant.BodyMd}>
            {strings('permissions.permitted_networks_info_sheet_description')}
          </Text>
        </View>
        <View
          style={styles.buttonsContainer}
          testID={PermittedNetworksInfoSheetTestIds.BUTTONS_CONTAINER}
        >
          <Button
            style={styles.button}
            size={ButtonSize.Lg}
            variant={ButtonVariant.Primary}
            onPress={onDismiss}
            testID={PermittedNetworksInfoSheetTestIds.GOT_IT_BUTTON}
          >
            {strings('permissions.got_it')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default PermittedNetworksInfoSheet;
