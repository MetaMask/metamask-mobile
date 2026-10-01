import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  parseCaipAccountId,
  parseCaipAssetType,
  type CaipAccountId,
  type CaipAssetType,
  type CaipChainId,
} from '@metamask/utils';
import {
  Box,
  FontWeight,
  HeaderStandard,
  SectionDivider,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import type { TokenAmount } from '../../../../../util/activity-adapters';
import { formatTimestampToDateTime } from '../../../../../util/date';
import { useParams } from '../../../../../util/navigation/navUtils';
/* eslint-disable import-x/no-restricted-paths -- reuse the shared Activity Details presentation and transaction enrichment */
import {
  ActivityDetailRow,
  ActivityDetailSection,
  ActivityDetailsAccountValue,
  ActivityDetailsBlockExplorerButton,
  ActivityDetailsDoItAgainButton,
  ActivityDetailsDualAmountHeader,
  ActivityDetailsFeesAndTotal,
  ActivityDetailsNetworkValue,
  ActivityDetailsTemplateFrame,
  ActivityDetailsTransactionId,
} from '../../../../Views/ActivityDetails/components';
import { useActivityDetailsItem } from '../../../../Views/ActivityDetails/hooks/useActivityDetailsItem';
import { useActivityNetworkName } from '../../../../Views/ActivityDetails/hooks/useActivityNetworkName';
/* eslint-enable import-x/no-restricted-paths */
import { LimitOrderState } from '../../api/limitOrders/getLimitOrders/types';
import { TokenAmountValue } from '../../components/LimitOrderConfirmationModal/TokenAmountValue';
import { getTriggerPrice } from '../../components/OpenLimitOrderDetailsModal/utils';
import { useFiatToUsdRate } from '../../hooks/useFiatToUsdRate';
import { useLimitOrder } from '../../hooks/useLimitOrder';
import { getLimitOrderTokens } from '../../utils/limitOrders/getLimitOrderTokens';
import { SwapsLimitOrderActivityPageSelectorsIDs } from './SwapsLimitOrderActivityPage.testIds';
import type { SwapsLimitOrderActivityPageRouteParams } from './SwapsLimitOrderActivityPage.types';
import {
  getLimitOrderActivityStatus,
  getLimitOrderActivityTitle,
  getLimitOrderActivityTransaction,
} from './SwapsLimitOrderActivityPage.utils';

function LimitOrderFeesAndTotal({
  chainId,
  txHash,
  sourceToken,
}: {
  chainId: CaipChainId;
  txHash: string;
  sourceToken: TokenAmount;
}) {
  const { item } = useActivityDetailsItem(txHash, chainId);

  if (!item) {
    return null;
  }

  return (
    <>
      <SectionDivider marginVertical={0} />
      <Box testID={SwapsLimitOrderActivityPageSelectorsIDs.FEES_AND_TOTAL}>
        <ActivityDetailsFeesAndTotal item={item} token={sourceToken} fiatOnly />
      </Box>
    </>
  );
}

function handleDuplicateOrder() {
  // TODO: Prefill the limit order form from this order once duplicating is supported.
  // eslint-disable-next-line no-console
  console.log('Will duplicate order');
}

function SwapsLimitOrderActivityPage() {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { order } = useParams<SwapsLimitOrderActivityPageRouteParams>();
  const currentCurrency = useSelector(selectCurrentCurrency);
  const { sourceToken, destinationToken } = getLimitOrderTokens(order);
  const chainId = parseCaipAssetType(
    order.src.asset.assetId as CaipAssetType,
  ).chainId;
  const networkName = useActivityNetworkName(chainId);
  const fiatToUsdRate = useFiatToUsdRate(sourceToken.chainId);
  const { triggerPrice, triggerToken } = getTriggerPrice(
    order,
    sourceToken,
    destinationToken,
    currentCurrency,
    fiatToUsdRate,
  );
  // The orders list carries neither the transaction nor the amounts a fill
  // actually moved, so the order is fetched on its own for them.
  const { data: orderDetails } = useLimitOrder({
    orderId: order.id,
    accountAddress: order.account,
  });
  const transaction = getLimitOrderActivityTransaction(
    orderDetails?.transactions,
  );
  const txHash = transaction?.txHash;
  const isFilled = order.state === LimitOrderState.Filled;
  const status = getLimitOrderActivityStatus(order);

  // Only a filled order moved any funds. Until the fill is fetched, the order's
  // own amounts stand in, the destination one being the guaranteed minimum.
  const sentToken: TokenAmount = {
    amount: isFilled ? (transaction?.src.amount ?? order.src.amount) : '0',
    decimals: sourceToken.decimals,
    symbol: sourceToken.symbol,
    assetId: order.src.asset.assetId,
    direction: 'out',
  };
  const receivedToken: TokenAmount | undefined = isFilled
    ? {
        amount: transaction?.dest.amount ?? order.dest.amount,
        decimals: destinationToken.decimals,
        symbol: destinationToken.symbol,
        assetId: order.dest.asset.assetId,
        direction: 'in',
      }
    : undefined;

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={SwapsLimitOrderActivityPageSelectorsIDs.SCREEN}
    >
      <Box twClassName="flex-1 bg-default">
        <HeaderStandard
          includesTopInset
          title={getLimitOrderActivityTitle(
            order.state,
            sourceToken.symbol,
            destinationToken.symbol,
          )}
          onBack={handleBack}
          backButtonProps={{
            testID: SwapsLimitOrderActivityPageSelectorsIDs.BACK_BUTTON,
          }}
        />
        <ScrollView
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('grow p-4')}
          showsVerticalScrollIndicator={false}
        >
          <ActivityDetailsTemplateFrame
            hero={
              <ActivityDetailsDualAmountHeader
                sentToken={sentToken}
                receivedToken={receivedToken}
                // An order that never filled sent nothing, which reads as
                // `0 ETH` rather than an outgoing `-0 ETH`.
                signZeroAmounts={false}
              />
            }
            metadata={
              <>
                <ActivityDetailSection>
                  <ActivityDetailRow
                    label={strings('bridge.limit.status')}
                    value={
                      <Text
                        variant={TextVariant.BodyMd}
                        fontWeight={FontWeight.Medium}
                        color={status.color}
                      >
                        {status.label}
                      </Text>
                    }
                    testID={SwapsLimitOrderActivityPageSelectorsIDs.STATUS_ROW}
                  />
                  <ActivityDetailRow
                    label={strings('bridge.limit.date_created')}
                    value={formatTimestampToDateTime(
                      Date.parse(order.timingData.createdAt),
                    )}
                    testID={
                      SwapsLimitOrderActivityPageSelectorsIDs.DATE_CREATED_ROW
                    }
                  />
                  <ActivityDetailRow
                    label={strings('activity_details.account')}
                    value={
                      <ActivityDetailsAccountValue
                        address={
                          parseCaipAccountId(order.account as CaipAccountId)
                            .address
                        }
                        chainId={chainId}
                      />
                    }
                    testID={SwapsLimitOrderActivityPageSelectorsIDs.ACCOUNT_ROW}
                  />
                  <ActivityDetailRow
                    label={strings('bridge.limit.order_type')}
                    value={strings('bridge.limit.order_type_limit')}
                    testID={
                      SwapsLimitOrderActivityPageSelectorsIDs.ORDER_TYPE_ROW
                    }
                  />
                  <ActivityDetailRow
                    label={strings('bridge.limit.trigger_condition')}
                    value={
                      <TokenAmountValue
                        amount={triggerPrice}
                        token={triggerToken}
                      />
                    }
                    testID={
                      SwapsLimitOrderActivityPageSelectorsIDs.TRIGGER_CONDITION_ROW
                    }
                  />
                  <ActivityDetailRow
                    label={strings('activity_details.network')}
                    value={
                      <ActivityDetailsNetworkValue
                        chainId={chainId}
                        name={networkName}
                      />
                    }
                    testID={SwapsLimitOrderActivityPageSelectorsIDs.NETWORK_ROW}
                  />
                  <ActivityDetailRow
                    label={strings('activity_details.transaction_id')}
                    value={
                      txHash ? (
                        <ActivityDetailsTransactionId hash={txHash} />
                      ) : undefined
                    }
                    testID={
                      SwapsLimitOrderActivityPageSelectorsIDs.TRANSACTION_ID_ROW
                    }
                  />
                </ActivityDetailSection>
                {txHash ? (
                  <LimitOrderFeesAndTotal
                    chainId={chainId}
                    txHash={txHash}
                    sourceToken={sentToken}
                  />
                ) : null}
              </>
            }
            footer={
              isFilled ? (
                <ActivityDetailsBlockExplorerButton
                  chainId={chainId}
                  hash={txHash}
                />
              ) : (
                <ActivityDetailsDoItAgainButton
                  label={strings('bridge.limit.duplicate_order')}
                  onPress={handleDuplicateOrder}
                />
              )
            }
          />
        </ScrollView>
      </Box>
    </SafeAreaView>
  );
}

export default SwapsLimitOrderActivityPage;
