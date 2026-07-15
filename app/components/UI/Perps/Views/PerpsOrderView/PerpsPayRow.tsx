import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  IconName,
  KeyValueRow,
  KeyValueRowVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Routes from '../../../../../constants/navigation/Routes';
import { isHardwareAccount } from '../../../../../util/address';
import { getNetworkImageSource } from '../../../../../util/networks';
import BaseTokenIcon from '../../../../Base/TokenIcon';
import {
  ConfirmationRowComponentIDs,
  TransactionPayComponentIDs,
} from '../../../../Views/confirmations/ConfirmationView.testIds';
import { useConfirmationMetricEvents } from '../../../../Views/confirmations/hooks/metrics/useConfirmationMetricEvents';
import { useTransactionPayToken } from '../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { useTokenWithBalance } from '../../../../Views/confirmations/hooks/tokens/useTokenWithBalance';
import { useTransactionMetadataRequest } from '../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import {
  PERPS_BALANCE_CHAIN_ID,
  PERPS_BALANCE_PLACEHOLDER_ADDRESS,
} from '../../constants/perpsConfig';
import { PERPS_BALANCE_ICON_URI } from '../../hooks/usePerpsBalanceTokenFilter';
import { useIsPerpsBalanceSelected } from '../../hooks/useIsPerpsBalanceSelected';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { Hex } from '@metamask/utils';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';

const tokenIconStyles = StyleSheet.create({
  iconSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});

export interface PerpsPayRowProps {
  /** Optional callback when the info (i) icon is pressed, e.g. for tooltip */
  onPayWithInfoPress?: () => void;
}

export const PerpsPayRow = ({ onPayWithInfoPress }: PerpsPayRowProps) => {
  const navigation = useNavigation();
  const { setConfirmationMetric } = useConfirmationMetricEvents();
  const { track } = usePerpsEventTracking();
  const { payToken } = useTransactionPayToken();
  const transactionMeta = useTransactionMetadataRequest();
  const matchesPerpsBalance = useIsPerpsBalanceSelected();

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
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.PAYMENT_TOKEN_SELECTOR,
    });
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_BOTTOM_SHEET);
  }, [canEdit, navigation, setConfirmationMetric, track]);

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
    displayToken.address as unknown as Hex,
    displayToken.tokenLookupChainId,
  );

  const networkImageSource = useMemo(
    () =>
      getNetworkImageSource({
        chainId: displayToken.networkBadgeChainId,
      }),
    [displayToken.networkBadgeChainId],
  );

  const valueLabel = matchesPerpsBalance
    ? strings('perps.adjust_margin.perps_balance')
    : displayToken.symbol;

  const valueStartAccessory = matchesPerpsBalance ? (
    <BaseTokenIcon
      testID="perps-pay-row-token-icon"
      icon={PERPS_BALANCE_ICON_URI}
      symbol={strings('perps.adjust_margin.perps_balance')}
      style={tokenIconStyles.iconSmall}
    />
  ) : token ? (
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
        style={tokenIconStyles.iconSmall}
      />
    </BadgeWrapper>
  ) : null;

  return (
    <TouchableOpacity
      onPress={handleClick}
      disabled={!canEdit}
      activeOpacity={0.7}
      testID={ConfirmationRowComponentIDs.PAY_WITH}
    >
      <KeyValueRow
        variant={KeyValueRowVariant.Input}
        keyLabel={strings('confirm.label.pay_with')}
        keyEndButtonIconProps={{
          iconName: IconName.Info,
          onPress: () => onPayWithInfoPress?.(),
          testID: 'perps-pay-row-info',
        }}
        valueStartAccessory={valueStartAccessory}
        value={
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            testID={TransactionPayComponentIDs.PAY_WITH_SYMBOL}
          >
            {valueLabel}
          </Text>
        }
      />
    </TouchableOpacity>
  );
};
