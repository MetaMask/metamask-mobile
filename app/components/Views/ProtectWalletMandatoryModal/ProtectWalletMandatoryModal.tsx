import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import Modal from 'react-native-modal';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { useTheme } from '../../../util/theme';
import StyledButton from '../../UI/StyledButton';
import { strings } from '../../../../locales/i18n';
import createStyles from './ProtectWalletMandatoryModal.styles';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import { selectPasswordSet } from '../../../reducers/user';
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';

interface ProtectWalletMandatoryModalProps {
  onClose: () => void;
  onSecureWallet: () => void;
}

const ProtectWalletMandatoryModal: React.FC<
  ProtectWalletMandatoryModalProps
> = ({ onClose, onSecureWallet }) => {
  const [showProtectWalletModal, setShowProtectWalletModal] = useState(false);

  const theme = useTheme();

  const styles = useMemo(() => createStyles(theme), [theme]);

  const metrics = useMetrics();

  const passwordSet = useSelector(selectPasswordSet);

  useEffect(() => {
    // valid if passwordSet is still needed to check here
    if (Engine.hasFunds() || !passwordSet) {
      // eslint-disable-next-line react/no-did-update-set-state
      setShowProtectWalletModal(true);

      metrics.trackEvent(
        metrics
          .createEventBuilder(MetaMetricsEvents.WALLET_SECURITY_PROTECT_VIEWED)
          .addProperties({
            wallet_protection_required: false,
            source: 'Backup Alert',
          })
          .build(),
      );
    } else {
      setShowProtectWalletModal(false);
    }
  }, [metrics, passwordSet]);

  return (
    <Modal
      isVisible={showProtectWalletModal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.bottomModal}
      backdropColor={theme.colors.overlay.default}
      backdropOpacity={1}
      animationInTiming={600}
      animationOutTiming={600}
      onBackdropPress={onClose}
    >
      <View style={styles.protectWalletContainer}>
        <View style={styles.protectWalletIconContainer}>
          <FeatherIcon
            style={styles.protectWalletIcon}
            name="alert-triangle"
            size={20}
          />
        </View>
        <Text style={styles.protectWalletTitle}>
          {strings('protect_your_wallet_modal.title')}
        </Text>
        <Text style={styles.protectWalletContent}>
          {!passwordSet
            ? strings('protect_your_wallet_modal.body_for_password')
            : strings('protect_your_wallet_modal.body_for_seedphrase')}
        </Text>
        <View style={styles.protectWalletButtonWrapper}>
          <StyledButton type="confirm" onPress={onSecureWallet}>
            {strings('protect_your_wallet_modal.button')}
          </StyledButton>
        </View>
      </View>
    </Modal>
  );
};

export default ProtectWalletMandatoryModal;
