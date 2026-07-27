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
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { selectCardPrimaryToken } from '../../../../../selectors/cardController';

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
import { getCardTransactionHeroToken } from '../../../Card/utils/getCardTransactionHeroToken';
import { getCardDeclineReasonLabel } from '../../../Card/utils/cardDeclineReason';
import CardTransactionDetailsContent from '../../../Card/components/CardTransactionDetailsContent/CardTransactionDetailsContent';
import {
  CardTransactionStatus,
  type CardTransaction,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { MONEY_ACCOUNT_DISPLAY_SYMBOL } from '../../../Card/util/vedaToken';

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
  const navigation = useNavigation();
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

function useCardTransactionExplorerHandler(
  transaction: CardTransaction | undefined,
) {
  const navigation = useNavigation();
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const blockExplorerLinkEnabled = useSelector(
    selectMoneyEnableActivityDetailsBlockexplorerLinkFlag,
  );

  const fundingSource = transaction?.fundingSources.find((fs) => fs.txHash);

  return useCallback(() => {
    if (
      !blockExplorerLinkEnabled ||
      !fundingSource?.txHash ||
      !fundingSource.chainId
    ) {
      return;
    }
    const rpcBlockExplorer = findBlockExplorerUrlForChain(
      fundingSource.chainId,
      networkConfigurations,
    );
    const { url, title } = getBlockExplorerTxUrl(
      RPC,
      fundingSource.txHash,
      rpcBlockExplorer,
    );
    if (!url) {
      return;
    }
    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: { url, title },
    });
  }, [
    blockExplorerLinkEnabled,
    fundingSource?.chainId,
    fundingSource?.txHash,
    navigation,
    networkConfigurations,
  ]);
}

