import {
  useNavigation,
  useRoute,
  type NavigationProp,
} from '@react-navigation/native';
import type { PerpsNavigationParamList } from '../controllers/types';
import React, { useCallback } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';

interface DepositSuccessParams {
  amount: string;
  selectedToken: string;
  txHash?: string;
  processingTime?: number;
}

interface PerpsDepositSuccessViewProps {}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    successContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    successIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.success.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    successTitle: {
      textAlign: 'center',
      marginBottom: 8,
    },
    successAmount: {
      textAlign: 'center',
      fontSize: 24,
      fontWeight: '600',
      marginBottom: 16,
    },
    successDescription: {
      textAlign: 'center',
      marginBottom: 32,
    },
    infoContainer: {
      backgroundColor: colors.background.alternative,
      padding: 16,
      borderRadius: 8,
      width: '100%',
      marginBottom: 32,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    infoLabel: {
      flex: 1,
    },
    infoValue: {
      flex: 1,
      textAlign: 'right',
    },
    actionContainer: {
      width: '100%',
      marginTop: 'auto',
      paddingBottom: 32,
    },
    primaryButton: {
      marginBottom: 16,
    },
  });

const PerpsDepositSuccessView: React.FC<PerpsDepositSuccessViewProps> = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route = useRoute();
  // No PerpsController needed - balance refresh handled by PerpsView

  const params = route.params as DepositSuccessParams;
  const { amount, selectedToken, txHash, processingTime } = params || {};

  // No manual refresh needed - PerpsView automatically refreshes HyperLiquid
  // account state when navigated back to it

  const handleViewBalance = useCallback(() => {
    DevLogger.log('PerpsDepositSuccess: Navigating back to Perps view', {
      amount,
      selectedToken,
      txHash,
      timestamp: new Date().toISOString(),
    });

    // Navigate back to main Perps view - it will auto-refresh HyperLiquid balance
    navigation.navigate('Perps');
  }, [navigation, amount, selectedToken, txHash]);

  const handleViewTransaction = useCallback(() => {
    DevLogger.log('PerpsDepositSuccess: View transaction requested', {
      txHash,
      timestamp: new Date().toISOString(),
    });

    // In real implementation, open blockchain explorer
    // For now, just log the action
  }, [txHash]);

  const formatProcessingTime = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon and Text */}
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Icon
              name={IconName.Check}
              size={IconSize.Xl}
              color={IconColor.Inverse}
            />
          </View>

          <Text variant={TextVariant.HeadingLG} style={styles.successTitle}>
            {strings('perps.deposit.success.title')}
          </Text>

          <Text style={styles.successAmount}>
            {amount} {selectedToken}
          </Text>

          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Muted}
            style={styles.successDescription}
          >
            {strings('perps.deposit.success.description')}
          </Text>
        </View>

        {/* Transaction Info */}
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Muted}
              style={styles.infoLabel}
            >
              {strings('perps.deposit.success.amount')}
            </Text>
            <Text variant={TextVariant.BodyMD} style={styles.infoValue}>
              {amount} {selectedToken}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Muted}
              style={styles.infoLabel}
            >
              {strings('perps.deposit.success.processingTime')}
            </Text>
            <Text variant={TextVariant.BodyMD} style={styles.infoValue}>
              {formatProcessingTime(processingTime)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Muted}
              style={styles.infoLabel}
            >
              {strings('perps.deposit.success.status')}
            </Text>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Success}
              style={styles.infoValue}
            >
              {strings('perps.deposit.success.completed')}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('perps.deposit.success.viewBalance')}
            onPress={handleViewBalance}
            style={styles.primaryButton}
            testID="view-balance-button"
          />

          {txHash && (
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={strings('perps.deposit.success.viewTransaction')}
              onPress={handleViewTransaction}
              testID="view-transaction-button"
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PerpsDepositSuccessView;
