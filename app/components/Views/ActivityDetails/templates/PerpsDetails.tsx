import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import BigNumber from 'bignumber.js';
import {
  FontWeight,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { MetamaskPayMetadata } from '@metamask/transaction-controller';
import {
  PERPS_EVENT_VALUE,
  getPerpsDisplaySymbol,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { useNavigateToPerpsHome } from '../../../UI/Perps/utils/perpsModeSwitch';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import {
  ActivityDetailRow,
  ActivityDetailSection,
  ActivityDetailsDoItAgainButton,
  ActivityDetailsPerpsExplorerButton,
  ActivityDetailsPerpsHero,
  ActivityDetailsPerpsMetadata,
  ActivityDetailsPayFeesAndTotal,
  ActivityDetailsPerpsStepTimeline,
  ActivityDetailsStatus,
  ActivityDetailsTemplateFrame,
  useActivityPayFiat,
  useFormatActivityTokenAmount,
} from '../components';
import { usePayFundsFailure } from '../hooks/usePayFundsFailure';
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
  type PerpsDepositWithdrawalStatus,
  type PerpsTransaction,
} from '../components/ActivityDetailsPerps.utils';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { usePerpsRecordedOrderFees } from '../../../UI/Perps/hooks';
import { resolvePerpsOrderStatusLabel } from '../../../UI/ActivityListItemRow/titleLabels';
import { PerpsConnectionProvider } from '../../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../../UI/Perps/providers/PerpsStreamManager';

const PERPS_FUNDS_DESTINATION = { network: 'Arbitrum', symbol: 'USDC' };

/**
 * The local row's activity status in the terms the step timeline speaks. A
 * cancelled deposit reads as failed — the timeline has no cancelled state, and
 * neither outcome credited the account.
 */
function toPerpsFundsStatus(
  status: ActivityListItem['status'],
): PerpsDepositWithdrawalStatus {
  if (status === 'success') {
    return 'completed';
  }
  if (status === 'failed' || status === 'cancelled') {
    return 'failed';
  }
  return 'pending';
}

function useTradeAgain(asset: string | undefined) {
  const navigation = useNavigation<AppNavigationProp>();
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
        market: market as PerpsMarketData,
        source: PERPS_EVENT_VALUE.SOURCE.TRADE_DETAILS,
      },
    });
  }, [market, navigation]);
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
            testID={ActivityDetailsSelectorsIDs.SIZE_ROW}
          />
          <ActivityDetailRow
            label={getPerpsPriceLabel(fill)}
            value={getPerpsPriceValue(fill?.entryPrice)}
            testID={ActivityDetailsSelectorsIDs.PRICE_ROW}
          />
        </ActivityDetailSection>
      }
      details={
        <ActivityDetailSection>
          <ActivityDetailRow
            label={strings('perps.transactions.position.fees')}
            value={fill?.fee ? formatPositiveFiat(fill.fee) : undefined}
            testID={ActivityDetailsSelectorsIDs.FEES_ROW}
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
              testID={ActivityDetailsSelectorsIDs.PNL_ROW}
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
  const {
    totalFee,
    isLoading: isFeeLoading,
    hasError: hasFeeError,
  } = usePerpsRecordedOrderFees(
    order?.orderId,
    transaction.asset,
    transaction.timestamp,
  );
  const totalFeeValue =
    isFeeLoading || hasFeeError || totalFee === undefined
      ? '—'
      : formatPerpsOrderFee(totalFee);

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
            testID={ActivityDetailsSelectorsIDs.SIZE_ROW}
          />
          <ActivityDetailRow
            label={strings('perps.transactions.order.limit_price')}
            value={getPerpsPriceValue(order?.limitPrice)}
            testID={ActivityDetailsSelectorsIDs.LIMIT_PRICE_ROW}
          />
          <ActivityDetailRow
            label={strings('perps.transactions.order.filled')}
            value={order?.filled}
            testID={ActivityDetailsSelectorsIDs.FILLED_ROW}
          />
        </ActivityDetailSection>
      }
      details={
        <ActivityDetailSection>
          <ActivityDetailRow
            label={strings('perps.transactions.order.total_fee')}
            value={totalFeeValue}
            testID={ActivityDetailsSelectorsIDs.TOTAL_FEE_ROW}
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
            testID={ActivityDetailsSelectorsIDs.RATE_ROW}
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
            testID={ActivityDetailsSelectorsIDs.FUNDING_FEE_ROW}
          />
        </ActivityDetailSection>
      }
      footer={<ActivityDetailsPerpsExplorerButton />}
    />
  );
}

/**
 * The MetaMask Pay fee block above the step timeline, with the divider only
 * when both are present. Perps labels the network fee "Transaction fee".
 */
