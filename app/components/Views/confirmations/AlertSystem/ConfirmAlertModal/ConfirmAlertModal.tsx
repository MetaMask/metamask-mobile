import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import BottomModal from '../../components/UI/BottomModal';
import Button, { ButtonSize, ButtonVariants, ButtonWidthTypes } from '../../../../../component-library/components/Buttons/Button';
import Checkbox from '../../../../../component-library/components/Checkbox';
import Icon, { IconName, IconSize } from '../../../../../component-library/components/Icons/Icon';
import Text, { TextVariant } from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import { strings } from '../../../../../../locales/i18n';
import { useAlerts } from '../context';
import ButtonLink from '../../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import styleSheet from './ConfirmAlertModal.styles';

export interface ConfirmAlertModalProps {
  /** Callback function that is called when the reject button is clicked. */
  onReject: () => void;
  /** Callback function that is called when the confirm button is clicked. */
  onConfirm: () => void;
}

const ConfirmAlertModal: React.FC<ConfirmAlertModalProps> = ({ onReject, onConfirm }) => {
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {});
  const { showAlertModal } = useAlerts();

  const [confirmCheckbox, setConfirmCheckbox] = useState<boolean>(false);

  const handleConfirmCheckbox = useCallback(() => {
    setConfirmCheckbox(!confirmCheckbox);
  }, [confirmCheckbox]);

  const handleConfirm = useCallback(async () => {
    onConfirm();
  }, [onConfirm]);

  const handleReject = useCallback(() => {
    onReject();
  }, [onReject]);

  return (
    <BottomModal onClose={handleReject}>
      <View style={styles.modalContainer}>
        <View>
          <Icon name={IconName.Danger} size={IconSize.Xl} color={colors.error.default} />
        </View>
        <View style={styles.headerContainer}>
          <Text style={styles.headerText} variant={TextVariant.BodyMDBold}>
            {strings('alert_system.confirm_modal.title')}
          </Text>
        </View>
          <Text style={styles.message}>
            {strings('alert_system.confirm_modal.message')}
          </Text>
          <ButtonLink
            style={styles.reviewAlertsLink}
            onPress={showAlertModal}
            label={strings('alert_system.confirm_modal.review_alerts')}
            startIconName={IconName.SecuritySearch}
            width={ButtonWidthTypes.Auto}
            size={ButtonSize.Lg}
            labelTextVariant={TextVariant.BodyMD}
          />

        <View style={styles.checkboxContainer}>
          <Checkbox
            isChecked={confirmCheckbox}
            onPress={handleConfirmCheckbox}
            label={strings('alert_system.confirm_modal.checkbox_label')}
            style={styles.checkboxLabel}
            testID="confirm-alert-checkbox"
          />
        </View>
        <View style={styles.buttonsContainer}>
          <Button
            onPress={handleReject}
            label={strings('confirm.reject')}
            style={styles.footerButton}
            size={ButtonSize.Lg}
            variant={ButtonVariants.Secondary}
            width={ButtonWidthTypes.Full}
          />
          <View style={styles.buttonDivider} />
          <Button
            onPress={handleConfirm}
            label={strings('confirm.confirm')}
            style={styles.footerButton}
            size={ButtonSize.Lg}
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
            isDisabled={!confirmCheckbox}
            startIconName={IconName.Danger}
            isDanger
          />
        </View>
      </View>
    </BottomModal>
  );
};

export default ConfirmAlertModal;
