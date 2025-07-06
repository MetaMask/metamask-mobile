import React, { useCallback } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import Modal from 'react-native-modal';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconColor,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import ButtonIcon from '../../../../component-library/components/Buttons/ButtonIcon';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import type { PerpsToken } from './PerpsTokenSelector';

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

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    modal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    container: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '80%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    iconContainer: {
      alignItems: 'center',
      flex: 1,
    },
    iconBackground: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    depositingLabel: {
      textAlign: 'center',
      marginBottom: 4,
    },
    amountText: {
      textAlign: 'center',
      fontSize: 32,
      fontWeight: '600',
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 16,
    },
    errorContainer: {
      padding: 16,
      backgroundColor: colors.error.muted,
      borderRadius: 8,
      marginBottom: 16,
    },
    detailsContainer: {
      paddingVertical: 16,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    lastDetailRow: {
      borderBottomWidth: 0,
    },
    detailLabel: {
      fontSize: 16,
    },
    detailValue: {
      fontSize: 16,
      fontWeight: '500',
    },
    buttonContainer: {
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
  });

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
              DEPOSITING
            </Text>

            <Text
              variant={TextVariant.HeadingLG}
              style={styles.amountText}
            >
              {amount} USDC
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
              <Text
                variant={TextVariant.BodyMD}
                style={styles.detailLabel}
              >
                Pay with
              </Text>
              <Text
                variant={TextVariant.BodyMD}
                style={styles.detailValue}
              >
                {tokenAmount} {selectedToken.symbol}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text
                variant={TextVariant.BodyMD}
                style={styles.detailLabel}
              >
                Network fee
              </Text>
              <Text
                variant={TextVariant.BodyMD}
                style={styles.detailValue}
              >
                {networkFee}
              </Text>
            </View>

            <View style={[styles.detailRow, styles.lastDetailRow]}>
              <Text
                variant={TextVariant.BodyMD}
                style={styles.detailLabel}
              >
                Estimated time
              </Text>
              <Text
                variant={TextVariant.BodyMD}
                style={styles.detailValue}
              >
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
            label={isLoading ? 'Confirming...' : 'Confirm deposit'}
            onPress={handleConfirm}
            disabled={isLoading}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default PerpsDepositPreviewModal;
