import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { TransactionPayStrategy } from '@metamask/transaction-pay-controller';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { FIAT_ORDER_PROVIDERS } from '../../../../../constants/on-ramp';
import Engine from '../../../../../core/Engine';
import { createCheckoutNavDetails } from '../../../../UI/Ramp/Views/Checkout';
import {
  getQuoteBuyUserAgent,
  getQuoteProviderName,
  isNativeProvider,
  Quote,
} from '../../../../UI/Ramp/types';
import { parseUserFacingError } from '../../../../UI/Ramp/utils/parseUserFacingError';
import { useRampsController } from '../../../../UI/Ramp/hooks/useRampsController';
import { useTransakController } from '../../../../UI/Ramp/hooks/useTransakController';
import {
  registerQuickBuySuccessCallback,
  removeQuickBuySuccessCallback,
} from '../../../../UI/Ramp/utils/quickBuyCallbackRegistry';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  useTransactionPayFiatPayment,
  useTransactionPayQuotes,
} from './useTransactionPayData';

interface FiatQuoteOriginal {
  fiatQuote?: Quote & {
    quote?: Quote['quote'] & {
      crypto?: {
        assetId?: string;
        chainId?: string;
        symbol?: string;
      };
      fiat?: {
        symbol?: string;
      };
    };
  };
}

type CheckoutParams = Parameters<typeof createCheckoutNavDetails>[0];
const QUICK_BUY_CURRENCY = 'USD';

function getProviderCode(provider: string | undefined): string | undefined {
  if (!provider) {
    return undefined;
  }

  if (provider.startsWith('/providers/')) {
    return provider.split('/')[2] || provider;
  }

  return provider;
}

function getCheckoutNetwork(chainId: string | undefined): string {
  if (!chainId) {
    return '';
  }

  if (chainId.includes(':')) {
    return chainId.split(':')[1] || '';
  }

  if (chainId.startsWith('0x')) {
    const decimalValue = Number(chainId);
    return Number.isFinite(decimalValue) ? decimalValue.toString(10) : chainId;
  }

  return chainId;
}

const createV2EnterEmailFromRootNavDetails = (params?: {
  amount?: string;
  assetId?: string;
  currency?: string;
  quickBuyCallbackKey?: string;
}): readonly [
  string,
  {
    screen: string;
    params: {
      screen: string;
      params?: {
        amount?: string;
        assetId?: string;
        currency?: string;
        quickBuyCallbackKey?: string;
      };
    };
  },
] =>
  [
    Routes.RAMP.TOKEN_SELECTION,
    {
      screen: Routes.RAMP.TOKEN_SELECTION,
      params: {
        screen: Routes.RAMP.ENTER_EMAIL,
        params,
      },
    },
  ] as const;

const createCheckoutFromRootNavDetails = (
  params: CheckoutParams,
): readonly [
  string,
  {
    screen: string;
    params: {
      screen: string;
      params?: CheckoutParams;
    };
  },
] =>
  [
    Routes.RAMP.TOKEN_SELECTION,
    {
      screen: Routes.RAMP.TOKEN_SELECTION,
      params: {
        screen: Routes.RAMP.CHECKOUT,
        params,
      },
    },
  ] as const;

