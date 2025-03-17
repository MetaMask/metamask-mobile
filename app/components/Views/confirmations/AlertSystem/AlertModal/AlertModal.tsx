import React, { useCallback } from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import { useAlerts } from '../context';
import BottomModal from '../../components/UI/BottomModal';
import Button, { ButtonSize, ButtonVariants, ButtonWidthTypes } from '../../../../../component-library/components/Buttons/Button';
import Checkbox from '../../../../../component-library/components/Checkbox';
import Icon, { IconName, IconSize } from '../../../../../component-library/components/Icons/Icon';
import Text, { TextVariant } from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './AlertModal.styles';
import { strings } from '../../../../../../locales/i18n';
import { Alert, Severity } from '../../types/alerts';
import { useAlertsConfirmed } from '../../../../hooks/useAlertsConfirmed';
import { getSeverityStyle } from '../utils';

interface HeaderProps {
  iconColor: string;
  selectedAlert: Alert;
  styles: Record<string, ViewStyle>;
  headerAccessory?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ selectedAlert, iconColor, styles, headerAccessory }) => (
  <>
    {headerAccessory ?? <View style={styles.iconWrapper}>
      <Icon
        name={selectedAlert.severity === Severity.Info ? IconName.Info : IconName.Danger}
        size={IconSize.Xl}
        color={iconColor}
        testID="alert-modal-icon"
      />
    </View>
    }
    <View style={styles.headerContainer}>
      <Text style={styles.headerText} variant={TextVariant.BodyMDBold}>
        {selectedAlert.title ?? strings('alert_system.alert_modal.title')}
      </Text>
    </View>
  </>
);

interface ContentProps {
  backgroundColor: string;
  selectedAlert: Alert;
  styles: Record<string, ViewStyle>;
}

const Content: React.FC<ContentProps> = ({ backgroundColor, selectedAlert, styles }) => (
  <View style={[styles.content, { backgroundColor }]}>
    {selectedAlert.content ?? (
      <>
        <Text style={styles.message}>{selectedAlert.message}</Text>
        {selectedAlert.alertDetails && (
          <>
            <Text style={styles.message} variant={TextVariant.BodyMDBold}>
              {strings('alert_system.alert_modal.alert_details')}
            </Text>
            {selectedAlert.alertDetails.map((detail, index) => (
              <Text key={`details-${index}`} style={styles.detailsText} variant={TextVariant.BodyMD}>
                {'• ' + detail}
              </Text>
            ))}
          </>
        )}
      </>
    )}
  </View>
);

interface CheckboxProps {
  isConfirmed: boolean;
  onCheckboxClick: (isConfirmed: boolean) => void;
  selectedAlert: Alert;
  styles: Record<string, ViewStyle>;
}

const AlertCheckbox: React.FC<CheckboxProps> = ({ selectedAlert, isConfirmed, onCheckboxClick, styles }) => {
  if (selectedAlert.severity !== Severity.Danger || selectedAlert.isBlocking) {
    return null;
  }

  return (
    <View style={styles.checkboxContainer}>
      <Checkbox
        isChecked={isConfirmed}
        onPress={() => onCheckboxClick(isConfirmed)}
        label={strings('alert_system.alert_modal.checkbox_label')}
        style={styles.checkboxLabel}
      />
    </View>
  );
};

interface ButtonsProps {
  action?: { label: string; callback: () => void };
  hideAlertModal: () => void;
  onHandleActionClick: (callback: () => void) => void;
  styles: Record<string, ViewStyle>;
}

const Buttons: React.FC<ButtonsProps> = ({ hideAlertModal, action, styles, onHandleActionClick }) => (
  <View style={styles.buttonsContainer}>
    <Button
      onPress={hideAlertModal}
      label={strings('alert_system.alert_modal.got_it_btn')}
      style={styles.footerButton}
      size={ButtonSize.Lg}
      variant={action ? ButtonVariants.Secondary : ButtonVariants.Primary}
      width={ButtonWidthTypes.Full}
    />
    {action ? (
      <>
        <View style={styles.buttonDivider} />
        <Button
          onPress={() => onHandleActionClick(action.callback)}
          label={action.label}
          style={styles.footerButton}
          size={ButtonSize.Lg}
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
        />
      </>
    ) : null}
  </View>
);

interface AlertModalProps {
  headerAccessory?: React.ReactNode;
  onAcknowledgeClick?: () => void;
}

const AlertModal: React.FC<AlertModalProps> = ({headerAccessory, onAcknowledgeClick}) => {
  const { colors } = useTheme();
  const styles = (useStyles(styleSheet, {})).styles as Record<string, ViewStyle>;
  const { hideAlertModal, alertModalVisible, fieldAlerts, alertKey } = useAlerts();
  const { isAlertConfirmed, setAlertConfirmed } = useAlertsConfirmed(fieldAlerts);

  const handleClose = useCallback(
    () => {
      if (onAcknowledgeClick) {
        onAcknowledgeClick();
        return;
      }
      hideAlertModal();
    },
    [hideAlertModal, onAcknowledgeClick],
  );

  const handleCheckboxClick = useCallback(
    (selectedAlertKey: string, isConfirmed: boolean) => {
      setAlertConfirmed(selectedAlertKey, !isConfirmed);
    },
    [setAlertConfirmed],
  );

  const handleActionClick = useCallback(
    (callback: () => void) => {
      callback();
      hideAlertModal();
    },
    [hideAlertModal],
  );

  const selectedAlert = fieldAlerts.find((alertSelected: Alert) => alertSelected.key === alertKey);

  if (!alertModalVisible || !selectedAlert) {
    return null;
  }

  const isConfirmed = isAlertConfirmed(selectedAlert.key);
  const severityStyle = getSeverityStyle(selectedAlert.severity, colors);

  return (
    <BottomModal onClose={hideAlertModal}>
      <View style={styles.modalContainer}>
        <Header
          selectedAlert={selectedAlert}
          iconColor={severityStyle.icon}
          styles={styles}
          headerAccessory={headerAccessory}
        />
        <View>
          <Content
            backgroundColor={severityStyle.background}
            selectedAlert={selectedAlert}
            styles={styles}
          />
          <AlertCheckbox
            selectedAlert={selectedAlert}
            isConfirmed={isConfirmed}
            onCheckboxClick={() => handleCheckboxClick(selectedAlert.key, isConfirmed)}
            styles={styles}
          />
        </View>
        <Buttons
          hideAlertModal={handleClose}
          action={selectedAlert.action}
          styles={styles}
          onHandleActionClick={handleActionClick}
        />
      </View>
    </BottomModal>
  );
};

export default AlertModal;
