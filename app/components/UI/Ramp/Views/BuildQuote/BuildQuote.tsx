import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Linking, Animated, View } from 'react-native';
import {
  useNavigation,
  useFocusEffect,
  useIsFocused,
} from '@react-navigation/native';
import type { CaipChainId } from '@metamask/utils';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import {
  buildQuoteWithRedirectUrl,
  getCheckoutContext,
  getWidgetRedirectConfig,
} from '../../utils/buildQuoteWithRedirectUrl';
import { computeAmountUpdate } from '../../utils/computeAmountUpdate';
import { getRampCallbackBaseUrl } from '../../utils/getRampCallbackBaseUrl';
import { getNavigateAfterExternalBrowserRoutes } from '../../utils/rampsNavigation';
import { reportRampsError } from '../../utils/reportRampsError';
import { providerSupportsAsset } from '../../utils/providerSupportsAsset';
import { useProviderLimits } from '../../hooks/useProviderLimits';
import Keypad, { type KeypadChangeData, Keys } from '../../../../Base/Keypad';
import PaymentMethodPill from '../../components/PaymentMethodPill';
import QuickAmounts from '../../components/QuickAmounts';
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  Button,
  ButtonVariant,
  ButtonSize,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

import HeaderCompactStandard from '../../../../../component-library/components-temp/HeaderCompactStandard';
import Routes from '../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './BuildQuote.styles';
import { getFontSizeForInputLength } from './getFontSizeForInputLength';
import { useFormatters } from '../../../../hooks/useFormatters';
import { useTokenNetworkInfo } from '../../hooks/useTokenNetworkInfo';
import {
  RampsOrderStatus,
  normalizeProviderCode,
} from '@metamask/ramps-controller';
import { useRampsController } from '../../hooks/useRampsController';
import { useRampsQuotes } from '../../hooks/useRampsQuotes';
import { createSettingsModalNavDetails } from '../Modals/SettingsModal';
import useRampAccountAddress from '../../hooks/useRampAccountAddress';
import { useBlinkingCursor } from '../../hooks/useBlinkingCursor';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { BuildQuoteSelectors } from '../../Aggregator/Views/BuildQuote/BuildQuote.testIds';
import { BUILD_QUOTE_TEST_IDS } from './BuildQuote.testIds';
import { createPaymentSelectionModalNavigationDetails } from '../Modals/PaymentSelectionModal';
import { createCheckoutNavDetails } from '../Checkout';
import {
  isNativeProvider,
  isCustomAction,
  getQuoteProviderName,
  getQuoteBuyUserAgent,
} from '../../types';
import { FIAT_ORDER_PROVIDERS } from '../../../../../constants/on-ramp';
import { createTokenNotAvailableModalNavigationDetails } from '../Modals/TokenNotAvailableModal';
import { useParams } from '../../../../../util/navigation/navUtils';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import { useTransakController } from '../../hooks/useTransakController';
import { useTransakRouting } from '../../hooks/useTransakRouting';
import { createV2VerifyIdentityNavDetails } from '../NativeFlow/VerifyIdentity';
import { createV2EnterEmailNavDetails } from '../NativeFlow/EnterEmail';
import { parseUserFacingError } from '../../utils/parseUserFacingError';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useSelector } from 'react-redux';
import {
  getRampRoutingDecision,
  selectHasAgreedTransakNativePolicy,
  UnifiedRampRoutingType,
} from '../../../../../reducers/fiatOrders';
import { selectProviderAutoSelected } from '../../../../../selectors/rampsController';
import Device from '../../../../../util/device';
import TruncatedError from '../../components/TruncatedError';
import { PROVIDER_LINKS } from '../../Aggregator/types';
const BAILED_ORDER_STATUSES = new Set<RampsOrderStatus>([
  RampsOrderStatus.Precreated,
  RampsOrderStatus.IdExpired,
  RampsOrderStatus.Unknown,
]);

export function isBailedOrderStatus(
  status: RampsOrderStatus | undefined,
): boolean {
  return status != null && BAILED_ORDER_STATUSES.has(status);
}

