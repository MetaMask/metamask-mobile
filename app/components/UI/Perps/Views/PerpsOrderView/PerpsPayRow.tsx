import {
  CHAIN_IDS,
  TransactionType,
} from '@metamask/transaction-controller';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
import {
  ConfirmationRowComponentIDs,
  TransactionPayComponentIDs,
} from '../../../../Views/confirmations/ConfirmationView.testIds';
import { useConfirmationMetricEvents } from '../../../../Views/confirmations/hooks/metrics/useConfirmationMetricEvents';
import { useTransactionPayToken } from '../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { useTokenWithBalance } from '../../../../Views/confirmations/hooks/tokens/useTokenWithBalance';
import { useTransactionMetadataRequest } from '../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../../../Views/confirmations/utils/transaction';
import {
  PERPS_BALANCE_CHAIN_ID,
  PERPS_BALANCE_PLACEHOLDER_ADDRESS,
  useIsPerpsBalanceSelected,
} from '../../hooks/useIsPerpsBalanceSelected';
import { usePerpsLiveAccount } from '../../hooks/stream/usePerpsLiveAccount';

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
  const matchesPerpsBalance = useIsPerpsBalanceSelected();

  const hasSetDefaultPerpsBalanceRef = useRef(false);
  useEffect(() => {
    if (
      hasSetDefaultPerpsBalanceRef.current ||
      !hasTransactionType(transactionMeta, [
        TransactionType.perpsDepositAndOrder,
      ])
    ) {
      return;
    }
    hasSetDefaultPerpsBalanceRef.current = true;
    setPayToken({
      address: PERPS_BALANCE_PLACEHOLDER_ADDRESS,
      chainId: PERPS_BALANCE_CHAIN_ID,
    });
  }, [transactionMeta, setPayToken]);

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
  const displayToken = matchesPerpsBalance
    ? {
      address: PERPS_BALANCE_PLACEHOLDER_ADDRESS,
      tokenLookupChainId: PERPS_BALANCE_CHAIN_ID,
      networkBadgeChainId: PERPS_BALANCE_CHAIN_ID,
      symbol: strings('perps.adjust_margin.perps_balance'),
    }
    : {
      address: payToken?.address ?? PERPS_BALANCE_PLACEHOLDER_ADDRESS,
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
        {matchesPerpsBalance ? (
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
            ) : null}
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
