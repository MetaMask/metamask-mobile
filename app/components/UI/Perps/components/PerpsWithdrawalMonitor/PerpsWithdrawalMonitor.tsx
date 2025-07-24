import React, { useCallback, useContext } from 'react';
import { View, TouchableOpacity, Linking } from 'react-native';
import { useSelector } from 'react-redux';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../component-library/hooks';
import { selectContractBalances } from '../../../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { renderFromTokenMinimalUnit } from '../../../../../util/number';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { usePerpsPendingWithdrawals } from '../../hooks';
import createStyles from './PerpsWithdrawalMonitor.styles';

interface PerpsWithdrawalMonitorProps {
  isConnected: boolean;
  isInitialized: boolean;
}

/**
 * Component for monitoring pending withdrawals from HyperLiquid to Arbitrum
 * Displays withdrawal status, USDC balance, and provides manual status checking
 */
const PerpsWithdrawalMonitor: React.FC<PerpsWithdrawalMonitorProps> = ({
  isConnected,
  isInitialized,
}) => {
  const { styles } = useStyles(createStyles, {});
  const { toastRef } = useContext(ToastContext);

  // Get pending withdrawals
  const pendingWithdrawals = usePerpsPendingWithdrawals();

  // Get USDC balance on Arbitrum
  const contractBalances = useSelector(selectContractBalances);
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);

  // USDC on Arbitrum
  const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
  const usdcBalanceHex = contractBalances?.[USDC_ADDRESS];
  const usdcBalance = usdcBalanceHex
    ? renderFromTokenMinimalUnit(usdcBalanceHex, 6) // USDC has 6 decimals
    : '0';

  const handleCheckStatus = useCallback(async () => {
    // Force check withdrawal status
    const { PerpsController } = Engine.context;

    // Store current status to detect changes
    const currentStatuses = pendingWithdrawals.map((w) => ({
      id: w.withdrawalId,
      status: w.status,
    }));

    await PerpsController.monitorPendingWithdrawals();

    // Check if any withdrawals completed
    const { pendingWithdrawals: updatedWithdrawals } = PerpsController.state;
    const completedCount = currentStatuses.filter((current) => {
      const updated = updatedWithdrawals.find(
        (w) => w.withdrawalId === current.id,
      );
      return current.status !== 'completed' && updated?.status === 'completed';
    }).length;

    if (completedCount > 0) {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        hasNoTimeout: false,
        labelOptions: [
          {
            label: strings('perps.withdrawal.completed'),
            isBold: true,
          },
          {
            label: 'USDC has arrived in your wallet',
          },
        ],
      });
    }
  }, [pendingWithdrawals, toastRef]);

  const handleOpenArbiscan = useCallback(() => {
    const arbiscanUrl = `https://arbiscan.io/token/${USDC_ADDRESS}?a=${selectedAddress}`;
    Linking.openURL(arbiscanUrl);
  }, [selectedAddress]);

  // Start monitoring withdrawals when component is mounted and active
  React.useEffect(() => {
    if (isConnected && isInitialized && pendingWithdrawals.length > 0) {
      // Get the PerpsController to start monitoring
      const { PerpsController } = Engine.context;
      PerpsController.startWithdrawalMonitoring();

      // Stop monitoring when component unmounts
      return () => {
        PerpsController.stopWithdrawalMonitoring();
      };
    }
  }, [isConnected, isInitialized, pendingWithdrawals.length]);

  if (pendingWithdrawals.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Warning}
          style={styles.mainText}
        >
          {pendingWithdrawals.length === 1
            ? `Withdrawal of ${pendingWithdrawals[0].amount} USDC ${
                pendingWithdrawals[0].status === 'processing'
                  ? 'processing'
                  : 'pending'
              }...`
            : `${pendingWithdrawals.length} withdrawals in progress...`}
        </Text>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {pendingWithdrawals[0].status === 'processing'
            ? 'Finalizing on Arbitrum...'
            : 'HyperLiquid validators signing...'}
        </Text>
        {/* Debug: Show current USDC balance */}
        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Muted}
          style={styles.debugText}
        >
          Current USDC: {usdcBalance} | Address: {selectedAddress?.slice(0, 6)}
          ...
        </Text>
        {/* Debug: Link to Arbiscan */}
        <TouchableOpacity
          onPress={handleOpenArbiscan}
          style={styles.linkButton}
        >
          <Text variant={TextVariant.BodySM} color={TextColor.Primary}>
            🔗 View on Arbiscan
          </Text>
        </TouchableOpacity>
      </View>
      <Button
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Sm}
        onPress={handleCheckStatus}
        label="Check"
      />
    </View>
  );
};

export default PerpsWithdrawalMonitor;