/**
 * Identifies which flow the user used to enter the Buy screen.
 * - 'tokenInfo': Home → Tokens → Token Info → Buy
 * - 'homeTokenList': Home → (token list with Buy buttons) → Buy
 * - undefined: Home → Buy → Token Selection → BuildQuote (standard flow)
 */
export type BuyFlowOrigin = 'tokenInfo' | 'homeTokenList';

export interface BuildQuoteParams {
  assetId?: string;
  nativeFlowError?: string;
  /** Which flow the user used to enter the Buy screen. */
  buyFlowOrigin?: BuyFlowOrigin;
  /** Pre-fill the amount input (e.g. when restoring state after a navigation reset). */
  amount?: number;
}

/**
 * Creates navigation details for the BuildQuote screen (RampAmountInput).
 * This screen is nested inside TokenListRoutes, so navigation must go through
 * the parent route Routes.RAMP.TOKEN_SELECTION.
 */
export const createBuildQuoteNavDetails = (
  params?: BuildQuoteParams,
): readonly [
  string,
  {
    screen: string;
    params: {
      screen: string;
      params?: BuildQuoteParams;
    };
  },
] =>
  [
    Routes.RAMP.TOKEN_SELECTION,
    {
      screen: Routes.RAMP.TOKEN_SELECTION,
      params: {
        screen: Routes.RAMP.AMOUNT_INPUT,
        params,
      },
    },
  ] as const;

const DEFAULT_AMOUNT = 100;

