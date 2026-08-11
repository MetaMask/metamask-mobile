import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  IconName,
  KeyValueRow,
  KeyValueRowVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import React, { useCallback, useMemo, useRef } from 'react';
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
import {
  consumePerpsPaymentTokenSelection,
  resetPerpsPaymentTokenSelection,
} from '../../utils/perpsPaymentTokenSelection';
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
  const navigation = useNavigation<AppNavigationProp>();
  const { setConfirmationMetric } = useConfirmationMetricEvents();
  const { track } = usePerpsEventTracking();
  const { payToken } = useTransactionPayToken();
  const transactionMeta = useTransactionMetadataRequest();
  const matchesPerpsBalance = useIsPerpsBalanceSelected();

  const {
    txParams: { from },
  } = transactionMeta ?? { txParams: {} };

  const canEdit = !isHardwareAccount(from ?? '');

  // stable token identity (address + chainId, not symbol) captured
  // when the selector opens. Comparing identity avoids misclassifying a
  // selection of a different token that shares a symbol as a dismissal. `null`
  // means no selector open is pending.
  const payTokenIdentity = payToken
    ? `${payToken.address}:${payToken.chainId}`
    : '';
  const selectorOpenIdentityRef = useRef<string | null>(null);

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
    selectorOpenIdentityRef.current = payTokenIdentity;
    // Clear any stale selection marker so only a press during THIS open counts.
    resetPerpsPaymentTokenSelection();
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_BOTTOM_SHEET);
  }, [canEdit, navigation, payTokenIdentity, setConfirmationMetric, track]);

  // emit payment_token_selector_dismissed when this screen regains
  // focus after the selector closes WITHOUT an explicit row selection. A row
  // press (even re-selecting the current token, which leaves identity unchanged)
  // sets the selection marker; only a true dismiss with no press and unchanged
  // identity is reported. A pending ref set on open guards the initial mount.
  useFocusEffect(
    useCallback(() => {
      const identityAtOpen = selectorOpenIdentityRef.current;
      if (identityAtOpen === null) {
        return;
      }
      selectorOpenIdentityRef.current = null;
      const selectionMade = consumePerpsPaymentTokenSelection();
      if (!selectionMade && payTokenIdentity === identityAtOpen) {
        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.PAYMENT_TOKEN_SELECTOR_DISMISSED,
          [PERPS_EVENT_PROPERTY.CURRENT_TOKEN]: payToken?.symbol,
        });
      }
    }, [payTokenIdentity, payToken, track]),
  );

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
