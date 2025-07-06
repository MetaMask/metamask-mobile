import React, { useEffect, useState, useCallback } from 'react';
import { View, SafeAreaView, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes
} from '../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor
} from '../../../../component-library/components/Texts/Text';
import ButtonIcon from '../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import Routes from '../../../../constants/navigation/Routes';

interface DepositProcessingParams {
  amount: string;
  selectedToken: string;
}

interface DepositProcessingViewProps {}

type ProcessingStatus = 'swapping' | 'bridging' | 'depositing' | 'success' | 'error';

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

const DepositProcessingView: React.FC<DepositProcessingViewProps> = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const route = useRoute();

  const { amount, selectedToken } = (route.params as DepositProcessingParams) || {};
  const [status, setStatus] = useState<ProcessingStatus>('swapping');

  // Simulate processing flow with sequential steps
  useEffect(() => {
    let currentTimer: NodeJS.Timeout;

    const runProcessingSteps = async () => {
      // Step 1: Wait 3 seconds then go to bridging
      currentTimer = setTimeout(() => {
        setStatus('bridging');

        // Step 2: Wait another 3 seconds then go to depositing
        currentTimer = setTimeout(() => {
          setStatus('depositing');

          // Step 3: Wait another 3 seconds then go to success
          currentTimer = setTimeout(() => {
            setStatus('success');

            // Step 4: Wait 1 more second then navigate
            currentTimer = setTimeout(() => {
              navigation.navigate(Routes.PERPS.DEPOSIT_SUCCESS as never, {
                amount,
                selectedToken,
              });
            }, 1000);
          }, 3000);
        }, 3000);
      }, 3000);
    };

    runProcessingSteps();

    // Cleanup function
    return () => {
      if (currentTimer) {
        clearTimeout(currentTimer);
      }
    };
  }, [navigation, amount, selectedToken]);

  const handleClose = useCallback(() => {
    navigation.navigate('Perps' as never);
  }, [navigation]);

  const handleRetry = useCallback(() => {
    setStatus('swapping');
    // Restart the processing simulation
  }, []);

  const handleViewBalance = useCallback(() => {
    navigation.navigate('Perps' as never);
  }, [navigation]);

  const getStatusContent = () => {
    switch (status) {
      case 'swapping':
        return {
          icon: <ActivityIndicator size="large" color={colors.primary.default} testID="processing-animation" />,
          title: `Swapping ${selectedToken || 'token'} to USDC`,
          description: 'Converting your tokens to USDC for deposit...',
        };
      case 'bridging':
        return {
          icon: <ActivityIndicator size="large" color={colors.primary.default} testID="processing-animation" />,
          title: 'Bridging to Hyperliquid',
          description: 'Moving USDC to Arbitrum network...',
        };
      case 'depositing':
        return {
          icon: <ActivityIndicator size="large" color={colors.primary.default} testID="processing-animation" />,
          title: 'Depositing into perps account',
          description: 'Transferring USDC to your HyperLiquid account...',
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
          title: 'Deposit completed successfully!',
          description: `Successfully deposited ${amount} USDC to your HyperLiquid account`,
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
          title: 'Deposit Failed',
          description: 'There was an error processing your deposit. Please try again.',
        };
      default:
        return null;
    }
  };

  const statusContent = getStatusContent();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <Text variant={TextVariant.HeadingMD} style={styles.headerTitle} testID="header-title">
          Processing deposit
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
          {status === 'success' && (
            <Button
              variant={ButtonVariants.Primary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label="View Balance"
              onPress={handleViewBalance}
              testID="view-balance-button"
            />
          )}

          {status === 'error' && (
            <>
              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                label="Retry Deposit"
                onPress={handleRetry}
                style={styles.retryButton}
                testID="retry-button"
              />
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                label="Go Back"
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

export default DepositProcessingView;
