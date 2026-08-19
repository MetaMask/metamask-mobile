import React, { useCallback, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../../../../util/theme';
import BottomModal from '../../../components/UI/bottom-modal';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  IconName as DesignSystemIconName,
} from '@metamask/design-system-react-native';
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
import styleSheet from './confirm-alert-modal.styles';
import { AlertKeys } from '../../../constants/alerts';
import { ConfirmAlertModalSelectorsIDs } from '../../../ConfirmationView.testIds';

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
      <View
        style={styles.modalContainer}
        testID={ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_MODAL}
      >
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
          <Button
            style={styles.reviewAlertsLink}
            onPress={showAlertModal}
            startIconName={DesignSystemIconName.SecuritySearch}
            size={ButtonSize.Lg}
            variant={ButtonVariant.Tertiary}
            testID={ConfirmAlertModalSelectorsIDs.REVIEW_ALERTS_BUTTON}
          >
            {strings('alert_system.confirm_modal.review_alerts')}
          </Button>
        )}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={handleConfirmCheckbox}
          activeOpacity={1}
        >
          <Checkbox
            onPress={handleConfirmCheckbox}
            isChecked={confirmCheckbox}
            testID={ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_CHECKBOX}
          />
          <Text style={styles.checkboxText}>
            {strings('alert_system.confirm_modal.checkbox_label')}
          </Text>
        </TouchableOpacity>
        <View style={styles.buttonsContainer}>
          <Button
            onPress={handleReject}
            style={styles.footerButton}
            size={ButtonSize.Lg}
            variant={ButtonVariant.Secondary}
            isFullWidth
            testID={ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_CANCEL_BUTTON}
          >
            {strings('confirm.cancel')}
          </Button>
          <View style={styles.buttonDivider} />
          <Button
            onPress={handleConfirm}
            style={styles.footerButton}
            size={ButtonSize.Lg}
            variant={ButtonVariant.Primary}
            isFullWidth
            isDisabled={!confirmCheckbox}
            startIconName={DesignSystemIconName.Danger}
            isDanger
            testID={ConfirmAlertModalSelectorsIDs.CONFIRM_ALERT_BUTTON}
          >
            {strings('confirm.confirm')}
          </Button>
        </View>
      </View>
    </BottomModal>
  );
};

export default ConfirmAlertModal;
