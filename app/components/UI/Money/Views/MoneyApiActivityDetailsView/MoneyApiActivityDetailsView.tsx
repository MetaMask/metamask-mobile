import React, { useCallback, useMemo, useEffect } from 'react';
import { Image, ScrollView } from 'react-native';
import { BigNumber } from 'bignumber.js';
import { useSelector } from 'react-redux';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {
  AvatarNetwork,
  AvatarNetworkSize,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';

import {
  findBlockExplorerUrlForChain,
  getBlockExplorerTxUrl,
} from '../../../../../util/networks';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import { RPC } from '../../../../../constants/network';
import Routes from '../../../../../constants/navigation/Routes';
import I18n, { strings } from '../../../../../../locales/i18n';
import { TransactionDetailDivider } from '../../../../Views/confirmations/components/activity/transaction-detail-divider/transaction-detail-divider';
import { TransactionDetailsRow } from '../../../../Views/confirmations/components/activity/transaction-details-row/transaction-details-row';
import {
  ProgressList,
  ProgressListItem,
} from '../../../../Views/confirmations/components/progress-list';
import useNetworkInfo from '../../../../Views/confirmations/hooks/useNetworkInfo';
import { IconName as ComponentIconName } from '../../../../../component-library/components/Icons/Icon';
import Name from '../../../Name/Name';
import { NameType } from '../../../Name/Name.types';
import type {
  AccountsApiActivity,
  NeobankBankTransferActivity,
} from '../../types/moneyActivity';
import { accountsApiActivityDisplayInfo } from '../../utils/accountsApiActivityDisplayInfo';
import { moneyFormatUsd } from '../../utils/moneyFormatFiat';
import {
  isNeobankCompletedStatus,
  isNeobankFailedStatus,
  neobankActivityDisplayInfo,
} from '../../utils/neobankActivity';
import {
  selectMoneyEnableActivityDetailsBlockexplorerLinkFlag,
  selectMoneyVbaPendingActivityEnabled,
} from '../../selectors/featureFlags';
import { useNeobankAutorampActivity } from '../../hooks/useNeobankAutorampActivity';
import { useMoneyAccountTransactions } from '../../hooks/useMoneyAccountTransactions';
import MoneyIcon from '../../../../../images/money.png';
import { getMerchantCategoryLabel } from '../../../Card/utils/merchantCategoryLabel';
import {
  cardTransactionDisplayInfo,
  formatCardTransactionStatus,
} from '../../../Card/utils/cardTransactionDisplayInfo';
import { getCardDeclineReasonLabel } from '../../../Card/utils/moneyAccountCardTransaction';
import { formatNetworkFeeLabel } from '../../../Card/utils/cardTransactionAmount';
import CardTransactionDetailsContent from '../../../Card/components/CardTransactionDetailsContent/CardTransactionDetailsContent';
import {
  CardTransactionStatus,
  type CardTransaction,
  type CardTransactionMerchant,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { MONEY_ACCOUNT_DISPLAY_SYMBOL } from '../../../Card/util/vedaToken';
import type { MoneyTransactionDisplayInfo } from '../../hooks/useMoneyTransactionDisplayInfo';

/** Hero asset for Money Activity card details — always the Money Account token. */
const MONEY_ACCOUNT_HERO_TOKEN = {
  symbol: MONEY_ACCOUNT_DISPLAY_SYMBOL,
  iconSource: MoneyIcon,
  isMoneyAccount: true,
} as const;

const HERO_COPY_KEY: Record<AccountsApiActivity['kind'], string> = {
  card: 'money.api_activity_details.you_spent',
  cashback: 'money.api_activity_details.you_earned',
  refund: 'money.api_activity_details.you_were_refunded',
  bank_transfer: 'money.api_activity_details.you_deposited',
};

type ActivityDetailsRoute = RouteProp<
  {
    params?: {
      activity?: AccountsApiActivity;
      enrichment?: CardTransaction;
      cardTransaction?: CardTransaction;
      neobankActivity?: NeobankBankTransferActivity;
    };
  },
  'params'
>;

export function MoneyApiActivityDetailsView() {
  const navigation = useNavigation<AppNavigationProp>();
  const params = useRoute<ActivityDetailsRoute>().params;
  const activity = params?.activity;
  const enrichment = params?.enrichment;
  const cardTransaction = params?.cardTransaction;
  const routeNeobankActivity = params?.neobankActivity;
  const pendingVbaActivityEnabled = useSelector(
    selectMoneyVbaPendingActivityEnabled,
  );
  const { moneyAddress } = useMoneyAccountTransactions();
  const { activity: liveNeobankActivity } = useNeobankAutorampActivity(
    moneyAddress,
    Boolean(routeNeobankActivity),
  );
  const currentRouteIsAllowed =
    !routeNeobankActivity || pendingVbaActivityEnabled;
  const liveRouteActivity = routeNeobankActivity
    ? liveNeobankActivity.find((item) => item.id === routeNeobankActivity.id)
    : undefined;
  let neobankActivity: NeobankBankTransferActivity | undefined;
  if (currentRouteIsAllowed && routeNeobankActivity) {
    neobankActivity = liveRouteActivity ?? routeNeobankActivity;
  }

  useEffect(() => {
    if (routeNeobankActivity && !pendingVbaActivityEnabled) {
      navigation.goBack();
      return;
    }
    if (!activity && !cardTransaction && !neobankActivity) {
      navigation.goBack();
    }
  }, [
    activity,
    cardTransaction,
    neobankActivity,
    navigation,
    pendingVbaActivityEnabled,
    routeNeobankActivity,
  ]);

  if (cardTransaction) {
    return <MoneyDeclinedCardDetailsContent transaction={cardTransaction} />;
  }

  if (neobankActivity) {
    return <NeobankBankTransferDetailsContent activity={neobankActivity} />;
  }

  if (!activity) {
    return null;
  }

  if (activity.kind === 'card') {
    return (
      <MoneySettledCardDetailsContent
        activity={activity}
        enrichment={enrichment}
      />
    );
  }

  return <MoneyApiActivityDetailsContent activity={activity} />;
}

function formatActivityDate(timestamp: number): string {
  const date = new Date(timestamp);
  const month = getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
  }).format(date);
  const timeString = getIntlDateTimeFormatter(I18n.locale, {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date);
  return `${month} ${date.getDate()}, ${date.getFullYear()} at ${timeString}`;
}

/** Step subtitle: `10:35 AM • Jun 9, 2026` (matches TransactionDetailsSummary). */
function formatStepSubtitle(timestamp: number): string {
  const date = new Date(timestamp);
  const timeString = getIntlDateTimeFormatter(I18n.locale, {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date);
  const month = getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
  }).format(date);
  return `${timeString} • ${month} ${date.getDate()}, ${date.getFullYear()}`;
}

