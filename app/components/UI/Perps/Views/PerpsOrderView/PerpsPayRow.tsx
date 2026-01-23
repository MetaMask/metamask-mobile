import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import BaseTokenIcon from '../../../../Base/TokenIcon';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { getNetworkImageSource } from '../../../../../util/networks';
import { useTokenWithBalance } from '../../../../Views/confirmations/hooks/tokens/useTokenWithBalance';
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

  // Track if user has explicitly interacted with token selection
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const initialPayTokenRef = useRef<string | null>(null);

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

  // Store initial payToken on mount
  useEffect(() => {
    if (payToken && initialPayTokenRef.current === null) {
      initialPayTokenRef.current = `${payToken.chainId}-${payToken.address}`;
    }
  }, [payToken]);

  // Detect when payToken changes from initial value (user selected a different token)
  useEffect(() => {
    if (payToken && initialPayTokenRef.current !== null) {
      const currentTokenKey = `${payToken.chainId}-${payToken.address}`;
      if (currentTokenKey !== initialPayTokenRef.current) {
        setHasUserInteracted(true);
      }
    }
  }, [payToken]);

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
    // Mark that user has interacted when they open the modal
    setHasUserInteracted(true);
    setConfirmationMetric({
      properties: {
        mm_pay_token_list_opened: true,
      },
    });
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_MODAL, {
      hideNetworkFilter,
    });
  }, [canEdit, navigation, setConfirmationMetric, hideNetworkFilter]);

  // Determine Arbitrum chain ID for token lookup (USDC is stored under Arbitrum chain ID)
  const arbitrumChainId = useMemo(
    () =>
      currentNetwork === 'testnet'
        ? ARBITRUM_SEPOLIA_CHAIN_ID
        : ARBITRUM_MAINNET_CHAIN_ID_HEX,
    [currentNetwork],
  );

  // Determine what to display based on user interaction
  const displayToken = useMemo(() => {
    // If user hasn't interacted, always show Perps balance
    if (!hasUserInteracted) {
      return {
        address: usdcAddress as Hex,
        tokenLookupChainId: arbitrumChainId as Hex, // Use Arbitrum to find token
        networkBadgeChainId: hyperliquidChainId as Hex, // Use HyperLiquid for network badge
        label: strings('perps.adjust_margin.perps_balance'),
        balance: availableBalance,
      };
    }

    // User has interacted - show selected token (or Perps balance if HyperLiquid USDC)
    if (isHyperliquidUsdc) {
      return {
        address: usdcAddress as Hex,
        tokenLookupChainId: arbitrumChainId as Hex, // Use Arbitrum to find token
        networkBadgeChainId: hyperliquidChainId as Hex, // Use HyperLiquid for network badge
        label: strings('perps.adjust_margin.perps_balance'),
        balance: availableBalance,
      };
    }

    // Show the selected token
    if (!payToken) {
      // Fallback to Perps balance if no token (shouldn't happen)
      return {
        address: usdcAddress as Hex,
        tokenLookupChainId: arbitrumChainId as Hex,
        networkBadgeChainId: hyperliquidChainId as Hex,
        label: strings('perps.adjust_margin.perps_balance'),
        balance: availableBalance,
      };
    }

    return {
      address: payToken.address as Hex,
      tokenLookupChainId: payToken.chainId as Hex,
      networkBadgeChainId: payToken.chainId as Hex, // Use same chainId for both
      label: `${strings('confirm.label.pay_with')} ${payToken.symbol}`,
      balance: payToken.balanceUsd ?? '0',
    };
  }, [
    hasUserInteracted,
    payToken,
    isHyperliquidUsdc,
    usdcAddress,
    arbitrumChainId,
    hyperliquidChainId,
    availableBalance,
  ]);

  // Get token for icon (use tokenLookupChainId to find the token)
  const token = useTokenWithBalance(
    displayToken.address,
    displayToken.tokenLookupChainId,
  );

  // Get network badge image source (use networkBadgeChainId for the badge)
  const networkImageSource = useMemo(
    () =>
      getNetworkImageSource({
        chainId: displayToken.networkBadgeChainId,
      }),
    [displayToken.networkBadgeChainId],
  );

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
        {token ? (
          <BadgeWrapper
            badgePosition={BadgePosition.BottomRight}
            badgeElement={
              <Badge
                variant={BadgeVariant.Network}
                imageSource={networkImageSource}
              />
            }
          >
            <BaseTokenIcon
              testID="perps-pay-row-token-icon"
              icon={token.image}
              symbol={token.symbol}
              style={tokenIconStyles.icon}
            />
          </BadgeWrapper>
        ) : (
          <TokenIcon
            address={displayToken.address}
            chainId={displayToken.tokenLookupChainId}
          />
        )}
        <Text
          variant={TextVariant.BodyMDMedium}
          color={TextColor.Default}
          testID={
            !hasUserInteracted || isHyperliquidUsdc
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
            !hasUserInteracted || isHyperliquidUsdc
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
