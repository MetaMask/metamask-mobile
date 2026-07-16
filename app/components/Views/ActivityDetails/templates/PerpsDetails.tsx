import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  PERPS_EVENT_VALUE,
  getPerpsDisplaySymbol,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import {
  ActivityDetailRow,
  ActivityDetailSection,
  ActivityDetailsDoItAgainButton,
  ActivityDetailsPerpsExplorerButton,
  ActivityDetailsPerpsHero,
  ActivityDetailsPerpsMetadata,
  ActivityDetailsPerpsStepTimeline,
  ActivityDetailsStatus,
  ActivityDetailsTemplateFrame,
} from '../components';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';
import {
  asPerpsActivityItem,
  formatPerpsOrderFee,
  formatPositiveFiat,
  formatPerpsTransactionDate,
  formatSignedPerpsFiat,
  getPerpsFundsCtaLabel,
  getPerpsPositionSize,
  getPerpsPriceLabel,
  getPerpsPriceValue,
  getPerpsTransaction,
  shouldShowPerpsPnl,
  type PerpsActivityListItem,
  type PerpsTransaction,
} from '../components/ActivityDetailsPerps.utils';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { usePerpsOrderFees } from '../../../UI/Perps/hooks';
import { resolvePerpsOrderStatusLabel } from '../../../UI/ActivityListItemRow/titleLabels';

function useTradeAgain(asset: string | undefined) {
  const navigation = useNavigation();
  const market = useMemo<Partial<PerpsMarketData> | undefined>(
    () => (asset ? { symbol: asset, name: asset } : undefined),
    [asset],
  );

  return useCallback(() => {
    if (!market) {
      return;
    }

    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market,
        source: PERPS_EVENT_VALUE.SOURCE.TRADE_DETAILS,
      },
    });
  }, [market, navigation]);
}

function useOpenPerpsHome() {
  const navigation = useNavigation();

  return useCallback(() => {
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
    });
  }, [navigation]);
}

function StatusAndDateRows({
  item,
  statusLabel,
}: {
  item: PerpsActivityListItem;
  statusLabel?: string;
}) {
  return (
    <>
      <ActivityDetailRow
        label={strings('activity_details.status')}
        value={
          <ActivityDetailsStatus status={item.status} label={statusLabel} />
        }
        testID={ActivityDetailsSelectorsIDs.STATUS_ROW}
      />
      <ActivityDetailRow
        label={strings('activity_details.date')}
        value={formatPerpsTransactionDate(item.timestamp)}
        testID={ActivityDetailsSelectorsIDs.DATE_ROW}
      />
    </>
  );
}

function TradeDetails({
  item,
  transaction,
}: {
  item: PerpsActivityListItem;
  transaction: PerpsTransaction;
}) {
  const fill = transaction.fill;
  const handleTradeAgain = useTradeAgain(transaction.asset);

  return (
    <ActivityDetailsTemplateFrame
      hero={
        <ActivityDetailsPerpsHero
          amount={transaction.subtitle}
          isPositive
          symbol={transaction.asset}
        />
      }
      metadata={
        <ActivityDetailSection>
          <StatusAndDateRows item={item} />
          <ActivityDetailRow
            label={strings('perps.transactions.position.size')}
            value={getPerpsPositionSize(fill)}
          />
          <ActivityDetailRow
            label={getPerpsPriceLabel(fill)}
            value={getPerpsPriceValue(fill?.entryPrice)}
          />
        </ActivityDetailSection>
      }
      details={
        <ActivityDetailSection>
          <ActivityDetailRow
            label={strings('perps.transactions.position.fees')}
            value={fill?.fee ? formatPositiveFiat(fill.fee) : undefined}
          />
          {shouldShowPerpsPnl(fill) ? (
            <ActivityDetailRow
              label={strings('perps.transactions.position.pnl')}
              value={
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={
                    BigNumber(fill?.amountNumber ?? 0).isGreaterThanOrEqualTo(0)
                      ? TextColor.SuccessDefault
                      : TextColor.ErrorDefault
                  }
                >
                  {fill?.amount}
                </Text>
              }
            />
          ) : null}
        </ActivityDetailSection>
      }
      footer={
        <>
          <ActivityDetailsPerpsExplorerButton />
          <ActivityDetailsDoItAgainButton
            label={strings('perps.transactions.trade_again')}
            onPress={handleTradeAgain}
          />
        </>
      }
    />
  );
}

