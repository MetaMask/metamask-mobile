import React, { useRef } from 'react';
import { View } from 'react-native';
import BottomSheet, {
  type BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import createMaxInputModalStyles from './MaxInputModal.styles';
import { useRoute, RouteProp } from '@react-navigation/native';

const styles = createMaxInputModalStyles();

interface MaxInputModalRouteParams {
  handleMaxPress: () => void;
}

const MaxInputModal = () => {
  const route =
    useRoute<RouteProp<{ params: MaxInputModalRouteParams }, 'params'>>();
  const sheetRef = useRef<BottomSheetRef>(null);

  const { handleMaxPress } = route.params;

  const handleCancel = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  const handleConfirm = () => {
    sheetRef.current?.onCloseBottomSheet();
    handleMaxPress();
  };

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.container}>
        <BottomSheetHeader onClose={handleCancel}>
          <Text variant={TextVariant.HeadingMD}>
            {strings('stake.max_modal.title')}
          </Text>
        </BottomSheetHeader>
        <View style={styles.textContainer}>
          <Text variant={TextVariant.BodyMD}>
            {strings('stake.max_modal.eth.description')}
          </Text>
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <View style={styles.button}>
          <Button
            onPress={handleCancel}
            variant={ButtonVariant.Secondary}
            isFullWidth
            size={ButtonSize.Lg}
          >
            {strings('stake.cancel')}
          </Button>
        </View>
        <View style={styles.button}>
          <Button
            onPress={handleConfirm}
            variant={ButtonVariant.Primary}
            isFullWidth
            size={ButtonSize.Lg}
          >
            {strings('stake.use_max')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default MaxInputModal;
