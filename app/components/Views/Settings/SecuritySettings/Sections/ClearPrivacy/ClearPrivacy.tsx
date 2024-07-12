import React, { useState } from 'react';
import { View } from 'react-native';
import { styleSheet } from './styles';
import Engine from '../../../../../../core/Engine';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import ActionModal from '../../../../../UI/ActionModal';
import { strings } from '../../../../../../../locales/i18n';
import { CLEAR_PRIVACY_SECTION } from '../../SecuritySettings.constants';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import SDKConnect from '../../../../../../../app/core/SDKConnect/SDKConnect';

const ClearPrivacy = () => {
  const { styles } = useStyles(styleSheet, {});

  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const clearApprovals = () => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { PermissionController } = Engine.context as any;
    PermissionController?.clearState?.();
    SDKConnect.getInstance().removeAll();
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
        <Text variant={TextVariant.HeadingMD} style={styles.modalTitle}>
          {strings('app_settings.clear_approvals_modal_title')}
        </Text>
        <Text style={styles.modalText}>
          {strings('app_settings.clear_approvals_modal_message')}
        </Text>
      </View>
    </ActionModal>
  );

  return (
    <View style={[styles.setting]} testID={CLEAR_PRIVACY_SECTION}>
      <Text variant={TextVariant.BodyLGMedium}>
        {strings('app_settings.clear_privacy_title')}
      </Text>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.desc}
      >
        {strings('app_settings.clear_privacy_desc')}
      </Text>
      <View style={styles.accessory}>
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('app_settings.clear_privacy_title')}
          onPress={() => setModalVisible(true)}
        />
      </View>
      {approvalModal()}
    </View>
  );
};

export default ClearPrivacy;
