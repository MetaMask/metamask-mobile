import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';

import { useStyles } from '../../../../hooks/useStyles';
import { strings } from '../../../../../../locales/i18n';
import { RampsBottomSheetModalProps } from './RampsBottomSheetModal.types';
import createStyles from './RampsBottomSheetModal.styles';

const RampsBottomSheetModal = ({ route }: RampsBottomSheetModalProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();

  const {
    title,
    description,
    buttonLabel = strings('fiat_on_ramp.modal.default_button'),
    onButtonPress,
    showCloseIcon = true,
  } = route.params;

  const { styles } = useStyles(createStyles, {});

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      navigation.goBack();
    });
  }, [navigation]);

  const handleButtonPress = useCallback(() => {
    if (onButtonPress) {
      sheetRef.current?.onCloseBottomSheet(() => {
        onButtonPress();
      });
    } else {
      handleClose();
    }
  }, [onButtonPress, handleClose]);

  const renderTitle = () => {
    if (typeof title === 'string') {
      return <Text variant={TextVariant.HeadingMD}>{title}</Text>;
    }
    return title;
  };

  const renderDescription = () => {
    if (typeof description === 'string') {
      return (
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {description}
        </Text>
      );
    }
    return description;
  };

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack isInteractable={false}>
      {showCloseIcon && (
        <BottomSheetHeader onClose={handleClose}>
          {renderTitle()}
        </BottomSheetHeader>
      )}
      {!showCloseIcon && <View style={styles.container}>{renderTitle()}</View>}

      <View style={[styles.container, styles.description]}>
        {renderDescription()}
      </View>

      <View style={styles.container}>
        <Button
          size={ButtonSize.Lg}
          onPress={handleButtonPress}
          label={buttonLabel}
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
        />
      </View>
    </BottomSheet>
  );
};

export default RampsBottomSheetModal;