type BankTransferStepSeverity = 'success' | 'warning' | 'error';

/**
 * VBA / allowlisted bank-transfer deposit timeline.
 *
 * - MoonPay pay-in still open → all steps pending
 * - MoonPay Completed, mUSD not on-chain yet → bank transfer complete,
 * conversion and Money Account deposit pending
 * - Accounts API completed (confirmed settlement) → all steps complete
 * - Failed → a single failed bank-transfer step
 *
 * Every step shows the explorer icon. The icon opens the same transaction when
 * `onOpenExplorer` is available; otherwise it stays inert (no settlement hash).
 */
function BankTransferActivitySteps({
  timestamp,
  onOpenExplorer,
  bankTransferSeverity = 'success',
  convertedSeverity = 'success',
  moneyDepositSeverity = 'success',
  failed = false,
}: {
  readonly timestamp: number;
  readonly onOpenExplorer?: () => void;
  readonly bankTransferSeverity?: BankTransferStepSeverity;
  readonly convertedSeverity?: BankTransferStepSeverity;
  readonly moneyDepositSeverity?: BankTransferStepSeverity;
  readonly failed?: boolean;
}) {
  const subtitle = formatStepSubtitle(timestamp);
  const severities = failed
    ? [bankTransferSeverity]
    : [bankTransferSeverity, convertedSeverity, moneyDepositSeverity];
  const completedCount = severities.filter(
    (severity) => severity === 'success',
  ).length;

  return (
    <Box twClassName="gap-3" testID="money-bank-transfer-steps">
      <Text color={TextColor.TextAlternative}>
        {strings('transaction_details.label.steps_completed', {
          count: completedCount,
        })}
      </Text>
      <ProgressList showConnectors={false} variant="dot">
        <ProgressListItem
          key="bank-transfer"
          title={strings('money.transaction.bank_transfer')}
          subtitle={subtitle}
          severity={bankTransferSeverity}
          buttonIcon={ComponentIconName.ArrowSquareOut}
          onButtonPress={onOpenExplorer}
        />
        {failed ? null : (
          <ProgressListItem
            key="convert-to-musd"
            title={strings('transaction_details.title.musd_conversion')}
            subtitle={subtitle}
            severity={convertedSeverity}
            buttonIcon={ComponentIconName.ArrowSquareOut}
            onButtonPress={onOpenExplorer}
          />
        )}
        {failed ? null : (
          <ProgressListItem
            key="money-account-deposit"
            title={strings('transaction_details.title.money_account_deposit')}
            subtitle={subtitle}
            severity={moneyDepositSeverity}
            buttonIcon={ComponentIconName.ArrowSquareOut}
            onButtonPress={onOpenExplorer}
          />
        )}
      </ProgressList>
    </Box>
  );
}

