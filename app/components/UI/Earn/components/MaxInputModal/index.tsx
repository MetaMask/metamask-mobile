import React, { useRef } from 'react';
import { View } from 'react-native';
import BottomSheet, {
  type BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../locales/i18n';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import createMaxInputModalStyles from './MaxInputModal.styles';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../../../util/navigation/types';

const styles = createMaxInputModalStyles();

type MaxInputModalProps = StackScreenProps<RootParamList, 'MaxInput'>;

const MaxInputModal = ({ route }: MaxInputModalProps) => {
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
            label={strings('stake.cancel')}
            variant={ButtonVariants.Secondary}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
          />
        </View>
        <View style={styles.button}>
          <Button
            onPress={handleConfirm}
            label={strings('stake.use_max')}
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
          />
        </View>
      </View>
    </BottomSheet>
  );
};

export default MaxInputModal;
