import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CaipChainId } from '@metamask/utils';
import {
  type RampsOrder,
  type RampsOrderStatus,
  RampsOrderStatus as Status,
} from '@metamask/ramps-controller';
import {
  Box,
  Text,
  TextVariant,
  BoxAlignItems,
  BoxJustifyContent,

  Button,
  ButtonVariant,
  ButtonSize} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

import Routes from '../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../util/navigation/navUtils';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';

import { useRampsController } from '../../hooks/useRampsController';
import { useRampsQuotes } from '../../hooks/useRampsQuotes';
import { useTransakController } from '../../hooks/useTransakController';
import { useTransakRouting } from '../../hooks/useTransakRouting';
import useRampAccountAddress from '../../hooks/useRampAccountAddress';
import { getRampCallbackBaseUrl } from '../../utils/getRampCallbackBaseUrl';
import { parseUserFacingError } from '../../utils/parseUserFacingError';
import { createCheckoutNavDetails } from '../Checkout';
import { createV2EnterEmailNavDetails } from '../NativeFlow/EnterEmail';
import {
  isNativeProvider,
  getQuoteProviderName,
  getQuoteBuyUserAgent,
} from '../../types';
import { FIAT_ORDER_PROVIDERS } from '../../../../../constants/on-ramp';

import ScreenLayout from '../../Aggregator/components/ScreenLayout';

export interface HeadlessBuyParams {
  assetId: string;
  paymentMethodId: string;
  amount: number;
}

const TERMINAL_STATUSES = new Set<RampsOrderStatus>([
  Status.Completed,
  Status.Failed,
  Status.Cancelled,
  Status.IdExpired,
]);

const QUOTE_TIMEOUT_MS = 30_000;

export const createHeadlessBuyNavDetails = (params: HeadlessBuyParams) =>
  [
    Routes.RAMP.TOKEN_SELECTION,
    {
      screen: Routes.RAMP.TOKEN_SELECTION,
      params: { screen: Routes.RAMP.HEADLESS_BUY, params },
    },
  ] as const;

