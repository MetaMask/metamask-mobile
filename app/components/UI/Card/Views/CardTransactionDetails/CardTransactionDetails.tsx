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
} from '../../utils/cardTransactionDisplayInfo';
import { getMerchantCategoryLabel } from '../../utils/merchantCategoryLabel';
import { getCardTransactionHeroToken } from '../../utils/getCardTransactionHeroToken';
import { getCardDeclineReasonLabel } from '../../utils/cardDeclineReason';
import CardTransactionDetailsContent from '../../components/CardTransactionDetailsContent/CardTransactionDetailsContent';
import { CardTransactionStatus } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { selectCardPrimaryToken } from '../../../../../selectors/cardController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import {
  findBlockExplorerUrlForChain,
  getBlockExplorerTxUrl,
} from '../../../../../util/networks';
import { RPC } from '../../../../../constants/network';
import Routes from '../../../../../constants/navigation/Routes';

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
    queryKey: ['cardTransaction', transactionId],
    queryFn: () =>
      Engine.context.CardController.getCardTransaction(transactionId),
    enabled: !initialTransaction && Boolean(Engine.context?.CardController),
  });

  const transaction = initialTransaction ?? fetchedTransaction;

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
    () => getCardTransactionHeroToken(transaction, primaryToken),
    [transaction, primaryToken],
  );

  const fundingSource = transaction?.fundingSources.find((fs) => fs.txHash);
  const displayTransactionId = transaction?.reference ?? transaction?.id;

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleReportPress = useCallback(() => undefined, []);

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

  if (!transaction || !display || !processedDateLabel) {
    return null;
  }

  const isFailed = transaction.status === CardTransactionStatus.Failed;

  return (
    <CardTransactionDetailsContent
      heroCopy={strings('money.api_activity_details.you_spent')}
      primaryAmount={display.primaryAmount}
      fiatAmount={display.fiatAmount || undefined}
      amountColor={
        isFailed
          ? TextColor.ErrorDefault
          : display.isIncoming
            ? TextColor.SuccessDefault
            : TextColor.TextDefault
      }
      statusLabel={formatCardTransactionStatus(transaction.status)}
      statusColor={isFailed ? TextColor.ErrorDefault : TextColor.SuccessDefault}
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