function PerpsFundsDetailsBody({
  pay,
  timeline,
}: {
  pay: MetamaskPayMetadata | undefined;
  timeline: React.ReactNode;
}) {
  if (!pay) {
    return <>{timeline}</>;
  }

  return (
    <>
      <ActivityDetailsPayFeesAndTotal
        pay={pay}
        networkFeeLabel={strings('activity_details.transaction_fee')}
      />
      <SectionDivider marginVertical={3} />
      {timeline}
    </>
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
  const openPerpsHome = useNavigateToPerpsHome();
  // Provider-backed rows carry no `metamaskPay`; it is resolved from the local
  // transaction behind this row's hash.
  const pay = useActivityPayFiat(item);
  const failure = usePayFundsFailure(item, {
    destination: PERPS_FUNDS_DESTINATION,
    payTotalFiat: pay?.totalFiat,
  });
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

  const isDeposit = transaction.type === 'deposit';

  return (
    <ActivityDetailsTemplateFrame
      hero={
        <ActivityDetailsPerpsHero
          amount={depositWithdrawal.amount}
          isPositive={depositWithdrawal.isPositive}
          symbol={depositWithdrawal.asset}
        />
      }
      metadata={
        <ActivityDetailsPerpsMetadata item={item} isDeposit={isDeposit} />
      }
      details={
        <PerpsFundsDetailsBody
          pay={isDeposit ? pay : undefined}
          timeline={
            <ActivityDetailsPerpsStepTimeline
              explorerTarget={stepExplorerTarget}
              failureMessage={failure?.message}
              status={depositWithdrawal.status}
              timestamp={item.timestamp}
              type={depositWithdrawal.type}
            />
          }
        />
      }
      footer={
        <ActivityDetailsDoItAgainButton
          label={getPerpsFundsCtaLabel(item.status, isDeposit)}
          onPress={openPerpsHome}
        />
      }
    />
  );
}

/**
 * A perps deposit/withdrawal that only exists as a local transaction — the
 * HyperLiquid feed has not returned it yet, which is the state the funding
 * toast's "Track" opens into. Renders the same shape as {@link FundsDetails}
 * from the local row, so both entry points land on the same screen.
 */
function LocalFundsDetails({ item }: { item: PerpsActivityListItem }) {
  const openPerpsHome = useNavigateToPerpsHome();
  const pay = useActivityPayFiat(item);
  const failure = usePayFundsFailure(item, {
    destination: PERPS_FUNDS_DESTINATION,
    payTotalFiat: pay?.totalFiat,
  });
  const formatActivityTokenAmount = useFormatActivityTokenAmount();
  const isDeposit = item.type === 'perpsAddFunds';
  const token = 'token' in item.data ? item.data.token : undefined;

  return (
    <ActivityDetailsTemplateFrame
      hero={
        <ActivityDetailsPerpsHero
          amount={formatActivityTokenAmount(token)}
          isPositive={isDeposit && item.status !== 'failed'}
          symbol={token?.symbol}
        />
      }
      metadata={
        <ActivityDetailsPerpsMetadata item={item} isDeposit={isDeposit} />
      }
      details={
        <PerpsFundsDetailsBody
          pay={isDeposit ? pay : undefined}
          timeline={
            <ActivityDetailsPerpsStepTimeline
              explorerTarget={
                item.hash
                  ? { chainId: item.chainId, hash: item.hash }
                  : undefined
              }
              failureMessage={failure?.message}
              status={toPerpsFundsStatus(item.status)}
              timestamp={item.timestamp}
              type={isDeposit ? 'deposit' : 'withdrawal'}
            />
          }
        />
      }
      footer={
        <ActivityDetailsDoItAgainButton
          label={getPerpsFundsCtaLabel(item.status, isDeposit)}
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
    if (item.type === 'perpsAddFunds' || item.type === 'perpsWithdraw') {
      return <LocalFundsDetails item={perpsItem} />;
    }
    return null;
  }

  if (transaction.type === 'trade') {
    return <TradeDetails item={perpsItem} transaction={transaction} />;
  }

  if (transaction.type === 'order') {
    return (
      <PerpsConnectionProvider suppressErrorView>
        <PerpsStreamProvider>
          <OrderDetails item={perpsItem} transaction={transaction} />
        </PerpsStreamProvider>
      </PerpsConnectionProvider>
    );
  }

  if (transaction.type === 'funding') {
    return <FundingDetails item={perpsItem} transaction={transaction} />;
  }

  if (transaction.type === 'deposit' || transaction.type === 'withdrawal') {
    return <FundsDetails item={perpsItem} transaction={transaction} />;
  }

  return null;
}
