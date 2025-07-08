import { useNavigation, useRoute, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes
} from '../../../../component-library/components/Buttons/Button';
import ButtonIcon from '../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant
} from '../../../../component-library/components/Texts/Text';
import Routes from '../../../../constants/navigation/Routes';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import {
  usePerpsDepositState,
} from '../hooks/usePerpsController';

interface DepositProcessingParams {
  amount: string;
  selectedToken: string;
  txHash?: string;
  isDirectDeposit?: boolean; // true for USDC on Arbitrum, false for complex routes
}

interface DepositProcessingViewProps { }

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    closeButton: {
      width: 24,
      height: 24,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    placeholder: {
      width: 24,
      height: 24,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    statusContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    statusIcon: {
      marginBottom: 24,
    },
    statusText: {
      textAlign: 'center',
      marginBottom: 16,
    },
    progressText: {
      textAlign: 'center',
      marginBottom: 32,
    },
    successContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    successIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.success.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    successTitle: {
      textAlign: 'center',
      marginBottom: 8,
    },
    successDescription: {
      textAlign: 'center',
      marginBottom: 32,
    },
    errorContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    errorIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.error.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    actionButton: {
      width: '100%',
      marginTop: 'auto',
      marginBottom: 32,
    },
    retryButton: {
      marginBottom: 16,
    },
  });

const PerpsDepositProcessingView: React.FC<DepositProcessingViewProps> = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute();
  // No PerpsController needed - balance refresh handled by PerpsView

  // Get reactive state from PerpsController
  const {
    status: depositStatus,
    steps: depositSteps,
    error: depositError,
    currentTxHash,
  } = usePerpsDepositState();

  const { amount, selectedToken, txHash, isDirectDeposit = false } = (route.params as DepositProcessingParams) || {};

  // Use the actual transaction hash from controller if available, otherwise fallback to route param
  const actualTxHash = currentTxHash || txHash;

  // No manual balance refresh needed - PerpsView automatically refreshes
  // HyperLiquid account state when navigated to via useEffect

  // Navigate to success screen when deposit completes successfully
  useEffect(() => {
    if (depositStatus === 'success' && actualTxHash) {
      DevLogger.log('PerpsDepositProcessing: Navigating to success screen', {
        depositStatus,
        actualTxHash,
        amount,
        selectedToken
      });

      // Navigate to success after short delay to show success state
      const timer = setTimeout(() => {
        navigation.navigate(Routes.PERPS.DEPOSIT_SUCCESS, {
          amount,
          selectedToken,
          txHash: actualTxHash,
        });
      }, 2000); // 2 second delay to show success state

      return () => clearTimeout(timer);
    }
  }, [depositStatus, actualTxHash, navigation, amount, selectedToken]);

  const handleClose = useCallback(() => {
    navigation.navigate(Routes.PERPS.ROOT);
  }, [navigation]);

  const handleRetry = useCallback(() => {
    // For now, just navigate back to deposit screen
    navigation.goBack();
  }, [navigation]);

  const handleViewBalance = useCallback(() => {
    navigation.navigate(Routes.PERPS.ROOT);
  }, [navigation]);

  const getStatusContent = () => {
    // Use controller state if available, otherwise fall back to local logic
    const currentStep = depositSteps.currentStep;
    const stepName = depositSteps.stepNames[currentStep - 1];

    switch (depositStatus) {
      case 'preparing':
        return {
          icon: <ActivityIndicator size="large" color={colors.primary.default} testID="processing-animation" />,
          title: strings('perps.deposit.steps.preparing'),
          description: strings('perps.deposit.stepDescriptions.preparing'),
        };
      case 'swapping':
        return {
          icon: <ActivityIndicator size="large" color={colors.primary.default} testID="processing-animation" />,
          title: strings('perps.deposit.steps.swapping', { token: selectedToken || 'token' }),
          description: strings('perps.deposit.stepDescriptions.swapping'),
        };
      case 'bridging':
        return {
          icon: <ActivityIndicator size="large" color={colors.primary.default} testID="processing-animation" />,
          title: strings('perps.deposit.steps.bridging'),
          description: strings('perps.deposit.stepDescriptions.bridging'),
        };
      case 'depositing':
        return {
          icon: <ActivityIndicator size="large" color={colors.primary.default} testID="processing-animation" />,
          title: stepName || strings('perps.deposit.steps.depositing'),
          description: isDirectDeposit
            ? strings('perps.deposit.steps.depositingDirect')
            : strings('perps.deposit.stepDescriptions.depositing'),
        };
      case 'success':
        return {
          icon: (
            <View style={styles.successIcon}>
              <ButtonIcon
                iconName={IconName.Confirmation}
                iconColor={IconColor.Inverse}
                testID="success-checkmark"
              />
            </View>
          ),
          title: strings('perps.deposit.depositCompleted'),
          description: strings('perps.deposit.stepDescriptions.success', { amount }),
        };
      case 'error':
        return {
          icon: (
            <View style={styles.errorIcon}>
              <ButtonIcon
                iconName={IconName.Warning}
                iconColor={IconColor.Inverse}
                testID="processing-icon"
              />
            </View>
          ),
          title: strings('perps.deposit.depositFailed'),
          description: depositError || strings('perps.deposit.stepDescriptions.error'),
        };
      case 'idle':
      default:
        // Fallback for when controller state is not yet set
        return {
          icon: <ActivityIndicator size="large" color={colors.primary.default} testID="processing-animation" />,
          title: isDirectDeposit ? strings('perps.deposit.steps.depositing') : strings('perps.deposit.steps.preparing'),
          description: strings('perps.deposit.stepDescriptions.preparing'),
        };
    }
  };

  const statusContent = getStatusContent();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <Text variant={TextVariant.HeadingMD} style={styles.headerTitle} testID="header-title">
          {strings('perps.deposit.processingTitle')}
        </Text>
        <ButtonIcon
          iconName={IconName.Close}
          onPress={handleClose}
          iconColor={IconColor.Default}
          style={styles.closeButton}
          testID="close-button"
        />
      </View>

      <View style={styles.content}>
        {/* Status Content */}
        <View style={styles.statusContainer}>
          <View style={styles.statusIcon}>
            {statusContent?.icon}
          </View>

          <Text variant={TextVariant.HeadingMD} style={styles.statusText} testID="status-title">
            {statusContent?.title}
          </Text>

          <Text variant={TextVariant.BodyMD} color={TextColor.Muted} style={styles.progressText} testID="status-description">
            {statusContent?.description}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButton}>
          {depositStatus === 'success' && (
            <Button
              variant={ButtonVariants.Primary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={strings('perps.deposit.viewBalance')}
              onPress={handleViewBalance}
              testID="view-balance-button"
            />
          )}

          {depositStatus === 'error' && (
            <>
              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                label={strings('perps.deposit.retryDeposit')}
                onPress={handleRetry}
                style={styles.retryButton}
                testID="retry-button"
              />
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                label={strings('perps.deposit.goBack')}
                onPress={handleClose}
                testID="go-back-button"
              />
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PerpsDepositProcessingView;