function PaidByMetaMaskValue() {
  return (
    <Text color={TextColor.SuccessDefault}>
      {strings('money.api_activity_details.paid_by_metamask')}
    </Text>
  );
}

function merchantLocationLabel(
  merchant?: Pick<CardTransactionMerchant, 'city' | 'countryCode'>,
): string | undefined {
  if (!merchant) {
    return undefined;
  }
  const label = [merchant.city, merchant.countryCode]
    .filter(Boolean)
    .join(', ');
  return label || undefined;
}

function useGoBack() {
  const navigation = useNavigation<AppNavigationProp>();
  return useCallback(() => {
    navigation.goBack();
  }, [navigation]);
}

/**
 * Returns an explorer press handler when the flag is on and both chain + hash
 * are present; otherwise `undefined` so the explorer CTA stays hidden.
 */
function useOpenTxOnExplorer(
  chainId?: string,
  txHash?: string,
): (() => void) | undefined {
  const navigation = useNavigation<AppNavigationProp>();
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const blockExplorerLinkEnabled = useSelector(
    selectMoneyEnableActivityDetailsBlockexplorerLinkFlag,
  );

  const canOpen = Boolean(blockExplorerLinkEnabled && chainId && txHash);

  const open = useCallback(() => {
    if (!chainId || !txHash) {
      return;
    }
    const rpcBlockExplorer = findBlockExplorerUrlForChain(
      chainId,
      networkConfigurations,
    );
    const { url, title } = getBlockExplorerTxUrl(RPC, txHash, rpcBlockExplorer);
    if (!url) {
      return;
    }
    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: { url, title },
    });
  }, [chainId, txHash, navigation, networkConfigurations]);

  return canOpen ? open : undefined;
}

interface MoneyCardDetailsContentProps {
  readonly display: MoneyTransactionDisplayInfo;
  readonly heroCopy: string;
  readonly dateMs: number;
  readonly merchant?: CardTransactionMerchant;
  readonly declineSource?: CardTransaction;
  readonly transactionId?: string;
  readonly networkFeeLabel?: string;
  readonly statusLabel: string;
  readonly statusColor: TextColor;
  readonly amountColor: TextColor;
  readonly explorerChainId?: string;
  readonly explorerTxHash?: string;
}

