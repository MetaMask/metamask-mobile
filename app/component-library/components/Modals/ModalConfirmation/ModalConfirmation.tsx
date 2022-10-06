// Third party dependencies.
import React, { useRef } from 'react';
import { View } from 'react-native';

// External dependencies.
import ReusableModal, {
  ReusableModalRef,
} from '../../../../components/UI/ReusableModal';
import Button, { ButtonSize, ButtonVariants } from '../../Buttons/Button';
import { ButtonSecondaryVariants } from '../../Buttons/Button/variants/ButtonSecondary';
import { ButtonPrimaryVariants } from '../../Buttons/Button/variants/ButtonPrimary';
import Text, { TextVariants } from '../../Texts/Text';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import {
  ModalConfirmationProps,
  ModalConfirmationVariants,
} from './ModalConfirmation.types';
import stylesheet from './ModalConfirmation.styles';
import { BUTTON_TEST_ID_BY_VARIANT } from './ModalConfirmation.constants';

const ModalConfirmation = ({ route }: ModalConfirmationProps) => {
  const {
    onConfirm,
    onCancel,
    cancelLabel,
    confirmLabel,
    title,
    description,
    variant = ModalConfirmationVariants.Normal,
  } = route.params;
  const modalRef = useRef<ReusableModalRef>(null);
  const { styles } = useStyles(stylesheet, {});

  const triggerCancel = () => modalRef.current?.dismissModal(onCancel);

  const triggerConfirm = () => {
    modalRef.current?.dismissModal(onConfirm);
  };

  const renderHeader = () => (
    <Text style={styles.headerLabel} variant={TextVariants.sHeadingMD}>
      {title}
    </Text>
  );

  const renderDescription = () => (
    <Text variant={TextVariants.sBodyMD}>{description}</Text>
  );

  const renderButtons = () => (
    <View style={styles.buttonsContainer}>
      <Button
        variant={ButtonVariants.Secondary}
        buttonSecondaryVariants={ButtonSecondaryVariants.Normal}
        onPress={triggerCancel}
        label={cancelLabel || strings('confirmation_modal.cancel_cta')}
        size={ButtonSize.Lg}
        style={styles.button}
      />
      <View style={styles.buttonDivider} />
      <Button
        variant={ButtonVariants.Primary}
        testID={BUTTON_TEST_ID_BY_VARIANT[variant]}
        buttonPrimaryVariants={ButtonPrimaryVariants[variant]}
        onPress={triggerConfirm}
        label={confirmLabel || strings('confirmation_modal.confirm_cta')}
        size={ButtonSize.Lg}
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

export default ModalConfirmation;
