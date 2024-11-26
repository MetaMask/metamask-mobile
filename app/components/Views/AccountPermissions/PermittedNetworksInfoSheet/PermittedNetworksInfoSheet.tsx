// Third party dependencies
import React, { useRef } from 'react';

// External dependencies
import { View } from 'react-native';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './PermittedNetworksInfoSheet.styles';

const PermittedNetworksInfoSheet = () => {
  const { styles } = useStyles(styleSheet, {});

  const sheetRef = useRef<BottomSheetRef>(null);

  const onDismiss = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.container}>
        <BottomSheetHeader>
          <Text variant={TextVariant.HeadingMD}>
            {strings('permissions.permitted_networks')}
          </Text>
        </BottomSheetHeader>
        <View style={styles.descriptionContainer}>
          <Text variant={TextVariant.BodyMD}>
            {strings('permissions.permitted_networks_info_sheet_description')}
          </Text>
        </View>
        <View style={styles.buttonsContainer}>
          <Button
            label={strings('permissions.got_it')}
            style={styles.button}
            size={ButtonSize.Lg}
            variant={ButtonVariants.Primary}
            onPress={onDismiss}
          />
        </View>
      </View>
    </BottomSheet>
  );
};

export default PermittedNetworksInfoSheet;
