import PropTypes from 'prop-types';
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  TextInput,
} from 'react-native';
import React from 'react';
import ActionModal from '../../UI/ActionModal';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../component-library/components/Icons/Icon';

const createStyles = (colors) =>
  StyleSheet.create({
    hintWrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
      borderRadius: 16,
      padding: 24,
    },
    hintHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    balancingSpace: {
      width: 24,
    },
    recovery: {
      flex: 1,
      textAlign: 'center',
    },
    leaveHint: {
      marginBottom: 16,
    },
    noSeedphrase: {
      marginBottom: 16,
    },
    hintInput: {
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border.default,
      padding: 16,
      minHeight: 76,
      paddingTop: 16,
      color: colors.text.default,
    },
  });

const HintModal = ({
  onCancel,
  onConfirm,
  modalVisible,
  onRequestClose,
  value,
  onChangeText,
}) => {
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);

  return (
    <ActionModal
      confirmText={strings('manual_backup_step_3.save')}
      confirmButtonMode={'confirm'}
      onCancelPress={onCancel}
      onConfirmPress={onConfirm}
      modalVisible={modalVisible}
      onRequestClose={onRequestClose}
    >
      <TouchableWithoutFeedback onPress={onRequestClose} accessible={false}>
        <View style={styles.hintWrapper}>
          <View style={styles.hintHeader}>
            <View style={styles.balancingSpace} />
            <Text variant={TextVariant.HeadingMD} style={styles.recovery}>
              {strings('manual_backup_step_3.recovery_hint')}
            </Text>
            <ButtonIcon iconName={IconName.Close} onPress={onCancel} />
          </View>
          <Text variant={TextVariant.BodyMD} style={styles.leaveHint}>
            {strings('manual_backup_step_3.leave_hint')}
          </Text>
          <Text
            variant={TextVariant.BodyMD}
            style={styles.noSeedphrase}
            color={TextColor.Error}
          >
            {strings('manual_backup_step_3.no_seedphrase')}
          </Text>
          <TextInput
            style={styles.hintInput}
            value={value}
            placeholder={strings('manual_backup_step_3.example')}
            onChangeText={onChangeText}
            placeholderTextColor={colors.text.muted}
            multiline
            textAlignVertical={'top'}
            keyboardAppearance={themeAppearance}
          />
        </View>
      </TouchableWithoutFeedback>
    </ActionModal>
  );
};

const propTypes = {
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  modalVisible: PropTypes.bool.isRequired,
  onRequestClose: PropTypes.func.isRequired,
  value: PropTypes.string,
  onChangeText: PropTypes.func.isRequired,
};
const defaultProps = {
  modalVisible: false,
};

HintModal.propTypes = propTypes;
HintModal.defaultProps = defaultProps;

export default HintModal;
