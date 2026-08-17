import React, { useCallback, useMemo, useEffect } from 'react';
import { Image, ScrollView } from 'react-native';
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
import useNetworkInfo from '../../../../Views/confirmations/hooks/useNetworkInfo';
import Name from '../../../Name/Name';
import { NameType } from '../../../Name/Name.types';
import type { AccountsApiActivity } from '../../types/moneyActivity';
import { accountsApiActivityDisplayInfo } from '../../utils/accountsApiActivityDisplayInfo';
import { selectMoneyEnableActivityDetailsBlockexplorerLinkFlag } from '../../selectors/featureFlags';
import MoneyIcon from '../../../../../images/money.png';
import { getMerchantCategoryLabel } from '../../../Card/utils/merchantCategoryLabel';
import {
  cardTransactionDisplayInfo,
  formatCardTransactionStatus,
} from '../../../Card/utils/cardTransactionDisplayInfo';
import { getCardDeclineReasonLabel } from '../../../Card/utils/moneyAccountCardTransaction';
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
} as const;

const HERO_COPY_KEY: Record<AccountsApiActivity['kind'], string> = {
  card: 'money.api_activity_details.you_spent',
  cashback: 'money.api_activity_details.you_earned',
  refund: 'money.api_activity_details.you_were_refunded',
};

type ActivityDetailsRoute = RouteProp<
  {
    params?: {
      activity?: AccountsApiActivity;
      enrichment?: CardTransaction;
      cardTransaction?: CardTransaction;
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

  useEffect(() => {
    if (!activity && !cardTransaction) {
      navigation.goBack();
    }
  }, [activity, cardTransaction, navigation]);

  if (cardTransaction) {
    return <MoneyCardProviderDetailsContent transaction={cardTransaction} />;
  }

  if (!activity) {
    return null;
  }

  if (activity.kind === 'card') {
    return (
      <MoneyCardActivityDetailsContent
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
  display: MoneyTransactionDisplayInfo;
  heroCopy: string;
  dateMs: number;
  merchant?: CardTransactionMerchant;
  declineSource?: CardTransaction;
  transactionId?: string;
  statusLabel: string;
  statusColor: TextColor;
  amountColor: TextColor;
  explorerChainId?: string;
  explorerTxHash?: string;
}

function MoneyCardDetailsContent({
  display,
  heroCopy,
  dateMs,
  merchant,
  declineSource,
  transactionId,
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
      heroToken={MONEY_ACCOUNT_HERO_TOKEN}
      heroIconTestID="money-account-hero-icon"
      onBack={handleBack}
      onViewOnExplorer={onViewOnExplorer}
    />
  );
}

function MoneyCardProviderDetailsContent({
  transaction,
}: {
  transaction: CardTransaction;
}) {
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
      statusLabel={formatCardTransactionStatus(transaction.status)}
      statusColor={isFailed ? TextColor.ErrorDefault : TextColor.SuccessDefault}
      amountColor={isFailed ? TextColor.ErrorDefault : TextColor.TextDefault}
      explorerChainId={fundingSource?.chainId}
      explorerTxHash={fundingSource?.txHash}
    />
  );
}

function MoneyCardActivityDetailsContent({
  activity,
  enrichment,
}: {
  activity: Extract<AccountsApiActivity, { kind: 'card' }>;
  enrichment?: CardTransaction;
}) {
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

function MoneyApiActivityDetailsContent({
  activity,
}: {
  activity: Exclude<AccountsApiActivity, { kind: 'card' }>;
}) {
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
            <Text color={TextColor.TextAlternative}>
              {strings(HERO_COPY_KEY[activity.kind])}
            </Text>
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
                {display.primaryAmount}
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

          {networkName ? (
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

          <TransactionDetailsRow
            label={strings('money.api_activity_details.received_from')}
          >
            <Name
              type={NameType.EthereumAddress}
              value={activity.receivedFrom}
              variation={activity.chainId}
            />
          </TransactionDetailsRow>

          {handleViewOnExplorer ? (
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleViewOnExplorer}
              startIconName={IconName.Export}
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
