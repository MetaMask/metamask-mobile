// Third party dependencies.
import React, { useRef } from 'react';
import { View } from 'react-native';

// External dependencies.
import ReusableModal, {
  ReusableModalRef,
} from '../../../../components/UI/ReusableModal';
import { ButtonBaseSize } from '../../Buttons/ButtonBase';
import ButtonSecondary, {
  ButtonSecondaryVariant,
} from '../../Buttons/ButtonSecondary';
import ButtonPrimary, {
  ButtonPrimaryVariant,
} from '../../Buttons/ButtonPrimary';
import Text, { TextVariant } from '../../Text';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';

// Internal dependencies.
import {
  ModalConfirmationProps,
  ModalConfirmationVariant,
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
    variant = ModalConfirmationVariant.Normal,
  } = route.params;
  const modalRef = useRef<ReusableModalRef>(null);
  const { styles } = useStyles(stylesheet, {});

  const triggerCancel = () => modalRef.current?.dismissModal(onCancel);

  const triggerConfirm = () => {
    modalRef.current?.dismissModal(onConfirm);
  };

  const renderHeader = () => (
    <Text style={styles.headerLabel} variant={TextVariant.sHeadingMD}>
      {title}
    </Text>
  );

  const renderDescription = () => (
    <Text variant={TextVariant.sBodyMD}>{description}</Text>
  );

  const renderButtons = () => (
    <View style={styles.buttonsContainer}>
      <ButtonSecondary
        variant={ButtonSecondaryVariant.Normal}
        onPress={triggerCancel}
        label={cancelLabel || strings('confirmation_modal.cancel_cta')}
        size={ButtonBaseSize.Lg}
        style={styles.button}
      />
      <View style={styles.buttonDivider} />
      <ButtonPrimary
        testID={BUTTON_TEST_ID_BY_VARIANT[variant]}
        variant={ButtonPrimaryVariant[variant]}
        onPress={triggerConfirm}
        label={confirmLabel || strings('confirmation_modal.confirm_cta')}
        size={ButtonBaseSize.Lg}
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
