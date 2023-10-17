// Third party dependencies.
import React, { useRef } from 'react';
import { View } from 'react-native';

// External dependencies.
import ReusableModal, {
  ReusableModalRef,
} from '../../../../components/UI/ReusableModal';
import Button, { ButtonSize, ButtonVariants } from '../../Buttons/Button';
import Text, { TextVariant } from '../../Texts/Text';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import { ModalConfirmationProps } from './ModalConfirmation.types';
import stylesheet from './ModalConfirmation.styles';
import {
  MODAL_CONFIRMATION_DANGER_BUTTON_ID,
  MODAL_CONFIRMATION_NORMAL_BUTTON_ID,
} from './ModalConfirmation.constants';

const ModalConfirmation = ({ route }: ModalConfirmationProps) => {
  const {
    onConfirm,
    onCancel,
    cancelLabel,
    confirmLabel,
    title,
    description,
    isDanger = false,
  } = route.params;
  const modalRef = useRef<ReusableModalRef>(null);
  const { styles } = useStyles(stylesheet, {});

  const triggerCancel = () => modalRef.current?.dismissModal(onCancel);

  const triggerConfirm = () => {
    modalRef.current?.dismissModal(onConfirm);
  };

  const handleModalDismiss = (hasPendingAction: boolean) =>
    !hasPendingAction && onCancel?.();

  const renderHeader = () => (
    <Text style={styles.headerLabel} variant={TextVariant.HeadingMD}>
      {title}
    </Text>
  );

  const renderDescription = () => (
    <Text variant={TextVariant.BodyMD}>{description}</Text>
  );

  const buttonTestID = isDanger
    ? MODAL_CONFIRMATION_DANGER_BUTTON_ID
    : MODAL_CONFIRMATION_NORMAL_BUTTON_ID;

  const renderButtons = () => (
    <View style={styles.buttonsContainer}>
      <Button
        variant={ButtonVariants.Secondary}
        onPress={triggerCancel}
        label={cancelLabel || strings('confirmation_modal.cancel_cta')}
        size={ButtonSize.Lg}
        style={styles.button}
      />
      <View style={styles.buttonDivider} />
      <Button
        variant={ButtonVariants.Primary}
        testID={buttonTestID}
        isDanger
        onPress={triggerConfirm}
        label={confirmLabel || strings('confirmation_modal.confirm_cta')}
        size={ButtonSize.Lg}
        style={styles.button}
      />
    </View>
  );

  return (
    <ReusableModal
      ref={modalRef}
      style={styles.screen}
      onDismiss={handleModalDismiss}
    >
      <View style={styles.modal}>
        <View style={styles.bodyContainer}>
          {renderHeader()}
          {renderDescription()}
        </View>
        <View style={styles.divider} />
        {renderButtons()}
      </View>
    </ReusableModal>
  );
};

export default ModalConfirmation;
