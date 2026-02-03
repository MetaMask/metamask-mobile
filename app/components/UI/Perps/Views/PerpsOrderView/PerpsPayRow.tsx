import { toHex } from '@metamask/controller-utils';
import {
  CHAIN_IDS,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import { BigNumber } from 'bignumber.js';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef
} from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Routes from '../../../../../constants/navigation/Routes';
import { isHardwareAccount } from '../../../../../util/address';
import { getNetworkImageSource } from '../../../../../util/networks';
import BaseTokenIcon from '../../../../Base/TokenIcon';
import { useStyles } from '../../../../hooks/useStyles';
import { Box } from '../../../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../UI/Box/box.types';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import styleSheet from '../../../../Views/confirmations/components/rows/pay-with-row/pay-with-row.styles';
import { TokenIcon } from '../../../../Views/confirmations/components/token-icon';
import {
  ConfirmationRowComponentIDs,
  TransactionPayComponentIDs,
} from '../../../../Views/confirmations/ConfirmationView.testIds';
import { useConfirmationMetricEvents } from '../../../../Views/confirmations/hooks/metrics/useConfirmationMetricEvents';
import { useTransactionPayToken } from '../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { useTokenWithBalance } from '../../../../Views/confirmations/hooks/tokens/useTokenWithBalance';
import { useTransactionMetadataRequest } from '../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../../../Views/confirmations/utils/transaction';
import { usePerpsLiveAccount } from '../../hooks/stream/usePerpsLiveAccount';
import { HYPERLIQUID_MAINNET_CHAIN_ID } from '../../constants/hyperLiquidConfig';

const tokenIconStyles = StyleSheet.create({
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});



export const PerpsPayRow = () => {
  const navigation = useNavigation();
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const { styles } = useStyles(styleSheet, {});
  const { setConfirmationMetric } = useConfirmationMetricEvents();
  const { payToken, setPayToken } = useTransactionPayToken();
  const transactionMeta = useTransactionMetadataRequest();

  // Track if user has explicitly interacted with token selection
  const initialPayTokenRef = useRef<string | null>(null);

  // Get Perps balance from live account
  const { account: perpsAccount } = usePerpsLiveAccount({ throttleMs: 1000 });

  const {
    txParams: { from },
  } = transactionMeta ?? { txParams: {} };

  const canEdit = !isHardwareAccount(from ?? '');

  const PERPS_BALANCE_ADDRESS =
    HYPERLIQUID_MAINNET_CHAIN_ID as Hex;

  const hasSetDefaultPerpsBalanceRef = useRef(false);
  // Default to Perps balance when no payment token is set (ensures selection is visible)
  useEffect(() => {
    if (
      hasSetDefaultPerpsBalanceRef.current ||
      !hasTransactionType(transactionMeta, [
        TransactionType.perpsDepositAndOrder,
      ]) ||
      payToken !== undefined
    ) {
      return;
    }
    hasSetDefaultPerpsBalanceRef.current = true;
    setPayToken({
      address: PERPS_BALANCE_ADDRESS,
      chainId: CHAIN_IDS.MAINNET as Hex,
    });
  }, [transactionMeta, payToken, setPayToken]);

  // Store initial payToken on mount
  useEffect(() => {
    if (payToken && initialPayTokenRef.current === null) {
      initialPayTokenRef.current = `${payToken.chainId}-${payToken.address}`;
    }
  }, [payToken]);


  const handleClick = useCallback(() => {
    if (!canEdit) return;
    // Mark that user has interacted when they open the modal
    setConfirmationMetric({
      properties: {
        mm_pay_token_list_opened: true,
      },
    });
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_MODAL);
  }, [
    canEdit,
    navigation,
    setConfirmationMetric,
  ]);


  const isSelectedPerpsBalance =
    payToken?.address?.toLowerCase() === PERPS_BALANCE_ADDRESS.toLowerCase() &&
    payToken?.chainId !== undefined &&
    toHex(payToken.chainId) === CHAIN_IDS.MAINNET;

  // Determine what to display based on user interaction
  const displayToken = isSelectedPerpsBalance
    ? {
      address: PERPS_BALANCE_ADDRESS,
      tokenLookupChainId: CHAIN_IDS.MAINNET as Hex,
      networkBadgeChainId: CHAIN_IDS.MAINNET as Hex,
      label: `${strings('confirm.label.pay_with')} ${strings('perps.adjust_margin.perps_balance')}`,
      balance: perpsAccount?.totalBalance ?? '0',
    }
    : {
      address: payToken?.address as Hex,
      tokenLookupChainId: payToken?.chainId as Hex,
      networkBadgeChainId: payToken?.chainId as Hex,
      label: `${strings('confirm.label.pay_with')} ${payToken?.symbol}`,
      balance: payToken?.balanceUsd ?? '0',
    };


  console.log('displayToken', displayToken);
  console.log('payToken', payToken);

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
          testID={TransactionPayComponentIDs.PAY_WITH_SYMBOL
          }
        >
          {displayToken.label}
        </Text>
        <Text
          variant={TextVariant.BodyMDMedium}
          color={TextColor.Alternative}
          testID={TransactionPayComponentIDs.PAY_WITH_BALANCE
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
