import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  parseCaipAccountId,
  parseCaipAssetType,
  type CaipAccountId,
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
import type { TokenAmount } from '../../../../../util/activity-adapters';
import { formatTimestampToDateTime } from '../../../../../util/date';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useFormatters } from '../../../../hooks/useFormatters';
/* eslint-disable import-x/no-restricted-paths -- reuse the shared Activity Details presentation */
import {
  ActivityDetailRow,
  ActivityDetailSection,
  ActivityDetailsAccountValue,
  ActivityDetailsBlockExplorerButton,
  ActivityDetailsDoItAgainButton,
  ActivityDetailsDualAmountHeader,
  ActivityDetailsFeeValue,
  ActivityDetailsNetworkValue,
  ActivityDetailsTemplateFrame,
  ActivityDetailsTransactionId,
} from '../../../../Views/ActivityDetails/components';
import { useActivityNetworkName } from '../../../../Views/ActivityDetails/hooks/useActivityNetworkName';
/* eslint-enable import-x/no-restricted-paths */
import type { CreatedLimitOrderTransaction } from '../../api/limitOrders/create/schema';
import { LimitOrderState } from '../../api/limitOrders/getLimitOrders/types';
import { TokenAmountValue } from '../../components/LimitOrderConfirmationModal/TokenAmountValue';
import { getUsdTriggerPrice } from '../../components/OpenLimitOrderDetailsModal/utils';
import { useLimitOrder } from '../../hooks/useLimitOrder';
import { useTokenUsdRate } from '../../hooks/useTokenFiatRate';
import type { BridgeToken } from '../../types';
import { formatLimitOrderAmount } from '../../utils/limitOrders/formatLimitOrderAmount';
import { getLimitOrderTokens } from '../../utils/limitOrders/getLimitOrderTokens';
import { SwapsLimitOrderActivityPageSelectorsIDs } from './SwapsLimitOrderActivityPage.testIds';
import type { SwapsLimitOrderActivityPageRouteParams } from './SwapsLimitOrderActivityPage.types';
import {
  getLimitOrderActivityNetworkFee,
  getLimitOrderActivityStatus,
  getLimitOrderActivityTitle,
  getLimitOrderActivityTransaction,
  getLimitOrderActivityUsdValue,
} from './SwapsLimitOrderActivityPage.utils';

function LimitOrderFeesAndTotal({
  chainId,
  transaction,
  sourceToken,
}: {
  chainId: CaipChainId;
  transaction: CreatedLimitOrderTransaction;
  sourceToken: BridgeToken;
}) {
  const { formatCurrencyWithMinThreshold } = useFormatters();
  const sourceTokenUsdRate = useTokenUsdRate(sourceToken);
  const networkFee = getLimitOrderActivityNetworkFee(transaction);
  const totalUsd = getLimitOrderActivityUsdValue(
    transaction.src.amount,
    transaction.src.asset.decimals,
    sourceTokenUsdRate,
  );
  const total =
    totalUsd === undefined
      ? undefined
      : formatCurrencyWithMinThreshold(totalUsd, 'usd');

  if (!networkFee && !total) {
    return null;
  }

  return (
    <>
      <SectionDivider marginVertical={0} />
      <ActivityDetailSection
        testID={SwapsLimitOrderActivityPageSelectorsIDs.FEES_AND_TOTAL}
      >
        {networkFee ? (
          <ActivityDetailRow
            label={strings('activity_details.network_fee')}
            value={
              <ActivityDetailsFeeValue
                fee={{
                  type: 'base',
                  amount: networkFee.amount,
                  decimals: networkFee.asset.decimals,
                  symbol: networkFee.asset.symbol,
                  assetId: networkFee.asset.assetId,
                }}
                value={
                  formatCurrencyWithMinThreshold(
                    Number(networkFee.usd),
                    'usd',
                  ) ||
                  formatLimitOrderAmount(
                    networkFee.amount,
                    networkFee.asset.decimals,
                  )
                }
                chainId={chainId}
              />
            }
            testID={SwapsLimitOrderActivityPageSelectorsIDs.NETWORK_FEE_ROW}
          />
        ) : null}
        <ActivityDetailRow
          label={strings('activity_details.total_amount')}
          value={total}
          testID={SwapsLimitOrderActivityPageSelectorsIDs.TOTAL_ROW}
        />
      </ActivityDetailSection>
    </>
  );
}

function SwapsLimitOrderActivityPage() {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { order } = useParams<SwapsLimitOrderActivityPageRouteParams>();
  const { sourceToken, destinationToken } = getLimitOrderTokens(order);
  const chainId = parseCaipAssetType(order.src.asset.assetId).chainId;
  const networkName = useActivityNetworkName(chainId);
  const { triggerPrice, triggerToken } = getUsdTriggerPrice(
    order,
    sourceToken,
    destinationToken,
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
                {isFilled && transaction ? (
                  <LimitOrderFeesAndTotal
                    chainId={chainId}
                    transaction={transaction}
                    sourceToken={sourceToken}
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
                  label={strings('bridge.limit.create_new_order')}
                  onPress={handleBack}
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
