import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import { useAlerts } from '../context';
import BottomModal from '../../components/UI/BottomModal';
import Button, { ButtonSize, ButtonVariants, ButtonWidthTypes } from '../../../../../component-library/components/Buttons/Button';
import Checkbox from '../../../../../component-library/components/Checkbox';
import Icon, { IconName, IconSize } from '../../../../../component-library/components/Icons/Icon';
import { Alert, Severity } from '../../types/confirm-alerts';
import Text, { TextVariant } from '../../../../../component-library/components/Texts/Text';
import { ThemeColors } from '@metamask/design-tokens';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './AlertModal.styles';
import { strings } from '../../../../../../locales/i18n';

const getSeverityStyle = (severity: Severity, colors: ThemeColors) => {
  switch (severity) {
    case Severity.Warning:
      return {
        background: colors.warning.muted,
        icon: colors.warning.default,
      };
    case Severity.Danger:
      return {
        background: colors.error.muted,
        icon: colors.error.default,
      };
    default:
      return {
        background: colors.background.default,
        icon: colors.info.default,
      };
  }
};

const AlertModal = (
) => {
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, { theme: colors });
  const { isAlertConfirmed, setAlertConfirmed, alerts, hideAlertModal, alertKey, alertModalVisible } = useAlerts();

  const handleActionClick = useCallback(
    (callback: () => void ) => {
      callback();
      hideAlertModal();
    },
    [hideAlertModal],
  );

  const handleClose = useCallback(
    () => {
      hideAlertModal();
    },
    [hideAlertModal],
  );

  const handleCheckboxClick = useCallback((selectedAlertKey: string, isConfirmed: boolean) => {
    setAlertConfirmed(selectedAlertKey, !isConfirmed);
  }, [setAlertConfirmed]);

  const selectedAlert = alerts.find((alertSelected: Alert) => alertSelected.key === alertKey);

  if (!alertModalVisible || !selectedAlert) {
    return null;
  }

  const isConfirmed = isAlertConfirmed(selectedAlert.key);
  const severityStyle = getSeverityStyle(selectedAlert.severity, colors);

  return (
    <BottomModal onClose={handleClose}>
      <View style={styles.modalContainer}>
        {/* header */}
        <View style={styles.iconWrapper}>
            <Icon
              name={selectedAlert.severity === Severity.Info ? IconName.Info : IconName.Danger}
              size={IconSize.Xl}
              color={severityStyle.icon}
              testID="alert-modal-icon"
            />
          </View>
        {/* title */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerText} variant={TextVariant.BodyMDBold}>
            {selectedAlert.title ?? strings('alert_system.alert_modal.title')}
          </Text>
        </View>
        <View/>
        <View>
        {/* content */}
        <View style={styles.content}>
          {selectedAlert.content ? (
            selectedAlert.content
          ) : (
            <>
              <Text style={styles.message}>
                {selectedAlert.message}
              </Text>

              <Text style={styles.message} variant={TextVariant.BodyMDBold}>
                {strings('alert_system.alert_modal.alert_details')}
              </Text>
              {selectedAlert.alertDetails?.map((detail, index) => (
                <Text key={index} style={styles.detailsText} variant={TextVariant.BodyMD}>
                  {'• ' + detail}
                </Text>
              ))}
            </>
          )}
        </View>
          {/* checkbox */}
          <View style={[styles.checkboxContainer]}>
              <Checkbox
                isChecked={isConfirmed}
                onPressIn={() => handleCheckboxClick(selectedAlert.key, isConfirmed)}
                label={strings('alert_system.alert_modal.checkbox_label')}
                style={styles.checkboxLabel}

              />
          </View>
        </View>
        {/* buttons */}
        <View style={styles.buttonsContainer}>
            <Button
              onPress={hideAlertModal}
              label={strings('alert_system.alert_modal.got_it_btn')}
              style={styles.footerButton}
              size={ButtonSize.Lg}
              variant={ButtonVariants.Primary}
              width={ButtonWidthTypes.Full}
              disabled={!isConfirmed}
            />
          {selectedAlert.actions?.map((action) => (
            <Button
              key={action.label}
              onPress={() => handleActionClick(action.callback)}
              label={action.label}
              style={styles.footerButton}
              size={ButtonSize.Lg}
              variant={ButtonVariants.Secondary}
              width={ButtonWidthTypes.Full}
            />
          ))}
        </View>
      </View>
    </BottomModal>
  );
};

export default AlertModal;
