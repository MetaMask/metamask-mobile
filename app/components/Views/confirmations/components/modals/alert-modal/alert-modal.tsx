import React, { useCallback, useEffect } from 'react';
import { TouchableOpacity, View, ViewStyle } from 'react-native';
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
import { Alert, Severity } from '../../../types/alerts';
import { getSeverityStyle } from '../../../utils/alert-system';
import { strings } from '../../../../../../../locales/i18n';
import { useAlerts } from '../../../context/alert-system-context';
import { useConfirmationAlertMetrics } from '../../../hooks/metrics/useConfirmationAlertMetrics';
import { useStyles } from '../../../../../hooks/useStyles';
import { useTheme } from '../../../../../../util/theme';
import styleSheet from './alert-modal.styles';

interface HeaderProps {
  iconColor: string;
  selectedAlert: Alert;
  styles: Record<string, ViewStyle>;
  headerAccessory?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
  selectedAlert,
  iconColor,
  styles,
  headerAccessory,
}) => (
  <>
    {headerAccessory ?? (
      <View style={styles.iconWrapper}>
        <Icon
          name={
            selectedAlert.severity === Severity.Info
              ? IconName.Info
              : IconName.Danger
          }
          size={IconSize.Xl}
          color={iconColor}
          testID="alert-modal-icon"
        />
      </View>
    )}
    <View style={styles.headerContainer}>
      {/* @ts-expect-error - React Native style type mismatch due to outdated @types/react-native */}
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

const Content: React.FC<ContentProps> = ({
  backgroundColor,
  selectedAlert,
  styles,
}) => (
  <View style={[styles.content, { backgroundColor }]}>
    {selectedAlert.content ?? (
      <>
        {typeof selectedAlert.message === 'string' ? (
          // @ts-expect-error - React Native style type mismatch due to outdated @types/react-native
          // See: https://github.com/MetaMask/metamask-mobile/pull/18956#discussion_r2316407382
          <Text style={styles.message}>{selectedAlert.message}</Text>
        ) : (
          selectedAlert.message
        )}
        {selectedAlert.alertDetails && (
          <>
            <Text
              // @ts-expect-error - React Native style type mismatch due to outdated @types/react-native
              // See: https://github.com/MetaMask/metamask-mobile/pull/18956#discussion_r2316407382
              style={styles.message}
              variant={TextVariant.BodyMDBold}
            >
              {strings('alert_system.alert_modal.alert_details')}
            </Text>
            {selectedAlert.alertDetails.map((detail, index) => (
              <Text
                key={`details-${index}`}
                // @ts-expect-error - React Native style type mismatch due to outdated @types/react-native
                // See: https://github.com/MetaMask/metamask-mobile/pull/18956#discussion_r2316407382
                style={styles.detailsText}
                variant={TextVariant.BodyMD}
              >
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

const AlertCheckbox: React.FC<CheckboxProps> = ({
  selectedAlert,
  isConfirmed,
  onCheckboxClick,
  styles,
}) => {
  if (selectedAlert.severity !== Severity.Danger || selectedAlert.isBlocking) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.checkboxContainer}
      onPress={() => onCheckboxClick(isConfirmed)}
      activeOpacity={1}
    >
      <Checkbox
        onPress={() => onCheckboxClick(isConfirmed)}
        isChecked={isConfirmed}
        testID="alert-modal-checkbox"
      />
      {/* @ts-expect-error - React Native style type mismatch due to outdated @types/react-native See: https://github.com/MetaMask/metamask-mobile/pull/18956#discussion_r2316407382 */}
      <Text style={styles.checkboxText}>
        {strings('alert_system.confirm_modal.checkbox_label')}
      </Text>
    </TouchableOpacity>
  );
};

interface ButtonsProps {
  action?: { label: string; callback: () => void };
  hideAlertModal: () => void;
  onHandleActionClick: (callback: () => void) => void;
  styles: Record<string, ViewStyle>;
  isConfirmed: boolean;
}

const Buttons: React.FC<ButtonsProps> = ({
  hideAlertModal,
  action,
  styles,
  onHandleActionClick,
  isConfirmed,
}) => (
  <View style={styles.buttonsContainer}>
    <Button
      onPress={hideAlertModal}
      label={strings('alert_system.alert_modal.got_it_btn')}
      style={styles.footerButton}
      size={ButtonSize.Lg}
      variant={action ? ButtonVariants.Secondary : ButtonVariants.Primary}
      width={ButtonWidthTypes.Full}
      isDisabled={!isConfirmed}
      testID="alert-modal-got-it-button"
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

const AlertModal: React.FC<AlertModalProps> = ({
  headerAccessory,
  onAcknowledgeClick,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(styleSheet, {}).styles as Record<string, ViewStyle>;
  const {
    hideAlertModal,
    alertModalVisible,
    fieldAlerts,
    alertKey,
    isAlertConfirmed,
    setAlertConfirmed,
  } = useAlerts();
  const { trackAlertRendered } = useConfirmationAlertMetrics();

  useEffect(() => {
    if (alertModalVisible) {
      trackAlertRendered();
    }
  }, [alertModalVisible, trackAlertRendered]);

  const handleClose = useCallback(() => {
    if (onAcknowledgeClick) {
      onAcknowledgeClick();
      return;
    }
    hideAlertModal();
  }, [hideAlertModal, onAcknowledgeClick]);

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

  const selectedAlert = fieldAlerts.find(
    (alertSelected: Alert) => alertSelected.key === alertKey,
  );

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
            onCheckboxClick={() =>
              handleCheckboxClick(selectedAlert.key, isConfirmed)
            }
            styles={styles}
          />
        </View>
        <Buttons
          hideAlertModal={handleClose}
          action={selectedAlert.action}
          styles={styles}
          onHandleActionClick={handleActionClick}
          isConfirmed={selectedAlert.isBlocking ? isConfirmed : true}
        />
      </View>
    </BottomModal>
  );
};

export default AlertModal;