function MoneyCardDetailsContent({
  display,
  heroCopy,
  dateMs,
  merchant,
  declineSource,
  transactionId,
  networkFeeLabel,
  statusLabel,
  statusColor,
  amountColor,
  explorerChainId,
  explorerTxHash,
}: MoneyCardDetailsContentProps) {
  const handleBack = useGoBack();
  const onViewOnExplorer = useOpenTxOnExplorer(explorerChainId, explorerTxHash);

  const categoryLabel = useMemo(
    () => getMerchantCategoryLabel(merchant?.category),
    [merchant?.category],
  );
  const locationLabel = useMemo(
    () => merchantLocationLabel(merchant),
    [merchant],
  );
  const dateLabel = useMemo(() => formatActivityDate(dateMs), [dateMs]);

  return (
    <CardTransactionDetailsContent
      heroCopy={heroCopy}
      primaryAmount={display.primaryAmount}
      fiatAmount={display.fiatAmount || undefined}
      amountColor={amountColor}
      statusLabel={statusLabel}
      statusColor={statusColor}
      dateLabel={dateLabel}
      merchantName={merchant?.name}
      categoryLabel={categoryLabel}
      locationLabel={locationLabel}
      declineReason={getCardDeclineReasonLabel(declineSource)}
      transactionId={transactionId}
      networkFeeLabel={networkFeeLabel}
      heroToken={MONEY_ACCOUNT_HERO_TOKEN}
      heroIconTestID="money-account-hero-icon"
      onBack={handleBack}
      onViewOnExplorer={onViewOnExplorer}
    />
  );
}

interface MoneyDeclinedCardDetailsContentProps {
  readonly transaction: CardTransaction;
}

function MoneyDeclinedCardDetailsContent({
  transaction,
}: MoneyDeclinedCardDetailsContentProps) {
  const display = useMemo(
    () => cardTransactionDisplayInfo(transaction),
    [transaction],
  );
  const isFailed = transaction.status === CardTransactionStatus.Failed;
  const fundingSource = transaction.fundingSources.find((fs) => fs.txHash);

  return (
    <MoneyCardDetailsContent
      display={display}
      heroCopy={strings('money.api_activity_details.you_spent')}
      dateMs={transaction.timestamp}
      merchant={transaction.merchant}
      declineSource={transaction}
      transactionId={transaction.reference ?? transaction.id}
      networkFeeLabel={formatNetworkFeeLabel(
        transaction.feeAmount,
        MONEY_ACCOUNT_DISPLAY_SYMBOL,
      )}
      statusLabel={formatCardTransactionStatus(transaction.status)}
      statusColor={isFailed ? TextColor.ErrorDefault : TextColor.SuccessDefault}
      amountColor={isFailed ? TextColor.ErrorDefault : TextColor.TextDefault}
      explorerChainId={fundingSource?.chainId}
      explorerTxHash={fundingSource?.txHash}
    />
  );
}

interface MoneySettledCardDetailsContentProps {
  readonly activity: Extract<AccountsApiActivity, { kind: 'card' }>;
  readonly enrichment?: CardTransaction;
}

function MoneySettledCardDetailsContent({
  activity,
  enrichment,
}: MoneySettledCardDetailsContentProps) {
  const display = useMemo(
    () => accountsApiActivityDisplayInfo(activity, enrichment),
    [activity, enrichment],
  );

  return (
    <MoneyCardDetailsContent
      display={display}
      heroCopy={strings(HERO_COPY_KEY[activity.kind])}
      dateMs={activity.time}
      merchant={enrichment?.merchant}
      declineSource={enrichment}
      transactionId={enrichment?.reference}
      networkFeeLabel={formatNetworkFeeLabel(
        enrichment?.feeAmount,
        MONEY_ACCOUNT_DISPLAY_SYMBOL,
      )}
      statusLabel={strings('money.api_activity_details.completed')}
      statusColor={TextColor.SuccessDefault}
      amountColor={
        display.isIncoming ? TextColor.SuccessDefault : TextColor.TextDefault
      }
      explorerChainId={activity.chainId}
      explorerTxHash={activity.hash}
    />
  );
}

interface MoneyApiActivityDetailsContentProps {
  readonly activity: Exclude<AccountsApiActivity, { kind: 'card' }>;
}

