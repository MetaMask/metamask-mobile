import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';
import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { Box } from '../../../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../UI/Box/box.types';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { TokenIcon } from '../../../../Views/confirmations/components/token-icon';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from '../../../../Views/confirmations/components/rows/pay-with-row/pay-with-row.styles';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { usePerpsLiveAccount } from '../../hooks/stream/usePerpsLiveAccount';
import { usePerpsNetwork } from '../../hooks/usePerpsNetwork';
import {
  ARBITRUM_MAINNET_CHAIN_ID_HEX,
  ARBITRUM_SEPOLIA_CHAIN_ID,
  HYPERLIQUID_MAINNET_CHAIN_ID,
  HYPERLIQUID_TESTNET_CHAIN_ID,
  USDC_ARBITRUM_MAINNET_ADDRESS,
  USDC_ARBITRUM_TESTNET_ADDRESS,
} from '../../constants/hyperLiquidConfig';
import {
  ConfirmationRowComponentIDs,
  TransactionPayComponentIDs,
} from '../../../../Views/confirmations/ConfirmationView.testIds';
import { useConfirmationMetricEvents } from '../../../../Views/confirmations/hooks/metrics/useConfirmationMetricEvents';
import { isHardwareAccount } from '../../../../../util/address';
import { useTransactionMetadataRequest } from '../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { useTransactionPayToken } from '../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import type { Hex } from '@metamask/utils';

interface PerpsPayRowProps {
  hideNetworkFilter?: boolean;
}

export const PerpsPayRow = ({ hideNetworkFilter }: PerpsPayRowProps = {}) => {
  const navigation = useNavigation();
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const { styles } = useStyles(styleSheet, {});
  const { setConfirmationMetric } = useConfirmationMetricEvents();
  const currentNetwork = usePerpsNetwork();
  const { payToken } = useTransactionPayToken();

  // Get Perps balance from live account
  const { account: perpsAccount } = usePerpsLiveAccount({ throttleMs: 1000 });
  const availableBalance = perpsAccount?.availableBalance || '0';

  const {
    txParams: { from },
  } = useTransactionMetadataRequest() ?? { txParams: {} };

  const canEdit = !isHardwareAccount(from ?? '');

  // Determine HyperLiquid chain ID and USDC address based on network
  const hyperliquidChainId = useMemo(
    () =>
      currentNetwork === 'testnet'
        ? HYPERLIQUID_TESTNET_CHAIN_ID
        : HYPERLIQUID_MAINNET_CHAIN_ID,
    [currentNetwork],
  );

  const usdcAddress = useMemo(
    () =>
      currentNetwork === 'testnet'
        ? USDC_ARBITRUM_TESTNET_ADDRESS
        : USDC_ARBITRUM_MAINNET_ADDRESS,
    [currentNetwork],
  );

  // Check if the selected token is HyperLiquid USDC (default Perps balance)
  const isHyperliquidUsdc = useMemo(() => {
    if (!payToken) return false;
    return (
      payToken.chainId.toLowerCase() === hyperliquidChainId.toLowerCase() &&
      payToken.address.toLowerCase() === usdcAddress.toLowerCase()
    );
  }, [payToken, hyperliquidChainId, usdcAddress]);

  const handleClick = useCallback(() => {
    if (!canEdit) return;
    setConfirmationMetric({
      properties: {
        mm_pay_token_list_opened: true,
      },
    });
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_MODAL, {
      hideNetworkFilter,
    });
  }, [canEdit, navigation, setConfirmationMetric, hideNetworkFilter]);

  // Determine Arbitrum chain ID for TokenIcon (USDC is on Arbitrum, not HyperLiquid chain)
  const arbitrumChainId = useMemo(
    () =>
      currentNetwork === 'testnet'
        ? ARBITRUM_SEPOLIA_CHAIN_ID
        : ARBITRUM_MAINNET_CHAIN_ID_HEX,
    [currentNetwork],
  );

  // Determine what to display based on selected token
  const displayToken = useMemo(() => {
    // If no token selected or it's HyperLiquid USDC, show Perps balance
    if (!payToken || isHyperliquidUsdc) {
      return {
        address: usdcAddress as Hex,
        chainId: arbitrumChainId as Hex, // Use Arbitrum chain ID for TokenIcon
        label: strings('perps.adjust_margin.perps_balance'),
        balance: availableBalance,
      };
    }

    // Otherwise, show the selected token
    return {
      address: payToken.address as Hex,
      chainId: payToken.chainId as Hex,
      label: `${strings('confirm.label.pay_with')} ${payToken.symbol}`,
      balance: payToken.balanceUsd ?? '0',
    };
  }, [
    payToken,
    isHyperliquidUsdc,
    usdcAddress,
    arbitrumChainId,
    availableBalance,
  ]);

  const balanceUsdFormatted = useMemo(
    () => formatFiat(new BigNumber(displayToken.balance)),
    [formatFiat, displayToken.balance],
  );

  return (
    <TouchableOpacity
      onPress={handleClick}
      disabled={!canEdit}
      testID={ConfirmationRowComponentIDs.PAY_WITH}
    >
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        justifyContent={JustifyContent.center}
        gap={12}
        style={styles.container}
      >
        <TokenIcon
          address={displayToken.address}
          chainId={displayToken.chainId}
        />
        <Text
          variant={TextVariant.BodyMDMedium}
          color={TextColor.Default}
          testID={
            isHyperliquidUsdc || !payToken
              ? 'perps-pay-row-label'
              : TransactionPayComponentIDs.PAY_WITH_SYMBOL
          }
        >
          {displayToken.label}
        </Text>
        <Text
          variant={TextVariant.BodyMDMedium}
          color={TextColor.Alternative}
          testID={
            isHyperliquidUsdc || !payToken
              ? 'perps-pay-row-balance'
              : TransactionPayComponentIDs.PAY_WITH_BALANCE
          }
        >
          {balanceUsdFormatted}
        </Text>
        {canEdit && from && (
          <Icon
            name={IconName.ArrowDown}
            size={IconSize.Sm}
            color={IconColor.Alternative}
          />
        )}
      </Box>
    </TouchableOpacity>
  );
};