export function useTransactionPayFiatQuickBuy(): {
  clearQuickBuyError: () => void;
  isQuickBuyLoading: boolean;
  quickBuyOrderId: string | null;
  quickBuyError: string | null;
  triggerFiatQuickBuy: () => Promise<boolean>;
} {
  const navigation = useNavigation();
  const {
    getWidgetUrl,
    // setSelectedToken
  } = useRampsController();
  const {
    checkExistingToken,
    getBuyQuote,
    requestOtt,
    generatePaymentWidgetUrl,
  } = useTransakController();
  const transactionMeta = useTransactionMetadataRequest();
  const fiatPayment = useTransactionPayFiatPayment();
  const quotes = useTransactionPayQuotes();
  const [quickBuyError, setQuickBuyError] = useState<string | null>(null);
  const [quickBuyOrderId, setQuickBuyOrderId] = useState<string | null>(null);
  const [isQuickBuyLoading, setIsQuickBuyLoading] = useState(false);
  const quickBuyCallbackKeyRef = useRef<string | null>(null);

  const fiatQuote = useMemo(
    () =>
      quotes?.find((quote) => quote.strategy === TransactionPayStrategy.Fiat),
    [quotes],
  );

  const fiatOriginal = fiatQuote?.original as FiatQuoteOriginal | undefined;
  const fiatCheckoutQuote = fiatOriginal?.fiatQuote;
  const assetId = fiatCheckoutQuote?.quote?.crypto?.assetId;
  const amount = fiatPayment?.amount;
  const paymentMethodId = fiatPayment?.selectedPaymentMethodId;

  const clearQuickBuyError = useCallback(() => {
    setQuickBuyError(null);
  }, []);

  const registerOrderCallback = useCallback(() => {
    if (quickBuyCallbackKeyRef.current) {
      removeQuickBuySuccessCallback(quickBuyCallbackKeyRef.current);
      quickBuyCallbackKeyRef.current = null;
    }

    const callbackKey = registerQuickBuySuccessCallback((orderId) => {
      setQuickBuyOrderId(orderId);

      const transactionId = transactionMeta?.id;
      if (transactionId) {
        Engine.context.TransactionPayController.updateFiatPayment({
          transactionId,
          quickBuyOrderId: orderId,
        });
      }

      if (quickBuyCallbackKeyRef.current === callbackKey) {
        quickBuyCallbackKeyRef.current = null;
      }
      removeQuickBuySuccessCallback(callbackKey);
    });

    quickBuyCallbackKeyRef.current = callbackKey;
    return callbackKey;
  }, [transactionMeta?.id]);

  useEffect(
    () => () => {
      if (quickBuyCallbackKeyRef.current) {
        removeQuickBuySuccessCallback(quickBuyCallbackKeyRef.current);
      }
    },
    [],
  );

  const triggerFiatQuickBuy = useCallback(async () => {
    setQuickBuyError(null);
    setQuickBuyOrderId(null);

    const walletAddress = transactionMeta?.txParams?.from;
    const providerCode = getProviderCode(fiatCheckoutQuote?.provider);
    const network = getCheckoutNetwork(
      fiatCheckoutQuote?.quote?.crypto?.chainId,
    );
    const currency = QUICK_BUY_CURRENCY;

    if (
      !fiatCheckoutQuote ||
      !assetId ||
      !providerCode ||
      !paymentMethodId ||
      !amount ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      setQuickBuyError(strings('fiat_on_ramp.quote_unavailable'));
      return false;
    }

    setIsQuickBuyLoading(true);
    try {
      // Keep ramps token context aligned with selected fiat quote token.
      // setSelectedToken(assetId);

      if (isNativeProvider(fiatCheckoutQuote)) {
        if (!walletAddress) {
          setQuickBuyError(strings('fiat_on_ramp.quote_unavailable'));
          return false;
        }

        const hasExistingToken = await checkExistingToken();
        if (!hasExistingToken) {
          const quickBuyCallbackKey = registerOrderCallback();
          navigation.navigate(
            ...createV2EnterEmailFromRootNavDetails({
              amount: String(Number(amount)),
              assetId,
              currency,
              quickBuyCallbackKey,
            }),
          );

          return true;
        }

        const nativeQuote = await getBuyQuote(
          currency,
          assetId,
          fiatCheckoutQuote.quote?.crypto?.chainId || '',
          paymentMethodId,
          String(Number(amount)),
        );
        if (!nativeQuote) {
          setQuickBuyError(strings('fiat_on_ramp.quote_unavailable'));
          return false;
        }

        const ottResponse = await requestOtt();
        const ottToken = ottResponse?.ott;
        if (!ottToken) {
          setQuickBuyError(strings('fiat_on_ramp.quote_unavailable'));
          return false;
        }

        const paymentUrl = generatePaymentWidgetUrl(
          ottToken,
          nativeQuote,
          walletAddress,
        );

        if (!paymentUrl) {
          setQuickBuyError(strings('fiat_on_ramp.quote_unavailable'));
          return false;
        }

        navigation.navigate(
          ...createCheckoutFromRootNavDetails({
            url: paymentUrl,
            providerName: getQuoteProviderName(fiatCheckoutQuote),
            userAgent: getQuoteBuyUserAgent(fiatCheckoutQuote),
            providerCode,
            providerType: FIAT_ORDER_PROVIDERS.RAMPS_V2,
            walletAddress,
            network,
            currency,
            cryptocurrency: fiatCheckoutQuote.quote?.crypto?.symbol || '',
            quickBuyCallbackKey: registerOrderCallback(),
            isQuickBuy: true,
          }),
        );

        return true;
      }

      if (!walletAddress) {
        setQuickBuyError(strings('fiat_on_ramp.quote_unavailable'));
        return false;
      }

      const widgetUrl = await getWidgetUrl(fiatCheckoutQuote);
      if (!widgetUrl) {
        setQuickBuyError(strings('fiat_on_ramp.quote_unavailable'));
        return false;
      }

      navigation.navigate(
        ...createCheckoutFromRootNavDetails({
          url: widgetUrl,
          providerName: getQuoteProviderName(fiatCheckoutQuote),
          userAgent: getQuoteBuyUserAgent(fiatCheckoutQuote),
          providerCode,
          providerType: FIAT_ORDER_PROVIDERS.RAMPS_V2,
          walletAddress,
          network,
          currency,
          cryptocurrency: fiatCheckoutQuote.quote?.crypto?.symbol || '',
          quickBuyCallbackKey: registerOrderCallback(),
          isQuickBuy: true,
        }),
      );

      return true;
    } catch (error) {
      setQuickBuyError(
        parseUserFacingError(
          error,
          strings('deposit.buildQuote.unexpectedError'),
        ),
      );
      return false;
    } finally {
      setIsQuickBuyLoading(false);
    }
  }, [
    amount,
    assetId,
    checkExistingToken,
    fiatCheckoutQuote,
    generatePaymentWidgetUrl,
    getBuyQuote,
    getWidgetUrl,
    navigation,
    paymentMethodId,
    requestOtt,
    registerOrderCallback,
    // setSelectedToken,
    transactionMeta,
  ]);

  return {
    clearQuickBuyError,
    isQuickBuyLoading,
    quickBuyOrderId,
    quickBuyError,
    triggerFiatQuickBuy,
  };
}