function HeadlessBuy() {
  const navigation = useNavigation();
  const params = useParams<HeadlessBuyParams>();
  const { assetId, paymentMethodId, amount } = params;

  const [error, setError] = useState<string | null>(null);
  const [proceeding, setProceeding] = useState(false);
  const hasProceededRef = useRef(false);

  const {
    selectedProvider,
    selectedToken,
    setSelectedToken,
    setSelectedPaymentMethod,
    getWidgetUrl,
    userRegion,
    paymentMethods,
    paymentMethodsLoading,
  } = useRampsController();

  const {
    checkExistingToken: transakCheckExistingToken,
    getBuyQuote: transakGetBuyQuote,
  } = useTransakController();

  const { routeAfterAuthentication: transakRouteAfterAuth } =
    useTransakRouting();

  const currency = userRegion?.country?.currency || 'USD';

  useEffect(() => {
    if (assetId) {
      setSelectedToken(assetId);
    }
  }, [assetId, setSelectedToken]);

  useEffect(() => {
    if (
      paymentMethodId &&
      !paymentMethodsLoading &&
      paymentMethods.length > 0
    ) {
      const pm = paymentMethods.find((m) => m.id === paymentMethodId);
      if (pm) {
        setSelectedPaymentMethod(pm);
      } else {
        setError(strings('deposit.buildQuote.unexpectedError'));
      }
    }
  }, [
    paymentMethodId,
    paymentMethods,
    paymentMethodsLoading,
    setSelectedPaymentMethod,
  ]);

  const walletAddress = useRampAccountAddress(
    selectedToken?.chainId as CaipChainId,
  );

  const quoteFetchParams = useMemo(
    () =>
      selectedToken?.assetId &&
      walletAddress &&
      selectedProvider &&
      paymentMethodId &&
      amount > 0
        ? {
            assetId: selectedToken.assetId,
            amount,
            walletAddress,
            redirectUrl: getRampCallbackBaseUrl(),
            paymentMethods: [paymentMethodId],
            providers: [selectedProvider.id],
            forceRefresh: true,
          }
        : null,
    [
      selectedToken?.assetId,
      walletAddress,
      selectedProvider,
      paymentMethodId,
      amount,
    ],
  );

  const {
    data: quotesResponse,
    loading: quoteLoading,
    error: quoteFetchError,
  } = useRampsQuotes(quoteFetchParams);

  const selectedQuote = useMemo(() => {
    if (!quotesResponse?.success || !selectedProvider) return null;
    const { success } = quotesResponse;
    if (success.length === 1) {
      return success[0].provider === selectedProvider.id ? success[0] : null;
    }
    if (success.length > 1) {
      const match = success.find(
        (q) =>
          q.provider === selectedProvider.id &&
          q.quote?.paymentMethod === paymentMethodId,
      );
      return match ?? null;
    }
    return null;
  }, [quotesResponse, selectedProvider, paymentMethodId]);

  useEffect(() => {
    if (quoteFetchError) {
      setError(
        parseUserFacingError(
          quoteFetchError,
          strings('deposit.buildQuote.quoteFetchError'),
        ),
      );
    }
  }, [quoteFetchError]);

  useEffect(() => {
    if (!quoteFetchParams || quoteLoading) return;
    const timer = setTimeout(() => {
      if (!quotesResponse && !quoteFetchError) {
        setError(strings('deposit.buildQuote.quoteFetchError'));
      }
    }, QUOTE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [quoteFetchParams, quoteLoading, quotesResponse, quoteFetchError]);

  const proceedWithQuote = useCallback(async () => {
    if (!selectedQuote || !selectedProvider || hasProceededRef.current) return;
    hasProceededRef.current = true;
    setProceeding(true);

    try {
      if (isNativeProvider(selectedQuote)) {
        const hasToken = await transakCheckExistingToken();
        if (hasToken) {
          const quote = await transakGetBuyQuote(
            currency,
            selectedToken?.assetId || '',
            selectedToken?.chainId || '',
            paymentMethodId,
            String(amount),
          );
          if (!quote) {
            throw new Error(strings('deposit.buildQuote.unexpectedError'));
          }
          await transakRouteAfterAuth(quote);
        } else {
          navigation.navigate(
            ...createV2EnterEmailNavDetails({
              amount: String(amount),
              currency,
              assetId: selectedToken?.assetId,
            }),
          );
        }
        return;
      }

      const fetchedWidgetUrl = await getWidgetUrl(selectedQuote);
      if (fetchedWidgetUrl) {
        const providerCode = selectedQuote.provider.startsWith('/providers/')
          ? selectedQuote.provider.split('/')[2] || selectedQuote.provider
          : selectedQuote.provider;
        const chainId = selectedToken?.chainId as CaipChainId | undefined;
        const network = chainId?.includes(':')
          ? chainId.split(':')[1] || ''
          : chainId || '';

        navigation.navigate(
          ...createCheckoutNavDetails({
            url: fetchedWidgetUrl,
            providerName:
              selectedProvider?.name || getQuoteProviderName(selectedQuote),
            userAgent: getQuoteBuyUserAgent(selectedQuote),
            providerCode,
            providerType: FIAT_ORDER_PROVIDERS.RAMPS_V2,
            walletAddress: walletAddress ?? undefined,
            network,
            currency,
            cryptocurrency: selectedToken?.symbol || '',
          }),
        );
      } else {
        throw new Error(strings('deposit.buildQuote.unexpectedError'));
      }
    } catch (e) {
      Logger.error(e as Error, {
        message: 'HeadlessBuy: Failed to proceed with quote',
      });
      setError(
        parseUserFacingError(e, strings('deposit.buildQuote.unexpectedError')),
      );
      hasProceededRef.current = false;
    } finally {
      setProceeding(false);
    }
  }, [
    selectedQuote,
    selectedProvider,
    selectedToken,
    walletAddress,
    currency,
    amount,
    paymentMethodId,
    navigation,
    getWidgetUrl,
    transakCheckExistingToken,
    transakGetBuyQuote,
    transakRouteAfterAuth,
  ]);

  useEffect(() => {
    if (selectedQuote && !error && !hasProceededRef.current) {
      proceedWithQuote();
    }
  }, [selectedQuote, error, proceedWithQuote]);

  useEffect(() => {
    const handler = ({
      order,
    }: {
      order: RampsOrder;
      previousStatus: RampsOrderStatus;
    }) => {
      if (TERMINAL_STATUSES.has(order.status)) {
        navigation.dangerouslyGetParent()?.pop();
      }
    };

    Engine.controllerMessenger.subscribe(
      'RampsController:orderStatusChanged',
      handler,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'RampsController:orderStatusChanged',
        handler,
      );
    };
  }, [navigation]);

  const handleRetry = useCallback(() => {
    setError(null);
    hasProceededRef.current = false;
  }, []);

  if (error) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="flex-1 px-8"
          >
            <Text
              variant={TextVariant.HeadingMd}
              twClassName="mb-2 text-center"
            >
              {strings('fiat_on_ramp_aggregator.error')}
            </Text>
            <Text variant={TextVariant.BodyMd} twClassName="mb-6 text-center">
              {error}
            </Text>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              onPress={handleRetry}
              isFullWidth
            >
              {strings('fiat_on_ramp_aggregator.try_again')}
            </Button>
          </Box>
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-1"
        >
          <ActivityIndicator size="large" />
          <Text variant={TextVariant.BodyMd} twClassName="mt-4">
            {proceeding
              ? strings('fiat_on_ramp.please_wait')
              : strings('fiat_on_ramp.fetching_quotes')}
          </Text>
        </Box>
      </ScreenLayout.Body>
    </ScreenLayout>
  );
}

export default HeadlessBuy;