function BuildQuote() {
  const navigation = useNavigation();
  const isOnBuildQuoteScreen = useIsFocused();
  const { styles } = useStyles(styleSheet, {});
  const { formatCurrency } = useFormatters();
  const cursorOpacity = useBlinkingCursor();

  const params = useParams<BuildQuoteParams>();
  const initialAmount = params?.amount ?? DEFAULT_AMOUNT;

  const [amount, setAmount] = useState<string>(() => String(initialAmount));
  const [amountAsNumber, setAmountAsNumber] = useState<number>(initialAmount);
  const [userHasEnteredAmount, setUserHasEnteredAmount] = useState(
    params?.amount != null,
  );
  const [keyboardIsDirty, setKeyboardIsDirty] = useState(false);
  const [isContinueLoading, setIsContinueLoading] = useState(false);
  const [rampsError, setRampsError] = useState<string | null>(null);

  useEffect(() => {
    if (params?.nativeFlowError) {
      setRampsError(params.nativeFlowError);
      navigation.setParams({ nativeFlowError: undefined });
    }
  }, [params?.nativeFlowError, navigation]);

  const {
    userRegion,
    providers,
    selectedProvider,
    setSelectedProvider,
    selectedToken,
    paymentMethods,
    getBuyWidgetData,
    addPrecreatedOrder,
    paymentMethodsLoading,
    paymentMethodsFetching,
    paymentMethodsStatus,
    selectedPaymentMethod,
  } = useRampsController();

  const { trackEvent, createEventBuilder } = useAnalytics();
  const rampRoutingDecision = useSelector(getRampRoutingDecision);
  const hasAgreedTransakNativePolicy = useSelector(
    selectHasAgreedTransakNativePolicy,
  );
  const providerAutoSelected = useSelector(selectProviderAutoSelected);
  const prevSelectedProviderRef = useRef(selectedProvider);

  /*
   * Resets the native flow error if the selected provider changes.
   */
  useEffect(() => {
    if (prevSelectedProviderRef.current !== selectedProvider) {
      prevSelectedProviderRef.current = selectedProvider;
      setRampsError(null);
    }
  }, [selectedProvider]);

  const tokenStateIsSettled =
    !params?.assetId || selectedToken?.assetId === params.assetId;

  // Controller state is the source of truth for the active token;
  // route params are only used as bootstrapping input.
  const effectiveAssetId = selectedToken?.assetId ?? params?.assetId;

  const isTokenUnavailable = useMemo(() => {
    if (!selectedProvider || !effectiveAssetId) {
      return false;
    }

    if (!providerSupportsAsset(selectedProvider, effectiveAssetId)) {
      return true;
    }

    // Only determine unavailability after payment methods have fully settled.
    // This prevents the modal from flashing during loading/idle/error states
    // (e.g. after a provider change while the new query is still in flight).
    // Also wait for background refetches to complete — react-query may return
    // stale cached data (status='success') while refetching for a new provider.
    if (paymentMethodsStatus !== 'success' || paymentMethodsFetching) {
      return false;
    }

    // If payment methods returned results, token IS available
    // (payment methods API is more authoritative than supportedCryptoCurrencies)
    if (paymentMethods.length > 0) {
      return false;
    }

    // Payment methods loaded but empty
    if (tokenStateIsSettled) {
      return true;
    }

    return false;
  }, [
    selectedProvider,
    effectiveAssetId,
    paymentMethodsFetching,
    tokenStateIsSettled,
    paymentMethodsStatus,
    paymentMethods.length,
  ]);

  // Tracks which provider:token combination was last shown the modal,
  // so we don't duplicate-navigate within the same visit but DO re-show
  // when the combination changes.
  const lastShownUnavailableKeyRef = useRef<string>('');

  // Bump a counter on screen focus so the modal effect re-evaluates
  // when the user navigates away (e.g. token selection) and comes back.
  const [focusTrigger, setFocusTrigger] = useState(0);
  useFocusEffect(
    useCallback(() => {
      lastShownUnavailableKeyRef.current = '';
      setFocusTrigger((c) => c + 1);
    }, []),
  );

  // When no provider is selected (e.g. first-time user in a region without
  // Transak), pick the first provider that supports the selected token.
  useEffect(() => {
    if (
      !isOnBuildQuoteScreen ||
      selectedProvider ||
      !effectiveAssetId ||
      providers.length === 0
    ) {
      return;
    }
    const supportingProvider = providers.find((p) =>
      providerSupportsAsset(p, effectiveAssetId),
    );
    if (supportingProvider) {
      setSelectedProvider(supportingProvider, { autoSelected: true });
    }
  }, [
    isOnBuildQuoteScreen,
    selectedProvider,
    effectiveAssetId,
    providers,
    setSelectedProvider,
  ]);

  // When the selected token is unavailable for the current provider:
  // - If the provider was auto-selected (soft), silently switch to the best
  //   provider that supports the token.
  // - Otherwise, show the "Token Not Available" modal so the user can decide.
  useEffect(() => {
    if (!isOnBuildQuoteScreen || !isTokenUnavailable) {
      lastShownUnavailableKeyRef.current = '';
      return;
    }

    if (providerAutoSelected && effectiveAssetId) {
      const supportingProvider = providers.find(
        (p) =>
          p.id !== selectedProvider?.id &&
          providerSupportsAsset(p, effectiveAssetId),
      );
      if (supportingProvider) {
        setSelectedProvider(supportingProvider, { autoSelected: true });
        return;
      }
    }

    const key = `${selectedProvider?.id}:${effectiveAssetId}`;
    if (lastShownUnavailableKeyRef.current === key) return;

    const timer = setTimeout(() => {
      lastShownUnavailableKeyRef.current = key;
      navigation.navigate(
        ...createTokenNotAvailableModalNavigationDetails({
          assetId: effectiveAssetId ?? '',
          buyFlowOrigin: params?.buyFlowOrigin,
        }),
      );
    }, 600);

    return () => clearTimeout(timer);
  }, [
    isOnBuildQuoteScreen,
    params?.buyFlowOrigin,
    isTokenUnavailable,
    effectiveAssetId,
    navigation,
    selectedProvider?.id,
    focusTrigger,
    providerAutoSelected,
    providers,
    setSelectedProvider,
  ]);

  const {
    checkExistingToken: transakCheckExistingToken,
    getBuyQuote: transakGetBuyQuote,
  } = useTransakController();

  const { routeAfterAuthentication: transakRouteAfterAuth } =
    useTransakRouting();

  const currency = userRegion?.country?.currency || 'USD';
  const { currencyPrefix, currencySuffix } = useMemo(() => {
    const formatted = formatCurrency(1, currency, {
      currencyDisplay: 'narrowSymbol',
    });
    // Match: prefix (non-digit chars), digits/separators, suffix (non-digit chars)
    const match = formatted.match(/^([^\d]*?)[\d.,]+\s*([^\d\s].*)?$/);
    return {
      currencyPrefix: match?.[1] ?? '',
      currencySuffix: match?.[2]?.trim() ?? '',
    };
  }, [currency, formatCurrency]);
  const quickAmounts = userRegion?.country?.quickAmounts ?? [50, 100, 200, 400];

  const amountDisplayString = useMemo(
    () => `${currencyPrefix}${amount}${currencySuffix}`,
    [currencyPrefix, currencySuffix, amount],
  );
  const amountFontSize = getFontSizeForInputLength(amountDisplayString.length);
  const amountLineHeight = amountFontSize + 10;

  /*
   * Tracks RAMPS_SCREEN_VIEWED
   * @returns {void}
   */
  const hasTrackedScreenViewRef = useRef(false);
  useEffect(() => {
    if (hasTrackedScreenViewRef.current) return;
    if (rampRoutingDecision != null) {
      hasTrackedScreenViewRef.current = true;
      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_SCREEN_VIEWED)
          .addProperties({
            location: 'Amount Input',
            ramp_type: 'UNIFIED_BUY_2',
            ramp_routing: rampRoutingDecision,
          })
          .build(),
      );
    }
  }, [rampRoutingDecision, trackEvent, createEventBuilder]);

  /*
   * Sets the default amount for the user's region.
   */
  useEffect(() => {
    if (!userHasEnteredAmount && userRegion?.country?.defaultAmount != null) {
      const regionDefault = userRegion.country.defaultAmount;
      setAmount(String(regionDefault));
      setAmountAsNumber(regionDefault);
      setUserHasEnteredAmount(true);
    }
  }, [userRegion?.country?.defaultAmount, userHasEnteredAmount]);

  const getTokenNetworkInfo = useTokenNetworkInfo();

  const walletAddress = useRampAccountAddress(
    selectedToken?.chainId as CaipChainId,
  );

  const debouncedPollingAmount = useDebouncedValue(amountAsNumber, 500);
  const hasAmount = amountAsNumber > 0;

  const { amountLimitError } = useProviderLimits({
    provider: selectedProvider,
    fiatCurrency: userRegion?.country?.currency,
    paymentMethodId: selectedPaymentMethod?.id,
    amount: amountAsNumber,
    currency,
  });
  const quoteFetchEnabled = !!(
    walletAddress &&
    selectedPaymentMethod &&
    selectedProvider &&
    selectedToken?.assetId &&
    tokenStateIsSettled &&
    debouncedPollingAmount > 0 &&
    !amountLimitError
  );

  /*
   * Creates the quote fetch parameters for the useRampsQuotes hook,
   * Fetches only 1 quote for the selected provider and payment method.
   */
  const quoteFetchParams = useMemo(
    () =>
      selectedToken?.assetId &&
      walletAddress &&
      selectedPaymentMethod &&
      selectedProvider
        ? {
            assetId: selectedToken.assetId,
            amount: debouncedPollingAmount,
            walletAddress,
            redirectUrl: getRampCallbackBaseUrl(),
            paymentMethods: [selectedPaymentMethod.id],
            providers: [selectedProvider.id],
          }
        : null,
    [
      selectedToken?.assetId,
      debouncedPollingAmount,
      walletAddress,
      selectedPaymentMethod,
      selectedProvider,
    ],
  );

  const {
    data: quotesResponse,
    loading: selectedQuoteLoading,
    error: quoteFetchError,
  } = useRampsQuotes(quoteFetchEnabled ? quoteFetchParams : null);

  /*
   * Tracks RAMPS_QUOTE_ERROR
   */
  const lastTrackedQuoteErrorRef = useRef<unknown>(null);
  useEffect(() => {
    if (
      quoteFetchError &&
      quoteFetchError !== lastTrackedQuoteErrorRef.current
    ) {
      lastTrackedQuoteErrorRef.current = quoteFetchError;
      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_QUOTE_ERROR)
          .addProperties({
            error_message: parseUserFacingError(
              quoteFetchError,
              strings('deposit.buildQuote.quoteFetchError'),
            ),
            amount: amountAsNumber,
            currency_source: currency,
            currency_destination: selectedToken?.assetId,
            payment_method_id: selectedPaymentMethod?.id,
            chain_id: selectedToken?.chainId,
            ramp_type: 'UNIFIED_BUY_2',
            ramp_routing: rampRoutingDecision ?? undefined,
          })
          .build(),
      );
    }
    if (!quoteFetchError) {
      lastTrackedQuoteErrorRef.current = null;
    }
  }, [
    quoteFetchError,
    amountAsNumber,
    currency,
    selectedToken?.assetId,
    selectedToken?.chainId,
    selectedPaymentMethod?.id,
    rampRoutingDecision,
    trackEvent,
    createEventBuilder,
  ]);

  const selectedQuote = useMemo(() => {
    if (
      !quotesResponse?.success ||
      !selectedProvider ||
      !selectedPaymentMethod
    ) {
      return null;
    }
    const targetProvider = normalizeProviderCode(selectedProvider.id);
    return (
      quotesResponse.success.find(
        (quote) => normalizeProviderCode(quote.provider) === targetProvider,
      ) ?? null
    );
  }, [quotesResponse, selectedProvider, selectedPaymentMethod]);

  const networkInfo = useMemo(() => {
    if (!selectedToken) return null;
    return getTokenNetworkInfo(selectedToken.chainId as CaipChainId);
  }, [selectedToken, getTokenNetworkInfo]);

  const handleSettingsPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_SETTINGS_CLICKED)
        .addProperties({
          location: 'Amount Input',
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
    navigation.navigate(...createSettingsModalNavDetails());
  }, [trackEvent, createEventBuilder, navigation]);

  const handleBackPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_BACK_BUTTON_CLICKED)
        .addProperties({
          location: 'Amount Input',
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
    navigation.goBack();
  }, [trackEvent, createEventBuilder, navigation]);

  const updateAmount = useCallback(
    (valueOrNumber: string | number, valueAsNumber?: number) => {
      const { amount: nextAmount, amountAsNumber: nextAmountAsNumber } =
        computeAmountUpdate(valueOrNumber, valueAsNumber);
      setAmount(nextAmount);
      setAmountAsNumber(nextAmountAsNumber);
      setKeyboardIsDirty(true);
      setUserHasEnteredAmount(true);
      setRampsError(null);
    },
    [],
  );

  const handleKeypadChange = useCallback(
    ({ value, valueAsNumber, pressedKey }: KeypadChangeData) => {
      if (pressedKey === Keys.Back && !keyboardIsDirty) {
        updateAmount(0);
        return;
      }
      updateAmount(value, valueAsNumber ?? 0);
    },
    [keyboardIsDirty, updateAmount],
  );

  const handleQuickAmountPress = useCallback(
    (quickAmount: number) => {
      updateAmount(quickAmount);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.RAMPS_QUICK_AMOUNT_CLICKED)
          .addProperties({
            amount: quickAmount,
            currency_source: currency,
            location: 'Amount Input',
            ramp_type: 'UNIFIED_BUY_2',
          })
          .build(),
      );
    },
    [currency, trackEvent, createEventBuilder, updateAmount],
  );

  const navigateAfterExternalBrowser = useCallback(
    (opts: Parameters<typeof getNavigateAfterExternalBrowserRoutes>[0]) => {
      navigation.reset({
        index: 0,
        routes: getNavigateAfterExternalBrowserRoutes(opts),
      });
    },
    [navigation],
  );

  const handlePaymentPillPress = useCallback(() => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED,
      )
        .addProperties({
          current_payment_method: selectedPaymentMethod?.id,
          location: 'Amount Input',
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
    navigation.navigate(
      ...createPaymentSelectionModalNavigationDetails({
        amount: debouncedPollingAmount,
      }),
    );
  }, [
    debouncedPollingAmount,
    navigation,
    selectedPaymentMethod?.id,
    trackEvent,
    createEventBuilder,
  ]);

  /**
   * Handles the continue button press for a native provider such as Transak.
   * This function checks if the user has an authenticated account and routes the use appropriately.
   * @returns {Promise<void>}
   */
  const handleNativeProviderContinue = useCallback(async () => {
    setIsContinueLoading(true);
    try {
      const hasToken = await transakCheckExistingToken();

      if (hasToken) {
        const quote = await transakGetBuyQuote(
          currency,
          selectedToken?.assetId || '',
          selectedToken?.chainId || '',
          selectedPaymentMethod?.id || '',
          String(amountAsNumber),
        );
        if (!quote) {
          throw new Error(strings('deposit.buildQuote.unexpectedError'));
        }
        await transakRouteAfterAuth(quote, amountAsNumber);
      } else if (hasAgreedTransakNativePolicy) {
        navigation.navigate(
          ...createV2EnterEmailNavDetails({
            amount: String(amountAsNumber),
            currency,
            assetId: selectedToken?.assetId,
          }),
        );
      } else {
        navigation.navigate(
          ...createV2VerifyIdentityNavDetails({
            amount: String(amountAsNumber),
            currency,
            assetId: selectedToken?.assetId,
          }),
        );
      }
    } catch (error) {
      setRampsError(
        reportRampsError(
          error,
          { message: 'Failed to route native provider flow' },
          strings('deposit.buildQuote.unexpectedError'),
        ),
      );
    } finally {
      setIsContinueLoading(false);
    }
  }, [
    currency,
    selectedToken?.assetId,
    selectedToken?.chainId,
    selectedPaymentMethod?.id,
    amountAsNumber,
    transakCheckExistingToken,
    transakGetBuyQuote,
    transakRouteAfterAuth,
    navigation,
    hasAgreedTransakNativePolicy,
  ]);

  /**
   * Handles the continue button press for widget providers (custom action e.g. PayPal,
   * or aggregator e.g. Moonpay, Mercuryo). Fetches the widget URL and routes the user
   * to either external browser or in-app Checkout based on the provider configuration.
   * @returns {Promise<void>}
   */
  const handleWidgetProviderContinue = useCallback(async () => {
    if (!selectedQuote) return;
    setIsContinueLoading(true);
    try {
      const providerCode = normalizeProviderCode(selectedQuote.provider);
      const isCustom = isCustomAction(selectedQuote);
      const { useExternalBrowser, redirectUrl } = getWidgetRedirectConfig(
        selectedQuote,
        providerCode,
        isCustom,
      );
      const quoteForWidget = buildQuoteWithRedirectUrl(
        selectedQuote,
        redirectUrl,
      );
      const buyWidget = await getBuyWidgetData(quoteForWidget);

      if (!buyWidget?.url) {
        setRampsError(
          reportRampsError(
            new Error('No widget URL available for provider'),
            { provider: selectedQuote.provider },
            strings('deposit.buildQuote.unexpectedError'),
          ),
        );
        return;
      }

      const { network, effectiveWallet, effectiveOrderId } = getCheckoutContext(
        selectedToken,
        walletAddress,
        buyWidget.orderId,
      );

      if (useExternalBrowser) {
        if (effectiveOrderId && effectiveWallet) {
          addPrecreatedOrder({
            orderId: effectiveOrderId,
            providerCode,
            walletAddress: effectiveWallet,
            chainId: network || undefined,
          });
        }

        const isAndroid = Device.isAndroid();
        const inAppBrowserAvailable =
          !isAndroid && (await InAppBrowser.isAvailable());

        if (isAndroid || !inAppBrowserAvailable) {
          await Linking.openURL(buyWidget.url);
          navigateAfterExternalBrowser({ returnDestination: 'buildQuote' });
          return;
        }

        try {
          const result = await InAppBrowser.openAuth(
            buyWidget.url,
            redirectUrl,
          );

          if (result.type !== 'success' || !result.url) {
            navigateAfterExternalBrowser({ returnDestination: 'buildQuote' });
            return;
          }

          if (!effectiveWallet) {
            navigateAfterExternalBrowser({ returnDestination: 'buildQuote' });
            return;
          }

          navigateAfterExternalBrowser({
            returnDestination: 'order',
            callbackUrl: result.url,
            providerCode,
            walletAddress: effectiveWallet,
          });
        } finally {
          InAppBrowser.closeAuth();
        }
        return;
      }

      navigation.navigate(
        ...createCheckoutNavDetails({
          url: buyWidget.url,
          providerName:
            selectedProvider?.name || getQuoteProviderName(selectedQuote),
          userAgent: getQuoteBuyUserAgent(selectedQuote),
          providerCode,
          providerType: FIAT_ORDER_PROVIDERS.RAMPS_V2,
          walletAddress: effectiveWallet || undefined,
          network,
          currency,
          cryptocurrency: selectedToken?.symbol || '',
          orderId: buyWidget.orderId?.trim() || undefined,
        }),
      );
    } catch (error) {
      setRampsError(
        reportRampsError(
          error,
          {
            provider: selectedQuote.provider,
            message: 'Failed to fetch widget URL',
          },
          strings('deposit.buildQuote.unexpectedError'),
        ),
      );
    } finally {
      setIsContinueLoading(false);
    }
  }, [
    selectedQuote,
    selectedProvider,
    selectedToken,
    walletAddress,
    currency,
    navigation,
    getBuyWidgetData,
    addPrecreatedOrder,
    navigateAfterExternalBrowser,
  ]);

  const handleContinuePress = useCallback(async () => {
    if (!selectedQuote || !selectedProvider) return;
    setRampsError(null);

    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_CONTINUE_BUTTON_CLICKED)
        .addProperties({
          ramp_routing:
            rampRoutingDecision ?? UnifiedRampRoutingType.AGGREGATOR,
          ramp_type: 'UNIFIED_BUY_2',
          amount_source: amountAsNumber,
          payment_method_id: selectedPaymentMethod?.id ?? '',
          provider_onramp: selectedProvider?.name,
          region: userRegion?.regionCode ?? '',
          chain_id: selectedToken?.chainId ?? '',
          currency_destination: selectedToken?.assetId ?? '',
          currency_destination_symbol: selectedToken?.symbol,
          currency_source: currency,
        })
        .build(),
    );

    if (isNativeProvider(selectedQuote)) {
      await handleNativeProviderContinue();
    } else {
      await handleWidgetProviderContinue();
    }
  }, [
    selectedQuote,
    selectedProvider,
    selectedToken,
    amountAsNumber,
    currency,
    selectedPaymentMethod?.id,
    rampRoutingDecision,
    userRegion?.regionCode,
    trackEvent,
    createEventBuilder,
    handleNativeProviderContinue,
    handleWidgetProviderContinue,
  ]);

  const canContinue =
    hasAmount &&
    !amountLimitError &&
    !selectedQuoteLoading &&
    selectedQuote !== null;

  const hasNoQuotes =
    hasAmount &&
    !selectedQuoteLoading &&
    !quoteFetchError &&
    quotesResponse !== null &&
    selectedQuote === null;

  const providerQuoteError = useMemo(() => {
    if (!hasNoQuotes || !quotesResponse?.error?.length) return undefined;
    const firstError = quotesResponse.error[0];
    return firstError?.error;
  }, [hasNoQuotes, quotesResponse?.error]);

  const inlineQuoteError = amountLimitError ?? providerQuoteError ?? null;
  const hasGenericNoQuotes = hasNoQuotes && !providerQuoteError;
  const amountInputHasError = Boolean(
    rampsError || quoteFetchError || inlineQuoteError || hasGenericNoQuotes,
  );

  const noQuotesErrorMessage = selectedProvider
    ? strings('fiat_on_ramp.no_quotes_error', {
        provider: selectedProvider.name,
      })
    : strings('fiat_on_ramp.no_quotes_available');

  const actionSectionMessage = (() => {
    if (rampsError) {
      return (
        <TruncatedError
          error={rampsError}
          providerName={selectedProvider?.name}
          providerSupportUrl={
            selectedProvider?.links?.find(
              (link) => link.name === PROVIDER_LINKS.SUPPORT,
            )?.url
          }
        />
      );
    }
    if (inlineQuoteError) {
      return (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.ErrorDefault}
          style={styles.centeredText}
        >
          {inlineQuoteError}
        </Text>
      );
    }
    if (hasGenericNoQuotes) {
      return (
        <TruncatedError
          error={noQuotesErrorMessage}
          showChangeProvider
          amount={amountAsNumber}
        />
      );
    }
    if (selectedProvider) {
      return (
        <Text variant={TextVariant.BodySm} style={styles.poweredByText}>
          {strings('fiat_on_ramp.powered_by_provider', {
            provider: selectedProvider.name,
          })}
        </Text>
      );
    }
    return null;
  })();

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <HeaderCompactStandard
          title={
            selectedToken?.symbol
              ? strings('fiat_on_ramp.buy', { ticker: selectedToken.symbol })
              : undefined
          }
          subtitle={
            networkInfo?.networkName
              ? strings('fiat_on_ramp.on_network', {
                  networkName: networkInfo.networkName,
                })
              : undefined
          }
          onBack={handleBackPress}
          backButtonProps={{ testID: BUILD_QUOTE_TEST_IDS.BACK_BUTTON }}
          endButtonIconProps={[
            {
              iconName: IconName.Setting,
              onPress: handleSettingsPress,
              testID: BUILD_QUOTE_TEST_IDS.SETTINGS_BUTTON,
            },
          ]}
          includesTopInset
        />
        <ScreenLayout.Content style={styles.content}>
          <View style={styles.centerGroup}>
            <View style={styles.amountContainer}>
              <View style={styles.amountRow}>
                <Text
                  testID={BuildQuoteSelectors.AMOUNT_INPUT}
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Regular}
                  color={
                    amountInputHasError ? TextColor.ErrorDefault : undefined
                  }
                  twClassName={`text-[${amountFontSize}px] tracking-tight leading-[${amountLineHeight}px] font-normal text-center`}
                  numberOfLines={1}
                >
                  {currencyPrefix}
                  {amount}
                </Text>
                <Animated.View
                  style={[
                    styles.cursor,
                    {
                      height: Math.max(amountLineHeight - 4, 16),
                      opacity: cursorOpacity,
                    },
                  ]}
                />
                {currencySuffix ? (
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Regular}
                    color={
                      amountInputHasError ? TextColor.ErrorDefault : undefined
                    }
                    twClassName={`text-[${amountFontSize}px] tracking-tight leading-[${amountLineHeight}px] font-normal text-center`}
                  >
                    {currencySuffix}
                  </Text>
                ) : null}
              </View>
              <PaymentMethodPill
                label={
                  selectedPaymentMethod?.name ||
                  strings('fiat_on_ramp.select_payment_method')
                }
                paymentMethod={selectedPaymentMethod}
                isLoading={paymentMethodsLoading}
                onPress={
                  isTokenUnavailable ? undefined : handlePaymentPillPress
                }
                testID="build-quote-payment-pill"
              />
            </View>
          </View>

          {quoteFetchError && (
            <BannerAlert
              severity={BannerAlertSeverity.Error}
              description={parseUserFacingError(
                quoteFetchError,
                strings('deposit.buildQuote.quoteFetchError'),
              )}
            />
          )}

          <View style={styles.actionSection}>
            {hasAmount ? (
              <>
                {actionSectionMessage}
                <Button
                  variant={ButtonVariant.Primary}
                  size={ButtonSize.Lg}
                  onPress={handleContinuePress}
                  isFullWidth
                  isDisabled={!canContinue}
                  isLoading={selectedQuoteLoading || isContinueLoading}
                  testID={BuildQuoteSelectors.CONTINUE_BUTTON}
                >
                  {strings('fiat_on_ramp.continue')}
                </Button>
              </>
            ) : (
              quickAmounts.length > 0 && (
                <QuickAmounts
                  amounts={quickAmounts}
                  currency={currency}
                  onAmountPress={handleQuickAmountPress}
                />
              )
            )}
          </View>
          <Keypad
            currency={currency}
            value={amount}
            onChange={handleKeypadChange}
          />
        </ScreenLayout.Content>
      </ScreenLayout.Body>
    </ScreenLayout>
  );
}

export default BuildQuote;
