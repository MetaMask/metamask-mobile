import React, { useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import SheetBottom, {
  SheetBottomRef,
} from '../../../component-library/components/Sheet/SheetBottom';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { ButtonSecondaryVariants } from '../../../component-library/components/Buttons/Button/variants/ButtonSecondary';
import { ButtonPrimaryVariants } from '../../../component-library/components/Buttons/Button/variants/ButtonPrimary';

import { useStyles } from '../../../component-library/hooks';
import styleSheet from './SheetBottomConfirmation.styles';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariants,
} from '../../../component-library/components/Texts/Text';
import { SheetBottomConfirmationProps } from './SheetBottomConfirmation.types';

const SheetBottomConfirmation = ({ route }: SheetBottomConfirmationProps) => {
  const {
    title,
    description,
    onConfirm,
    confirmLabel,
    cancelLabel,
    onCancel,
    onDismissed,
  } = route.params;
  const { styles } = useStyles(styleSheet, {});
  const bottomSheetRef = useRef<SheetBottomRef | null>(null);
  const navigation = useNavigation();

  const onPressCancel = () => {
    if (onCancel) onCancel();
    navigation.goBack();
  };
  const onPressConfirm = () => {
    navigation.goBack();
    if (onConfirm) onConfirm();

    console.log('ENTER HERE');
  };

  const onDismiss = () => {
    if (onDismissed) onDismissed();
  };

  return (
    <SheetBottom ref={bottomSheetRef} onDismissed={onDismiss}>
      <View style={styles.contentContainer}>
        <Text variant={TextVariants.sHeadingMD}>{title}</Text>
        <Text variant={TextVariants.sBodyMD} style={styles.description}>
          {description}
        </Text>
        <View style={styles.actionContainer}>
          <Button
            variant={ButtonVariants.Secondary}
            buttonSecondaryVariants={ButtonSecondaryVariants.Normal}
            onPress={onPressCancel}
            label={cancelLabel || strings('confirmation_modal.cancel_cta')}
            size={ButtonSize.Lg}
            style={styles.button}
          />
          <View style={styles.buttonDivider} />
          <Button
            variant={ButtonVariants.Primary}
            buttonPrimaryVariants={ButtonPrimaryVariants.Normal}
            onPress={onPressConfirm}
            label={confirmLabel || strings('confirmation_modal.confirm_cta')}
            size={ButtonSize.Lg}
            style={styles.button}
          />
        </View>
      </View>
    </SheetBottom>
  );
};
export default SheetBottomConfirmation;
