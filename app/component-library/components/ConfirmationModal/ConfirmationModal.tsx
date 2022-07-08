import React, { useRef } from 'react';
import { View } from 'react-native';
import ReusableModal, {
  ReusableModalRef,
} from '../../../components/UI/ReusableModal';
import { strings } from '../../../../locales/i18n';
import { ConfirmationModalProps } from './ConfirmationModal.types';
import { useStyles } from '../../../component-library/hooks';
import stylesheet from './ConfirmationModal.styles';
import { BaseButtonSize } from '../BaseButton';
import ButtonSecondary, { ButtonSecondaryVariant } from '../ButtonSecondary';
import ButtonPrimary, { ButtonPrimaryVariant } from '../ButtonPrimary';
import BaseText, { BaseTextVariant } from '../BaseText';

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
        label={cancelLabel || strings('wallet.hide_token.cancel_cta')}
        size={BaseButtonSize.Lg}
        style={styles.button}
      />
      <View style={styles.buttonDivider} />
      <ButtonPrimary
        variant={ButtonPrimaryVariant[variant]}
        onPress={triggerConfirm}
        label={confirmLabel || strings('wallet.hide_token.confirm_cta')}
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
