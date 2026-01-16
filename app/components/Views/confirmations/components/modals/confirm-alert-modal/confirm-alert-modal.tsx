import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import TouchableOpacity from '../../../../../Base/TouchableOpacity';
import { useTheme } from '../../../../../../util/theme';
import BottomModal from '../../../components/UI/bottom-modal';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import Checkbox from '../../../../../../component-library/components/Checkbox';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import { strings } from '../../../../../../../locales/i18n';
import { useAlerts } from '../../../context/alert-system-context';
import ButtonLink from '../../../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import styleSheet from './confirm-alert-modal.styles';
import { AlertKeys } from '../../../constants/alerts';

export interface ConfirmAlertModalProps {
  /** Callback function that is called when the reject button is clicked. */
  onReject: () => void;
  /** Callback function that is called when the confirm button is clicked. */
  onConfirm: () => void;
}

const ConfirmAlertModal: React.FC<ConfirmAlertModalProps> = ({
  onReject,
  onConfirm,
}) => {
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {});
  const {
    showAlertModal,
    fieldAlerts,
    hasUnconfirmedFieldDangerAlerts,
    alertModalVisible,
    generalAlerts,
  } = useAlerts();

  const [confirmCheckbox, setConfirmCheckbox] = useState<boolean>(false);

  const hasFieldAlerts = fieldAlerts.length > 0;
  const blockaidAlert = generalAlerts.find(
    (selectedAlert) => selectedAlert.key === AlertKeys.Blockaid,
  );

  const onlyBlockaidAlert = !hasFieldAlerts && blockaidAlert;

  const handleConfirmCheckbox = useCallback(() => {
    setConfirmCheckbox(!confirmCheckbox);
  }, [confirmCheckbox]);

  const handleConfirm = useCallback(async () => {
    onConfirm();
  }, [onConfirm]);

  const handleReject = useCallback(() => {
    onReject();
  }, [onReject]);

  if (!alertModalVisible && hasUnconfirmedFieldDangerAlerts) {
    showAlertModal();
    return null;
  }

  return (
    <BottomModal onClose={handleReject}>
      <View style={styles.modalContainer} testID="confirm-alert-modal">
        <View>
          <Icon
            name={IconName.Danger}
            size={IconSize.Xl}
            color={colors.error.default}
          />
        </View>
        <View style={styles.headerContainer}>
          <Text style={styles.headerText} variant={TextVariant.BodyMDBold}>
            {onlyBlockaidAlert
              ? strings('alert_system.confirm_modal.title_blockaid')
              : strings('alert_system.confirm_modal.title')}
          </Text>
        </View>
        <Text style={styles.message}>
          {onlyBlockaidAlert
            ? blockaidAlert.message
            : strings('alert_system.confirm_modal.message')}
        </Text>
        {hasFieldAlerts && (
          <ButtonLink
            style={styles.reviewAlertsLink}
            onPress={showAlertModal}
            label={strings('alert_system.confirm_modal.review_alerts')}
            startIconName={IconName.SecuritySearch}
            width={ButtonWidthTypes.Auto}
            size={ButtonSize.Lg}
            labelTextVariant={TextVariant.BodyMD}
          />
        )}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={handleConfirmCheckbox}
          activeOpacity={1}
        >
          <Checkbox
            onPress={handleConfirmCheckbox}
            isChecked={confirmCheckbox}
            testID="confirm-alert-checkbox"
          />
          <Text style={styles.checkboxText}>
            {strings('alert_system.confirm_modal.checkbox_label')}
          </Text>
        </TouchableOpacity>
        <View style={styles.buttonsContainer}>
          <Button
            onPress={handleReject}
            label={strings('confirm.cancel')}
            style={styles.footerButton}
            size={ButtonSize.Lg}
            variant={ButtonVariants.Secondary}
            width={ButtonWidthTypes.Full}
            testID="confirm-alert-cancel-button"
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
            testID="confirm-alert-confirm-button"
          />
        </View>
      </View>
    </BottomModal>
  );
};

export default ConfirmAlertModal;