function OrderDetails({
  item,
  transaction,
}: {
  item: PerpsActivityListItem;
  transaction: PerpsTransaction;
}) {
  const order = transaction.order;
  const handleTryAgain = useTradeAgain(transaction.asset);
  const shouldShowTryAgain =
    item.status === 'cancelled' || item.status === 'failed';
  const isFilled = item.status === 'success';
  const { totalFee, protocolFee, metamaskFee } = usePerpsOrderFees({
    orderType: order?.type ?? 'market',
    amount: isFilled ? (order?.size ?? '0') : '0',
  });

  return (
    <ActivityDetailsTemplateFrame
      hero={
        <ActivityDetailsPerpsHero
          amount={transaction.subtitle}
          isPositive
          symbol={transaction.asset}
        />
      }
      metadata={
        <ActivityDetailSection>
          <StatusAndDateRows
            item={item}
            statusLabel={resolvePerpsOrderStatusLabel(item.status)}
          />
          <ActivityDetailRow
            label={strings('perps.transactions.order.size')}
            value={order?.size ? getPerpsPriceValue(order.size) : undefined}
          />
          <ActivityDetailRow
            label={strings('perps.transactions.order.limit_price')}
            value={getPerpsPriceValue(order?.limitPrice)}
          />
          <ActivityDetailRow
            label={strings('perps.transactions.order.filled')}
            value={order?.filled}
          />
        </ActivityDetailSection>
      }
      details={
        <ActivityDetailSection>
          <ActivityDetailRow
            label={strings('perps.transactions.order.metamask_fee')}
            value={formatPerpsOrderFee(metamaskFee, isFilled)}
          />
          <ActivityDetailRow
            label={strings('perps.transactions.order.hyperliquid_fee')}
            value={formatPerpsOrderFee(protocolFee, isFilled)}
          />
          <ActivityDetailRow
            label={strings('perps.transactions.order.total_fee')}
            value={formatPerpsOrderFee(totalFee, isFilled)}
          />
        </ActivityDetailSection>
      }
      footer={
        <>
          <ActivityDetailsPerpsExplorerButton />
          {shouldShowTryAgain ? (
            <ActivityDetailsDoItAgainButton
              label={strings('perps.transactions.try_again')}
              onPress={handleTryAgain}
            />
          ) : null}
        </>
      }
    />
  );
}

function FundingDetails({
  item,
  transaction,
}: {
  item: PerpsActivityListItem;
  transaction: PerpsTransaction;
}) {
  const funding = transaction.fundingAmount;
  const isPositive = Boolean(funding?.isPositive);
  const headerAmount =
    transaction.subtitle || getPerpsDisplaySymbol(transaction.asset);

  return (
    <ActivityDetailsTemplateFrame
      hero={
        <ActivityDetailsPerpsHero
          amount={headerAmount}
          isPositive
          symbol={transaction.asset}
        />
      }
      metadata={
        <ActivityDetailSection>
          <StatusAndDateRows item={item} />
          <ActivityDetailRow
            label={strings('perps.transactions.funding.rate')}
            value={funding?.rate}
          />
          <ActivityDetailRow
            label={strings('perps.transactions.funding.funding_fee')}
            value={
              funding ? (
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={
                    isPositive
                      ? TextColor.SuccessDefault
                      : TextColor.TextDefault
                  }
                >
                  {formatSignedPerpsFiat(funding.feeNumber, isPositive)}
                </Text>
              ) : undefined
            }
          />
        </ActivityDetailSection>
      }
      footer={<ActivityDetailsPerpsExplorerButton />}
    />
  );
}

function FundsDetails({
  item,
  transaction,
}: {
  item: PerpsActivityListItem;
  transaction: PerpsTransaction;
}) {
  const depositWithdrawal = transaction.depositWithdrawal;
  const openPerpsHome = useOpenPerpsHome();
  // The perps source prefixes wallet-originated funds movements with `wallet-`;
  // only those carry a real on-chain `txHash` we can link to a block explorer.
  // Other deposit/withdrawal ids (e.g. internal transfers) have no explorer tx.
  const isWalletOriginated = transaction.id.startsWith('wallet-');
  const stepExplorerTarget =
    isWalletOriginated && depositWithdrawal?.txHash
      ? { chainId: item.chainId, hash: depositWithdrawal.txHash }
      : undefined;

  if (!depositWithdrawal) {
    return null;
  }

  return (
    <ActivityDetailsTemplateFrame
      hero={
        <ActivityDetailsPerpsHero
          amount={depositWithdrawal.amount}
          isPositive={depositWithdrawal.isPositive}
          symbol={depositWithdrawal.asset}
        />
      }
      metadata={<ActivityDetailsPerpsMetadata item={item} />}
      details={
        <ActivityDetailsPerpsStepTimeline
          explorerTarget={stepExplorerTarget}
          status={depositWithdrawal.status}
          timestamp={item.timestamp}
          type={depositWithdrawal.type}
        />
      }
      footer={
        <ActivityDetailsDoItAgainButton
          label={getPerpsFundsCtaLabel(
            item.status,
            transaction.type === 'deposit',
          )}
          onPress={openPerpsHome}
        />
      }
    />
  );
}

export function PerpsDetails({ item }: { item: ActivityListItem }) {
  const perpsItem = asPerpsActivityItem(item);
  const transaction = getPerpsTransaction(item);

  if (!transaction) {
    return null;
  }

  if (transaction.type === 'trade') {
    return <TradeDetails item={perpsItem} transaction={transaction} />;
  }

  if (transaction.type === 'order') {
    return <OrderDetails item={perpsItem} transaction={transaction} />;
  }

  if (transaction.type === 'funding') {
    return <FundingDetails item={perpsItem} transaction={transaction} />;
  }

  if (transaction.type === 'deposit' || transaction.type === 'withdrawal') {
    return <FundsDetails item={perpsItem} transaction={transaction} />;
  }

  return null;
}
