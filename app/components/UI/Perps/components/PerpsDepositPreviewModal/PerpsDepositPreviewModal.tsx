import React, { useCallback } from 'react';
import { View, SafeAreaView } from 'react-native';
import Modal from 'react-native-modal';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconColor,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import ButtonIcon from '../../../../../component-library/components/Buttons/ButtonIcon';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import type { PerpsToken } from '../PerpsTokenSelector';
import { createStyles } from './PerpsDepositPreviewModal.styles';

interface PerpsDepositPreviewModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: string;
  selectedToken: PerpsToken;
  tokenAmount: string;
  networkFee: string;
  estimatedTime: string;
  isLoading?: boolean;
  error?: string | null;
}

const PerpsDepositPreviewModal: React.FC<PerpsDepositPreviewModalProps> = ({
  isVisible,
  onClose,
  onConfirm,
  amount,
  selectedToken,
  tokenAmount,
  networkFee,
  estimatedTime,
  isLoading = false,
  error = null,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      propagateSwipe
      swipeDirection="down"
      onSwipeComplete={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <Icon
                name={IconName.Wallet}
                size={IconSize.Lg}
                color={IconColor.Inverse}
              />
            </View>

            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Muted}
              style={styles.depositingLabel}
            >
              {strings('perps.deposit.title').toUpperCase()}
            </Text>

            <Text variant={TextVariant.HeadingLG} style={styles.amountText}>
              {amount} {selectedToken.symbol}
            </Text>
          </View>
          <ButtonIcon
            iconName={IconName.Close}
            onPress={onClose}
            iconColor={IconColor.Default}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {error && (
            <View style={styles.errorContainer}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
                {error}
              </Text>
            </View>
          )}

          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text variant={TextVariant.BodyMD} style={styles.detailLabel}>
                {strings('perps.deposit.payWith')}
              </Text>
              <Text variant={TextVariant.BodyMD} style={styles.detailValue}>
                {tokenAmount} {selectedToken.symbol}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text variant={TextVariant.BodyMD} style={styles.detailLabel}>
                {strings('perps.deposit.networkFee')}
              </Text>
              <Text variant={TextVariant.BodyMD} style={styles.detailValue}>
                {networkFee}
              </Text>
            </View>

            <View style={[styles.detailRow, styles.lastDetailRow]}>
              <Text variant={TextVariant.BodyMD} style={styles.detailLabel}>
                {strings('perps.deposit.estimatedTime')}
              </Text>
              <Text variant={TextVariant.BodyMD} style={styles.detailValue}>
                {estimatedTime}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.buttonContainer}>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={
              isLoading
                ? strings('perps.deposit.confirming')
                : strings('perps.deposit.confirmDeposit')
            }
            onPress={handleConfirm}
            disabled={isLoading}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default PerpsDepositPreviewModal;
