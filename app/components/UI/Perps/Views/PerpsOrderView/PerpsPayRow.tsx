import { toHex } from '@metamask/controller-utils';
import {
  CHAIN_IDS,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
import { useTheme } from '../../../../../util/theme';
import BaseTokenIcon from '../../../../Base/TokenIcon';
import { Box } from '../../../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
} from '../../../../UI/Box/box.types';
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

const perpsBalancePlaceholder =
  '0x0000000000000000000000000000000000000001' as Hex;

const tokenIconStyles = StyleSheet.create({
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});

const createPayRowStyles = (colors: { background: { section: string } }) =>
  StyleSheet.create({
    payRowSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background.section,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    /** When embedded below another box (e.g. TP/SL), parent provides background and radius */
    payRowEmbedded: {
      borderRadius: 0,
      marginBottom: 0,
    },
    payRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    infoIcon: {
      marginLeft: 0,
      padding: 10,
      marginRight: -6,
      marginTop: -10,
      marginBottom: -10,
    },
  });



export interface PerpsPayRowProps {
  /** Optional callback when the info (i) icon is pressed, e.g. for tooltip */
  onPayWithInfoPress?: () => void;
  /** When true, row is stacked below another box (e.g. TP/SL); parent provides background and border radius */
  embeddedInStack?: boolean;
}

export const PerpsPayRow = ({
  onPayWithInfoPress,
  embeddedInStack = false,
}: PerpsPayRowProps) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = createPayRowStyles(colors);
  const { setConfirmationMetric } = useConfirmationMetricEvents();
  const { payToken, setPayToken } = useTransactionPayToken();
  const transactionMeta = useTransactionMetadataRequest();

  // Display state: default to Perps balance so the box always shows "Pay with ... Perps balance"
  // until payToken is explicitly set (e.g. from modal). payToken can be undefined or random on load.
  const [isDisplayingPerpsBalance, setIsDisplayingPerpsBalance] =
    useState(true);

  // Sync display state from payToken whenever it changes (e.g. user picked a token in modal)
  useEffect(() => {
    if (payToken === undefined) {
      return;
    }
    const matchesPerpsBalance =
      payToken.address?.toLowerCase() === perpsBalancePlaceholder.toLowerCase() &&
      payToken.chainId !== undefined &&
      toHex(payToken.chainId) === CHAIN_IDS.MAINNET;
    setIsDisplayingPerpsBalance(matchesPerpsBalance);
  }, [payToken]);

  // Try to set payToken to Perps balance when it's a perps order and payToken is not set.
  // payToken can be restored from persistence later; display state still defaults to Perps balance so UI is correct.
  const hasSetDefaultPerpsBalanceRef = useRef(false);
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
      address: perpsBalancePlaceholder,
      chainId: CHAIN_IDS.MAINNET as Hex,
    });
  }, [transactionMeta, payToken, setPayToken]);

  // Get Perps balance from live account
  usePerpsLiveAccount({ throttleMs: 1000 });

  const {
    txParams: { from },
  } = transactionMeta ?? { txParams: {} };

  const canEdit = !isHardwareAccount(from ?? '');

  const handleClick = useCallback(() => {
    if (!canEdit) return;
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

  // Display data: use local state (defaults to Perps balance) so UI always shows "Perps balance" by default
  const displayToken = isDisplayingPerpsBalance
    ? {
      address: perpsBalancePlaceholder,
      tokenLookupChainId: CHAIN_IDS.MAINNET as Hex,
      networkBadgeChainId: CHAIN_IDS.MAINNET as Hex,
      symbol: strings('perps.adjust_margin.perps_balance'),
    }
    : {
      address: payToken?.address ?? perpsBalancePlaceholder,
      tokenLookupChainId: payToken?.chainId ?? CHAIN_IDS.MAINNET,
      networkBadgeChainId: payToken?.chainId ?? CHAIN_IDS.MAINNET,
      symbol: payToken?.symbol ?? '',
    };

  const token = useTokenWithBalance(
    displayToken.address,
    displayToken.tokenLookupChainId,
  );

  const networkImageSource = useMemo(
    () =>
      getNetworkImageSource({
        chainId: displayToken.networkBadgeChainId,
      }),
    [displayToken.networkBadgeChainId],
  );

  return (
    <TouchableOpacity
      onPress={handleClick}
      disabled={!canEdit}
      activeOpacity={0.7}
      style={[styles.payRowSection, embeddedInStack && styles.payRowEmbedded]}
      testID={ConfirmationRowComponentIDs.PAY_WITH}
    >
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        style={styles.payRowLeft}
      >
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('confirm.label.pay_with')}
        </Text>
        <TouchableOpacity
          onPress={() => onPayWithInfoPress?.()}
          style={styles.infoIcon}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon
            name={IconName.Info}
            size={IconSize.Sm}
            color={IconColor.Alternative}
          />
        </TouchableOpacity>
      </Box>
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        gap={8}
      >
        {isDisplayingPerpsBalance ? (
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Default}
            testID={TransactionPayComponentIDs.PAY_WITH_SYMBOL}
          >
            {strings('perps.adjust_margin.perps_balance')}
          </Text>
        ) : (
          <>
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
              variant={TextVariant.BodyMD}
              color={TextColor.Default}
              testID={TransactionPayComponentIDs.PAY_WITH_SYMBOL}
            >
              {displayToken.symbol}
            </Text>
          </>
        )}
      </Box>
    </TouchableOpacity>
  );
};