function MoneyApiActivityDetailsContent({
  activity,
}: MoneyApiActivityDetailsContentProps) {
  const tw = useTailwind();
  const { networkName, networkImage } = useNetworkInfo(activity.chainId);
  const handleBack = useGoBack();
  const handleViewOnExplorer = useOpenTxOnExplorer(
    activity.chainId,
    activity.hash,
  );

  const display = useMemo(
    () => accountsApiActivityDisplayInfo(activity),
    [activity],
  );

  const formattedDate = useMemo(
    () => formatActivityDate(activity.time),
    [activity.time],
  );

  const isBankTransfer = activity.kind === 'bank_transfer';
  const usdAmount = useMemo(
    () => new BigNumber(activity.amount).shiftedBy(-activity.token.decimals),
    [activity.amount, activity.token.decimals],
  );
  const formattedUsdAmount = moneyFormatUsd(usdAmount);

  return (
    <Box twClassName="flex-1 bg-background-default">
      <HeaderStandard
        title={display.label}
        onBack={handleBack}
        backButtonProps={{ testID: 'card-transaction-details-back-button' }}
        includesTopInset
      />
      <ScrollView>
        <Box twClassName="gap-3 px-4">
          <Box twClassName="gap-1">
            {isBankTransfer ? null : (
              <Text color={TextColor.TextAlternative}>
                {strings(HERO_COPY_KEY[activity.kind])}
              </Text>
            )}
            <Box twClassName="flex-row items-center gap-3">
              <Image
                source={MoneyIcon}
                style={tw.style('w-8 h-8 rounded-full')}
                testID="money-account-hero-icon"
              />
              <Text
                variant={TextVariant.DisplayMd}
                color={
                  display.isIncoming
                    ? TextColor.SuccessDefault
                    : TextColor.TextDefault
                }
              >
                {isBankTransfer
                  ? `+US${formattedUsdAmount}`
                  : display.primaryAmount}
              </Text>
            </Box>
          </Box>

          <TransactionDetailDivider />

          <TransactionDetailsRow label={strings('transactions.status')}>
            <Text color={TextColor.SuccessDefault}>
              {strings('money.api_activity_details.completed')}
            </Text>
          </TransactionDetailsRow>

          <TransactionDetailsRow
            label={strings('money.api_activity_details.date')}
          >
            <Text>{formattedDate}</Text>
          </TransactionDetailsRow>

          {isBankTransfer ? (
            <TransactionDetailsRow
              label={strings('money.api_activity_details.paid_with')}
            >
              <Text>{strings('money.transaction.bank_transfer')}</Text>
            </TransactionDetailsRow>
          ) : null}

          {!isBankTransfer && networkName ? (
            <TransactionDetailsRow
              label={strings('transaction_details.label.network')}
            >
              <Box twClassName="flex-row items-center gap-1.5">
                <AvatarNetwork
                  name={networkName}
                  src={networkImage}
                  size={AvatarNetworkSize.Xs}
                />
                <Text>{networkName}</Text>
              </Box>
            </TransactionDetailsRow>
          ) : null}

          {isBankTransfer ? null : (
            <TransactionDetailsRow
              label={strings('money.api_activity_details.received_from')}
            >
              <Name
                type={NameType.EthereumAddress}
                value={activity.receivedFrom}
                variation={activity.chainId}
              />
            </TransactionDetailsRow>
          )}

          {isBankTransfer ? (
            <>
              <TransactionDetailDivider />
              <TransactionDetailsRow
                label={strings('money.api_activity_details.transaction_fees')}
              >
                <PaidByMetaMaskValue />
              </TransactionDetailsRow>
              <TransactionDetailsRow
                label={strings('money.api_activity_details.total')}
              >
                <Text>{formattedUsdAmount}</Text>
              </TransactionDetailsRow>
              <TransactionDetailDivider />
              {/* Completed API bank transfers are confirmed settlements, so
                  the off-chain transfer, conversion, and mUSD deposit are
                  all done. */}
              <BankTransferActivitySteps
                timestamp={activity.time}
                onOpenExplorer={handleViewOnExplorer}
              />
            </>
          ) : null}

          {!isBankTransfer && handleViewOnExplorer ? (
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleViewOnExplorer}
              startIconName={IconName.ArrowSquareOut}
              testID="card-transaction-details-explorer-button"
            >
              {strings('transaction_details.view_on_block_explorer')}
            </Button>
          ) : null}
        </Box>
      </ScrollView>
    </Box>
  );
}

