import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../component-library/hooks';
import { RootParamList } from '../../../../../util/navigation/types';
import { StackScreenProps } from '@react-navigation/stack';

const createStyles = () =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
    },
    footer: {
      paddingVertical: 20,
      paddingHorizontal: 16,
    },
    errorMessage: {
      textAlign: 'center',
    },
  });

type BlockaidModalProps = StackScreenProps<RootParamList, 'BlockaidModal'>;

const BlockaidModal = ({ route, navigation }: BlockaidModalProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(createStyles, {});
  const { errorMessage, errorType } = route.params;

  const handleClose = () => {
    navigation.goBack();
  };

  const footerButtonProps = [
    {
      label: strings('blockaid_modal.go_back'),
      variant: ButtonVariants.Primary,
      size: ButtonSize.Lg,
      onPress: handleClose,
    },
  ];

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings(`blockaid_modal.${errorType}_title`)}
        </Text>
      </BottomSheetHeader>
      <View style={styles.container}>
        <Text variant={TextVariant.BodyMD} style={styles.errorMessage}>
          {errorMessage}
        </Text>
      </View>
      <BottomSheetFooter
        buttonPropsArray={footerButtonProps}
        style={styles.footer}
      />
    </BottomSheet>
  );
};

export default BlockaidModal;
