import React, { useRef } from 'react';
import { View } from 'react-native';
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
    isInteractable = true,
  } = route.params;
  const { styles } = useStyles(styleSheet, {});
  const bottomSheetRef = useRef<SheetBottomRef | null>(null);

  const onPressCancel = () => {
    if (onCancel) onCancel();
    bottomSheetRef.current.hide();
  };
  const onPressConfirm = () => {
    if (onConfirm) onConfirm();
    bottomSheetRef.current.hide();
  };

  return (
    <SheetBottom ref={bottomSheetRef} isInteractive={isInteractable}>
      <View style={styles.contentContainer}>
        <Text variant={TextVariants.sHeadingMD} style={styles.title}>
          {title}
        </Text>
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
