import React, { useRef } from 'react';
import { View } from 'react-native';
import ReusableModal, {
  ReusableModalRef,
} from '../../../components/UI/ReusableModal';
import { strings } from '../../../../locales/i18n';
import {
  ConfirmationModalProps,
  ConfirmationModalVariant,
} from './ConfirmationModal.types';
import { useStyles } from '../../../component-library/hooks';
import stylesheet from './ConfirmationModal.styles';
import { BaseButtonSize } from '../BaseButton';
import ButtonSecondary, { ButtonSecondaryVariant } from '../ButtonSecondary';
import ButtonPrimary, { ButtonPrimaryVariant } from '../ButtonPrimary';
import BaseText, { BaseTextVariant } from '../BaseText';
import {
  CONFIRMATION_MODAL_NORMAL_BUTTON_ID,
  CONFIRMATION_MODAL_DANGER_BUTTON_ID,
} from '../../../constants/test-ids';

const buttonTestIdByVariant = {
  [ConfirmationModalVariant.Normal]: CONFIRMATION_MODAL_NORMAL_BUTTON_ID,
  [ConfirmationModalVariant.Danger]: CONFIRMATION_MODAL_DANGER_BUTTON_ID,
};

const ConfirmationModal = ({ route }: ConfirmationModalProps) => {
  const {
    onConfirm,
    onCancel,
    cancelLabel,
    confirmLabel,
    variant,
    title,
    description,
  } = route.params;
  const modalRef = useRef<ReusableModalRef>(null);
  const { styles } = useStyles(stylesheet, {});

  const triggerCancel = () => modalRef.current?.dismissModal(onCancel);

  const triggerConfirm = () => {
    modalRef.current?.dismissModal(onConfirm);
  };

  const renderHeader = () => (
    <BaseText style={styles.headerLabel} variant={BaseTextVariant.sHeadingMD}>
      {title}
    </BaseText>
  );

  const renderDescription = () => (
    <BaseText variant={BaseTextVariant.sBodyMD}>{description}</BaseText>
  );

  const renderButtons = () => (
    <View style={styles.buttonsContainer}>
      <ButtonSecondary
        variant={ButtonSecondaryVariant.Normal}
        onPress={triggerCancel}
        label={cancelLabel || strings('confirmation_modal.cancel_cta')}
        size={BaseButtonSize.Lg}
        style={styles.button}
      />
      <View style={styles.buttonDivider} />
      <ButtonPrimary
        testID={buttonTestIdByVariant[variant]}
        variant={ButtonPrimaryVariant[variant]}
        onPress={triggerConfirm}
        label={confirmLabel || strings('confirmation_modal.confirm_cta')}
        size={BaseButtonSize.Lg}
        style={styles.button}
      />
    </View>
  );

  return (
    <ReusableModal ref={modalRef} style={styles.screen}>
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

export default ConfirmationModal;
