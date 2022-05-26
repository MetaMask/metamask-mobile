import React from 'react';
import ActionModal from '../../UI/ActionModal';
import Icon from 'react-native-vector-icons/FontAwesome';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { strings } from '../../../../locales/i18n';
// eslint-disable-next-line import/no-unresolved
import CheckBox from '@react-native-community/checkbox';
import FeatherIcon from 'react-native-vector-icons/Feather';
import PropTypes from 'prop-types';
import { fontStyles } from '../../../styles/common';
import { useAppThemeFromContext, mockTheme } from '../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    imageWarning: {
      alignSelf: 'center',
      color: colors.error.default,
    },
    modalNoBorder: {
      borderTopWidth: 0,
    },
    skipTitle: {
      fontSize: 24,
      marginTop: 12,
      marginBottom: 16,
      color: colors.text.default,
      textAlign: 'center',
      ...fontStyles.bold,
    },
    skipModalContainer: {
      flex: 1,
      margin: 24,
      flexDirection: 'column',
    },
    skipModalXButton: {
      alignItems: 'flex-end',
    },
    skipModalXIcon: {
      fontSize: 16,
      color: colors.text.default,
    },
    skipModalActionButtons: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    skipModalCheckbox: {
      height: 18,
      width: 18,
      marginRight: 12,
      marginTop: 3,
    },
    skipModalText: {
      flex: 1,
      ...fontStyles.normal,
      lineHeight: 20,
      fontSize: 14,
      paddingHorizontal: 10,
      color: colors.text.default,
    },
  });

const SkipAccountSecurityModal = ({
  modalVisible,
  onConfirm,
  onCancel,
  onPress,
  toggleSkipCheckbox,
  skipCheckbox,
}) => {
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles(colors);

  return (
    <ActionModal
      confirmText={strings('account_backup_step_1.skip_button_confirm')}
      cancelText={strings('account_backup_step_1.skip_button_cancel')}
      confirmButtonMode={'confirm'}
      cancelButtonMode={'normal'}
      displayCancelButton
      modalVisible={modalVisible}
      actionContainerStyle={styles.modalNoBorder}
      onCancelPress={onCancel}
      confirmDisabled={!skipCheckbox}
      onConfirmPress={onConfirm}
    >
      <View style={styles.skipModalContainer}>
        {onPress && (
          <TouchableOpacity
            onPress={onPress}
            style={styles.skipModalXButton}
            hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
          >
            <Icon name="times" style={styles.skipModalXIcon} />
          </TouchableOpacity>
        )}
        <FeatherIcon
          name="alert-triangle"
          size={38}
          style={styles.imageWarning}
          testID={'skip_backup_warning'}
        />
        <Text style={styles.skipTitle}>
          {strings('account_backup_step_1.skip_title')}
        </Text>
        <View
          style={styles.skipModalActionButtons}
          testID={'skip-backup-modal'}
        >
          <CheckBox
            style={styles.skipModalCheckbox}
            value={skipCheckbox}
            onValueChange={toggleSkipCheckbox}
            boxType={'square'}
            tintColors={{
              true: colors.primary.default,
              false: colors.border.default,
            }}
            testID={'skip-backup-check'}
          />
          <Text
            onPress={toggleSkipCheckbox}
            style={styles.skipModalText}
            testID={'skip-backup-text'}
          >
            {strings('account_backup_step_1.skip_check')}
          </Text>
        </View>
      </View>
    </ActionModal>
  );
};

const propTypes = {
  modalVisible: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onPress: PropTypes.func,
  toggleSkipCheckbox: PropTypes.func.isRequired,
  skipCheckbox: PropTypes.bool.isRequired,
};

const defaultProps = {
  modalVisible: false,
  skipCheckbox: false,
};

SkipAccountSecurityModal.propTypes = propTypes;
SkipAccountSecurityModal.defaultProps = defaultProps;

export default SkipAccountSecurityModal;
