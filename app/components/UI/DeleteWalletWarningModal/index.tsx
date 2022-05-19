import React from 'react';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { createStyles } from './styles';
import WarningExistingUserModal from '../WarningExistingUserModal';
import { strings } from '../../../../locales/i18n';
import { DELETE_WALLET_CONTAINER_ID } from '../../../constants/test-ids';
import { useTheme } from '../../../util/theme';

interface IDeleteWalletModalProps {
  modalVisible: boolean;
  onCancelPress: () => null;
  onRequestClose: () => null;
  onConfirmPress: () => null;
}

const DeleteWalletWarningModal = ({
  modalVisible,
  onCancelPress,
  onRequestClose,
  onConfirmPress,
}: IDeleteWalletModalProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <WarningExistingUserModal
      warningModalVisible={modalVisible}
      cancelText={strings('login.i_understand')}
      onCancelPress={onCancelPress}
      onRequestClose={onRequestClose}
      onConfirmPress={onConfirmPress}
    >
      <View style={styles.areYouSure} testID={DELETE_WALLET_CONTAINER_ID}>
        <Icon
          style={styles.warningIcon}
          size={46}
          color={colors.error.default}
          name="exclamation-triangle"
        />
        <Text style={[styles.heading, styles.red]}>
          {strings('login.are_you_sure')}
        </Text>
        <Text style={styles.warningText}>
          <Text>{strings('login.your_current_wallet')}</Text>
          <Text style={styles.bold}>{strings('login.removed_from')}</Text>
          <Text>{strings('login.this_action')}</Text>
        </Text>
        <Text style={[styles.warningText]}>
          <Text>{strings('login.you_can_only')}</Text>
          <Text style={styles.bold}>{strings('login.recovery_phrase')}</Text>
          <Text>{strings('login.metamask_does_not')}</Text>
        </Text>
      </View>
    </WarningExistingUserModal>
  );
};

export default React.memo(DeleteWalletWarningModal);