function MoneyCardProviderDetailsContent({
  transaction,
}: {
  transaction: CardTransaction;
}) {
  const navigation = useNavigation();
  const primaryToken = useSelector(selectCardPrimaryToken);
  const blockExplorerLinkEnabled = useSelector(
    selectMoneyEnableActivityDetailsBlockexplorerLinkFlag,
  );
  const hasExplorerHash = transaction.fundingSources.some((fs) => fs.txHash);

  const display = useMemo(
    () => cardTransactionDisplayInfo(transaction),
    [transaction],
  );

  const categoryLabel = useMemo(
    () => getMerchantCategoryLabel(transaction.merchant?.category),
    [transaction.merchant?.category],
  );

  const locationLabel = useMemo(() => {
    const merchant = transaction.merchant;
    if (!merchant) {
      return undefined;
    }
    return [merchant.city, merchant.countryCode].filter(Boolean).join(', ');
  }, [transaction.merchant]);

  const formattedDate = useMemo(
    () => formatActivityDate(transaction.processedAt ?? transaction.timestamp),
    [transaction.processedAt, transaction.timestamp],
  );

  const heroToken = useMemo(
    () => getCardTransactionHeroToken(transaction, primaryToken),
    [transaction, primaryToken],
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleViewOnExplorer = useCardTransactionExplorerHandler(transaction);

  const transactionId = transaction.reference ?? transaction.id;

  const isFailed = transaction.status === CardTransactionStatus.Failed;

  return (
    <CardTransactionDetailsContent
      heroCopy={strings('money.api_activity_details.you_spent')}
      primaryAmount={display.primaryAmount}
      fiatAmount={display.fiatAmount || undefined}
      amountColor={isFailed ? TextColor.ErrorDefault : TextColor.TextDefault}
      statusLabel={formatCardTransactionStatus(transaction.status)}
      statusColor={isFailed ? TextColor.ErrorDefault : TextColor.SuccessDefault}
      dateLabel={formattedDate}
      merchantName={transaction.merchant?.name}
      categoryLabel={categoryLabel}
      locationLabel={locationLabel}
      declineReason={getCardDeclineReasonLabel(transaction)}
      transactionId={transactionId}
      heroToken={heroToken}
      onBack={handleBack}
      onViewOnExplorer={
        blockExplorerLinkEnabled && hasExplorerHash
          ? handleViewOnExplorer
          : undefined
      }
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
  const navigation = useNavigation();
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const blockExplorerLinkEnabled = useSelector(
    selectMoneyEnableActivityDetailsBlockexplorerLinkFlag,
  );

  const display = useMemo(
    () => accountsApiActivityDisplayInfo(activity, enrichment),
    [activity, enrichment],
  );

  const categoryLabel = useMemo(
    () => getMerchantCategoryLabel(enrichment?.merchant?.category),
    [enrichment?.merchant?.category],
  );

  const locationLabel = useMemo(() => {
    if (!enrichment?.merchant) {
      return undefined;
    }
    return [enrichment.merchant.city, enrichment.merchant.countryCode]
      .filter(Boolean)
      .join(', ');
  }, [enrichment?.merchant]);

  const formattedDate = useMemo(
    () => formatActivityDate(activity.time),
    [activity.time],
  );

  const heroToken = useMemo(
    () => ({
      symbol: MONEY_ACCOUNT_DISPLAY_SYMBOL,
      iconSource: MoneyIcon,
    }),
    [],
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleViewOnExplorer = useCallback(() => {
    const rpcBlockExplorer = findBlockExplorerUrlForChain(
      activity.chainId,
      networkConfigurations,
    );
    const { url, title } = getBlockExplorerTxUrl(
      RPC,
      activity.hash,
      rpcBlockExplorer,
    );
    if (!url) {
      return;
    }
    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: { url, title },
    });
  }, [activity.chainId, activity.hash, navigation, networkConfigurations]);

  return (
    <CardTransactionDetailsContent
      heroCopy={strings(HERO_COPY_KEY[activity.kind])}
      primaryAmount={display.primaryAmount}
      fiatAmount={display.fiatAmount || undefined}
      amountColor={
        display.isIncoming ? TextColor.SuccessDefault : TextColor.TextDefault
      }
      statusLabel={strings('money.api_activity_details.completed')}
      statusColor={TextColor.SuccessDefault}
      dateLabel={formattedDate}
      merchantName={enrichment?.merchant?.name}
      categoryLabel={categoryLabel}
      locationLabel={locationLabel}
      declineReason={getCardDeclineReasonLabel(enrichment)}
      transactionId={enrichment?.reference}
      heroToken={heroToken}
      heroIconTestID="money-account-hero-icon"
      onBack={handleBack}
      onViewOnExplorer={
        blockExplorerLinkEnabled && activity.hash
          ? handleViewOnExplorer
          : undefined
      }
    />
  );
}

function MoneyApiActivityDetailsContent({
  activity,
}: {
  activity: Exclude<AccountsApiActivity, { kind: 'card' }>;
}) {
  const tw = useTailwind();
  const navigation = useNavigation();
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const blockExplorerLinkEnabled = useSelector(
    selectMoneyEnableActivityDetailsBlockexplorerLinkFlag,
  );
  const { networkName, networkImage } = useNetworkInfo(activity.chainId);

  const display = useMemo(
    () => accountsApiActivityDisplayInfo(activity),
    [activity],
  );

  const formattedDate = useMemo(
    () => formatActivityDate(activity.time),
    [activity.time],
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleViewOnExplorer = useCallback(() => {
    const rpcBlockExplorer = findBlockExplorerUrlForChain(
      activity.chainId,
      networkConfigurations,
    );
    const { url, title } = getBlockExplorerTxUrl(
      RPC,
      activity.hash,
      rpcBlockExplorer,
    );
    if (!url) {
      return;
    }
    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: { url, title },
    });
  }, [activity.chainId, activity.hash, navigation, networkConfigurations]);

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

          {blockExplorerLinkEnabled ? (
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