interface NeobankBankTransferDetailsContentProps {
  readonly activity: NeobankBankTransferActivity;
}

function NeobankBankTransferDetailsContent({
  activity,
}: NeobankBankTransferDetailsContentProps) {
  const tw = useTailwind();
  const handleBack = useGoBack();

  const display = useMemo(
    () => neobankActivityDisplayInfo(activity),
    [activity],
  );
  const formattedDate = useMemo(
    () => formatActivityDate(activity.time),
    [activity.time],
  );

  const failed = isNeobankFailedStatus(activity.status);
  const payinCompleted = isNeobankCompletedStatus(activity.status);
  const handleViewOnExplorer = useOpenTxOnExplorer(
    CHAIN_IDS.MONAD,
    activity.transactionHash,
  );

  // Provider Completed confirms the bank pay-in only. Main's confirmed on-chain
  // TransactionMeta is displayed separately through the existing flow.
  let bankTransferSeverity: BankTransferStepSeverity = 'warning';
  if (failed) {
    bankTransferSeverity = 'error';
  } else if (payinCompleted) {
    bankTransferSeverity = 'success';
  }

  // Overall status stays Pending until mUSD is on-chain (this view is replaced
  // by the Accounts API bank_transfer detail once that lands).
  const statusLabel = failed
    ? strings('money.transaction.failed')
    : strings('money.api_activity_details.pending');
  const statusColor = failed
    ? TextColor.ErrorDefault
    : TextColor.WarningDefault;

  const totalAmount = useMemo(() => {
    if (failed) {
      return moneyFormatUsd(new BigNumber(0));
    }
    const destination = new BigNumber(activity.destinationAmount ?? 'NaN');
    if (!destination.isFinite() || !destination.isGreaterThan(0)) {
      return undefined;
    }
    return moneyFormatUsd(destination);
  }, [activity.destinationAmount, failed]);

  return (
    <Box twClassName="flex-1 bg-background-default">
      <HeaderStandard
        title={display.label}
        onBack={handleBack}
        backButtonProps={{ testID: 'card-transaction-details-back-button' }}
        includesTopInset
      />
      <ScrollView>
        <Box twClassName="gap-3 px-4">
          <Box twClassName="gap-1">
            {failed ? null : (
              <Text color={TextColor.TextAlternative}>
                {strings('money.transaction.depositing')}
              </Text>
            )}
            <Box twClassName="flex-row items-center gap-3">
              <Image
                source={MoneyIcon}
                style={tw.style('w-8 h-8 rounded-full')}
                testID="money-account-hero-icon"
              />
              {failed ? (
                <Text
                  variant={TextVariant.DisplayMd}
                  color={TextColor.TextAlternative}
                >
                  {`US${totalAmount}`}
                </Text>
              ) : null}
            </Box>
          </Box>

          <TransactionDetailDivider />

          <TransactionDetailsRow label={strings('transactions.status')}>
            <Text color={statusColor}>{statusLabel}</Text>
          </TransactionDetailsRow>

          <TransactionDetailsRow
            label={strings('money.api_activity_details.date')}
          >
            <Text>{formattedDate}</Text>
          </TransactionDetailsRow>

          <TransactionDetailsRow
            label={strings('money.api_activity_details.paid_with')}
          >
            <Text>{strings('money.transaction.bank_transfer')}</Text>
          </TransactionDetailsRow>

          <TransactionDetailDivider />
          <TransactionDetailsRow
            label={strings('money.api_activity_details.transaction_fees')}
          >
            <PaidByMetaMaskValue />
          </TransactionDetailsRow>
          <TransactionDetailsRow
            label={strings('money.api_activity_details.total')}
          >
            <Text>{totalAmount}</Text>
          </TransactionDetailsRow>
          <TransactionDetailDivider />
          <BankTransferActivitySteps
            timestamp={activity.time}
            onOpenExplorer={handleViewOnExplorer}
            failed={failed}
            bankTransferSeverity={bankTransferSeverity}
            convertedSeverity="warning"
            moneyDepositSeverity="warning"
          />
        </Box>
      </ScrollView>
    </Box>
  );
}
