import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  Box,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import type { CardScreensStackParamList } from '../../types/navigation';
import Engine from '../../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import { useTheme } from '../../../../../util/theme';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { useCardHeaderHandlers } from '../../hooks/useCardHeaderHandlers';
import {
  cardTransactionDisplayInfo,
  formatCardTransactionStatus,
  getCardTransactionHeroCopy,
  getCardTransactionStatusColor,
} from '../../utils/cardTransactionDisplayInfo';
import { formatCardAmount } from '../../utils/cardTransactionAmount';
import { getMerchantCategoryLabel } from '../../utils/merchantCategoryLabel';
import { getCardTransactionHeroToken } from '../../utils/getCardTransactionHeroToken';
import { getCardDeclineReasonLabel } from '../../utils/moneyAccountCardTransaction';
import CardTransactionDetailsContent from '../../components/CardTransactionDetailsContent/CardTransactionDetailsContent';
import { CardTransactionStatus } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import {
  selectCardDelegationToken,
  selectCardPrimaryToken,
} from '../../../../../selectors/cardController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import type { RootState } from '../../../../../reducers';
import {
  findBlockExplorerUrlForChain,
  getBlockExplorerTxUrl,
} from '../../../../../util/networks';
import { RPC } from '../../../../../constants/network';
import Routes from '../../../../../constants/navigation/Routes';
import { cardQueries } from '../../queries';

type CardTransactionDetailsRouteProp = RouteProp<
  CardScreensStackParamList,
  'CardTransactionDetails'
>;

const CardTransactionDetails = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<CardTransactionDetailsRouteProp>();
  const tw = useTailwind();
  const theme = useTheme();
  const headerHandlers = useCardHeaderHandlers('back');
  const { trackEvent, createEventBuilder } = useAnalytics();
  const hasTrackedOpen = useRef(false);
  const primaryToken = useSelector(selectCardPrimaryToken);
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const { transactionId, transaction: initialTransaction } = route.params;

  const {
    data: fetchedTransaction,
    isLoading,
    error,
  } = useQuery({
    queryKey: cardQueries.transactions.keys.detail(transactionId),
    queryFn: () =>
      Engine.context.CardController.getCardTransaction(transactionId),
    enabled: !initialTransaction && Boolean(Engine.context?.CardController),
  });

  const transaction = initialTransaction ?? fetchedTransaction;

  const iconFundingSource = transaction?.fundingSources.find(
    (fs) => fs.currency,
  );
  const fundingToken = useSelector((state: RootState) =>
    selectCardDelegationToken(state, {
      caipChainId: iconFundingSource?.chainId,
      symbol: iconFundingSource?.currency,
    }),
  );

  useEffect(() => {
    if (hasTrackedOpen.current) {
      return;
    }
    hasTrackedOpen.current = true;
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.CARD_TRANSACTION_DETAILS_OPENED,
      ).build(),
    );
  }, [createEventBuilder, trackEvent]);

  const display = useMemo(
    () => (transaction ? cardTransactionDisplayInfo(transaction) : null),
    [transaction],
  );

  const primaryAmount = useMemo(() => {
    if (!transaction) {
      return undefined;
    }
    const localAmount = transaction.originalAmount;
    if (
      localAmount &&
      localAmount.currency.toUpperCase() !==
        transaction.billingAmount.currency.toUpperCase()
    ) {
      return formatCardAmount(localAmount, transaction.isDebit);
    }
    return formatCardAmount(transaction.billingAmount, transaction.isDebit);
  }, [transaction]);

  const secondaryAmount = useMemo(() => {
    if (!transaction) {
      return undefined;
    }
    const localAmount = transaction.originalAmount;
    if (
      !localAmount ||
      localAmount.currency.toUpperCase() ===
        transaction.billingAmount.currency.toUpperCase()
    ) {
      return undefined;
    }
    return formatCardAmount(transaction.billingAmount, transaction.isDebit);
  }, [transaction]);

  const processedDateLabel = useMemo(() => {
    const timestamp = transaction?.processedAt ?? transaction?.timestamp;
    if (!timestamp) {
      return undefined;
    }
    return getIntlDateTimeFormatter(I18n.locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(new Date(timestamp));
  }, [transaction?.processedAt, transaction?.timestamp]);

  const locationLabel = useMemo(() => {
    const merchant = transaction?.merchant;
    if (!merchant) {
      return undefined;
    }
    return [merchant.city, merchant.countryCode].filter(Boolean).join(', ');
  }, [transaction?.merchant]);

  const categoryLabel = useMemo(
    () => getMerchantCategoryLabel(transaction?.merchant?.category),
    [transaction?.merchant?.category],
  );

  const heroToken = useMemo(
    () =>
      getCardTransactionHeroToken(transaction, fundingToken ?? primaryToken),
    [transaction, fundingToken, primaryToken],
  );

  const fundingSource = transaction?.fundingSources.find((fs) => fs.txHash);
  const displayTransactionId = transaction?.reference ?? transaction?.id;

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleReportPress = useCallback(() => {
    if (!transaction) {
      return;
    }
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.CARD_TRANSACTION_REPORT_STARTED,
      ).build(),
    );
    navigation.navigate(Routes.CARD.REPORT_TRANSACTION, {
      transactionId: transaction.id,
      transaction,
    });
  }, [createEventBuilder, navigation, trackEvent, transaction]);

  const handleViewOnExplorer = useCallback(() => {
    if (!fundingSource?.txHash || !fundingSource.chainId) {
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
    fundingSource?.chainId,
    fundingSource?.txHash,
    navigation,
    networkConfigurations,
  ]);

  if (isLoading && !transaction) {
    return (
      <SafeAreaView
        style={tw.style(
          'flex-1 bg-background-default items-center justify-center',
        )}
        edges={['bottom']}
      >
        <ActivityIndicator color={theme.colors.icon.alternative} />
      </SafeAreaView>
    );
  }

  if (error && !transaction) {
    return (
      <SafeAreaView
        style={tw.style('flex-1 bg-background-default')}
        edges={['bottom']}
      >
        <HeaderStandard
          title={strings('card.transactions.details_title')}
          includesTopInset
          twClassName="bg-background-default"
          {...headerHandlers}
        />
        <Box twClassName="flex-1 items-center justify-center px-8">
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('card.transactions.load_error')}
          </Text>
        </Box>
      </SafeAreaView>
    );
  }

  if (!transaction || !display || !primaryAmount || !processedDateLabel) {
    return null;
  }

  const isFailed = transaction.status === CardTransactionStatus.Failed;

  return (
    <CardTransactionDetailsContent
      heroCopy={getCardTransactionHeroCopy(transaction)}
      primaryAmount={primaryAmount}
      fiatAmount={secondaryAmount}
      amountColor={
        isFailed
          ? TextColor.ErrorDefault
          : display.isIncoming
            ? TextColor.SuccessDefault
            : TextColor.TextDefault
      }
      statusLabel={formatCardTransactionStatus(transaction.status)}
      statusColor={getCardTransactionStatusColor(transaction.status)}
      dateLabel={processedDateLabel}
      merchantName={transaction.merchant?.name}
      categoryLabel={categoryLabel}
      locationLabel={locationLabel}
      declineReason={getCardDeclineReasonLabel(transaction)}
      transactionId={displayTransactionId}
      heroToken={heroToken}
      onBack={handleBack}
      onReportPress={handleReportPress}
      onViewOnExplorer={
        fundingSource?.txHash ? handleViewOnExplorer : undefined
      }
    />
  );
};

export default CardTransactionDetails;
