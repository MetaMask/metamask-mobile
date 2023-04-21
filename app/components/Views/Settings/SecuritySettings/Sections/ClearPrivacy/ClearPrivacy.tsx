import React, { useState } from 'react';
import { View } from 'react-native';
import { styleSheet } from './styles';
import Engine from '../../../../../../core/Engine';
import StyledButton from '../../../../../UI/StyledButton';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import ActionModal from '../../../../../UI/ActionModal';
import { strings } from '../../../../../../../locales/i18n';

const ClearPrivacy = () => {
  const { styles } = useStyles(styleSheet, {});

  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const clearApprovals = () => {
    const { PermissionController } = Engine.context as any;
    PermissionController?.clearState?.();
    setModalVisible(false);
  };

  const approvalModal = () => (
    <ActionModal
      modalVisible={modalVisible}
      confirmText={strings('app_settings.clear')}
      cancelText={strings('app_settings.reset_account_cancel_button')}
      onCancelPress={() => setModalVisible(false)}
      onRequestClose={() => setModalVisible(false)}
      onConfirmPress={clearApprovals}
    >
      <View style={styles.modalView}>
        <Text style={styles.modalTitle}>
          {strings('app_settings.clear_approvals_modal_title')}
        </Text>
        <Text style={styles.modalText}>
          {strings('app_settings.clear_approvals_modal_message')}
        </Text>
      </View>
    </ActionModal>
  );

  return (
    <View style={[styles.setting]} testID={'clear-privacy-section'}>
      <Text style={styles.title}>
        {strings('app_settings.clear_privacy_title')}
      </Text>
      <Text style={styles.desc}>
        {strings('app_settings.clear_privacy_desc')}
      </Text>
      <StyledButton
        type="normal"
        onPress={() => setModalVisible(true)}
        containerStyle={styles.confirm}
      >
        {strings('app_settings.clear_privacy_title')}
      </StyledButton>
      {approvalModal()}
    </View>
  );
};

export default ClearPrivacy;
