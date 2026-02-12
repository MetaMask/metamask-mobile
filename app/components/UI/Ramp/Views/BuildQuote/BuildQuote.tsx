import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CaipChainId } from '@metamask/utils';

import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import { getRampCallbackBaseUrl } from '../../utils/getRampCallbackBaseUrl';
import Keypad, { type KeypadChangeData } from '../../../../Base/Keypad';
import PaymentMethodPill from '../../components/PaymentMethodPill';
import QuickAmounts from '../../components/QuickAmounts';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

import { getRampsBuildQuoteNavbarOptions } from '../../../Navbar';
import Routes from '../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './BuildQuote.styles';
import { formatCurrency } from '../../utils/formatCurrency';
import { useTokenNetworkInfo } from '../../hooks/useTokenNetworkInfo';
import { useRampsController } from '../../hooks/useRampsController';
import { createSettingsModalNavDetails } from '../Modals/SettingsModal';
import useRampAccountAddress from '../../hooks/useRampAccountAddress';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { createPaymentSelectionModalNavigationDetails } from '../Modals/PaymentSelectionModal';
import { createCheckoutNavDetails } from '../Checkout';
import {
  isNativeProvider,
  getQuoteProviderName,
  getQuoteBuyUserAgent,
} from '../../types';
import { createDepositNavigationDetails } from '../../Deposit/routes/utils';
import Logger from '../../../../../util/Logger';
import {
  createRampErrorModalNavigationDetails,
  type RampErrorType,
} from '../../components/RampErrorModal';

interface BuildQuoteParams {
  assetId?: string;
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
  const { styles } = useStyles(styleSheet, {});

  const [amount, setAmount] = useState<string>(() => String(DEFAULT_AMOUNT));
  const [amountAsNumber, setAmountAsNumber] = useState<number>(DEFAULT_AMOUNT);
  const [userHasEnteredAmount, setUserHasEnteredAmount] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const isNavigatingRef = useRef(false);
  const [errorState, setErrorState] = useState<{
    type: RampErrorType;
    isCritical: boolean;
  } | null>(null);

  const {
    userRegion,
    selectedProvider,
    selectedToken,
    selectedQuote,
    quotes,
    quotesLoading,
    quotesError,
    startQuotePolling,
    stopQuotePolling,
    getWidgetUrl,
    paymentMethodsLoading,
    selectedPaymentMethod,
  } = useRampsController();

  const currency = userRegion?.country?.currency || 'USD';
  const quickAmounts = userRegion?.country?.quickAmounts ?? [50, 100, 200, 400];

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

  const networkInfo = useMemo(() => {
    if (!selectedToken) return null;
    return getTokenNetworkInfo(selectedToken.chainId as CaipChainId);
  }, [selectedToken, getTokenNetworkInfo]);

  useEffect(() => {
    navigation.setOptions(
      getRampsBuildQuoteNavbarOptions(navigation, {
        tokenName: selectedToken?.name,
        tokenSymbol: selectedToken?.symbol,
        tokenIconUrl: selectedToken?.iconUrl,
        networkName: networkInfo?.networkName ?? undefined,
        networkImageSource: networkInfo?.networkImageSource,
        onSettingsPress: () => {
          navigation.navigate(...createSettingsModalNavDetails());
        },
      }),
    );
  }, [navigation, selectedToken, networkInfo]);

  const handleKeypadChange = useCallback(
    ({ value, valueAsNumber }: KeypadChangeData) => {
      setAmount(value || '0');
      setAmountAsNumber(valueAsNumber || 0);
      setUserHasEnteredAmount(true);
    },
    [],
  );

  const handleQuickAmountPress = useCallback((quickAmount: number) => {
    setAmount(String(quickAmount));
    setAmountAsNumber(quickAmount);
    setUserHasEnteredAmount(true);
  }, []);

  useEffect(() => {
    if (
      !walletAddress ||
      !selectedPaymentMethod ||
      debouncedPollingAmount <= 0
    ) {
      stopQuotePolling();
      return;
    }

    startQuotePolling({
      walletAddress,
      amount: debouncedPollingAmount,
      redirectUrl: getRampCallbackBaseUrl(),
    });

    return () => {
      stopQuotePolling();
    };
  }, [
    walletAddress,
    selectedPaymentMethod,
    debouncedPollingAmount,
    startQuotePolling,
    stopQuotePolling,
  ]);

  const hasAmount = amountAsNumber > 0;

  // Retry handler for error scenarios
  const handleRetry = useCallback(() => {
    // Clear error state
    setErrorState(null);

    if (!errorState) return;

    switch (errorState.type) {
      case 'quote_fetch':
        // Retry quote fetching by triggering polling again
        if (
          walletAddress &&
          selectedPaymentMethod &&
          debouncedPollingAmount > 0
        ) {
          startQuotePolling({
            walletAddress,
            amount: debouncedPollingAmount,
            redirectUrl: getRampCallbackBaseUrl(),
          });
        }
        break;
      case 'no_quotes':
        // Navigate back to allow user to change amount or payment method
        navigation.goBack();
        break;
      case 'widget_url_failed':
      case 'widget_url_missing':
        // For widget errors, user will need to try again or contact support
        // The modal will handle this with contact support button
        break;
    }
  }, [
    errorState,
    walletAddress,
    selectedPaymentMethod,
    debouncedPollingAmount,
    startQuotePolling,
    navigation,
  ]);

  // Handle quote fetch errors
  useEffect(() => {
    if (quotesError) {
      setErrorState({ type: 'quote_fetch', isCritical: true });
    }
  }, [quotesError]);

  // Handle no quotes available scenario
  useEffect(() => {
    if (
      !quotesLoading &&
      !quotesError &&
      hasAmount &&
      quotes &&
      quotes.success.length === 0
    ) {
      setErrorState({ type: 'no_quotes', isCritical: false });
    }
  }, [quotesLoading, quotesError, hasAmount, quotes]);

  // Navigate to error modal when error state is set
  useEffect(() => {
    if (errorState) {
      navigation.navigate(
        ...createRampErrorModalNavigationDetails({
          errorType: errorState.type,
          isCritical: errorState.isCritical,
          onRetry: handleRetry,
        }),
      );
    }
  }, [errorState, navigation, handleRetry]);

  const handleContinuePress = useCallback(async () => {
    if (!selectedQuote) return;

    const quoteAmount =
      selectedQuote.quote?.amountIn ??
      (selectedQuote as { amountIn?: number }).amountIn;
    const quotePaymentMethod =
      selectedQuote.quote?.paymentMethod ??
      (selectedQuote as { paymentMethod?: string }).paymentMethod;

    // Validate amount matches
    if (quoteAmount !== amountAsNumber) {
      return;
    }

    // Validate payment method context matches
    if (quotePaymentMethod != null) {
      // Quote requires a payment method - must have one selected and it must match
      if (
        !selectedPaymentMethod ||
        selectedPaymentMethod.id !== quotePaymentMethod
      ) {
        return;
      }
    }

    // Native/whitelabel provider (e.g. Transak Native) -> deposit flow
    if (isNativeProvider(selectedQuote)) {
      navigation.navigate(
        ...createDepositNavigationDetails({
          assetId: selectedToken?.assetId,
          amount: String(amountAsNumber),
          currency,
          shouldRouteImmediately: true,
        }),
      );
      return;
    }

    // Aggregator provider -> needs a widget URL
    // Note: CustomActions (e.g., PayPal) are handled through the same flow.
    // If the API returns a quote with a URL, it will be opened in the checkout webview.
    // If customActions appear without a URL, they will error here (needs backend fix).
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    setIsNavigating(true);
    try {
      const widgetUrl = await getWidgetUrl(selectedQuote);

      if (widgetUrl) {
        navigation.navigate(
          ...createCheckoutNavDetails({
            url: widgetUrl,
            providerName: getQuoteProviderName(selectedQuote),
            userAgent: getQuoteBuyUserAgent(selectedQuote),
          }),
        );
      } else {
        Logger.error(
          new Error('No widget URL available for aggregator provider'),
          { provider: selectedQuote.provider },
        );
        setErrorState({ type: 'widget_url_missing', isCritical: true });
      }
    } catch (error) {
      Logger.error(error as Error, {
        provider: selectedQuote.provider,
        message: 'Failed to fetch widget URL',
      });
      setErrorState({ type: 'widget_url_failed', isCritical: true });
    } finally {
      setIsNavigating(false);
      isNavigatingRef.current = false;
    }
  }, [
    selectedQuote,
    navigation,
    getWidgetUrl,
    amountAsNumber,
    selectedToken,
    currency,
    selectedPaymentMethod,
  ]);

  const quoteMatchesAmount =
    debouncedPollingAmount === amountAsNumber && debouncedPollingAmount > 0;

  const quoteMatchesCurrentContext = useMemo(() => {
    if (!selectedQuote) return false;

    const quoteAmount =
      selectedQuote.quote?.amountIn ??
      (selectedQuote as { amountIn?: number }).amountIn;
    const quotePaymentMethod =
      selectedQuote.quote?.paymentMethod ??
      (selectedQuote as { paymentMethod?: string }).paymentMethod;

    // Amount must match
    if (quoteAmount !== amountAsNumber) return false;

    // Payment method context must match
    if (quotePaymentMethod != null) {
      // Quote requires a payment method - must have one selected and it must match
      if (
        !selectedPaymentMethod ||
        selectedPaymentMethod.id !== quotePaymentMethod
      ) {
        return false;
      }
    }

    return true;
  }, [selectedQuote, amountAsNumber, selectedPaymentMethod]);

  const canContinue =
    hasAmount &&
    !quotesLoading &&
    !isNavigating &&
    selectedQuote !== null &&
    quoteMatchesAmount &&
    quoteMatchesCurrentContext;

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content style={styles.content}>
          <View style={styles.centerGroup}>
            <View style={styles.amountContainer}>
              <Text
                variant={TextVariant.HeadingLG}
                style={styles.mainAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatCurrency(amountAsNumber, currency, {
                  currencyDisplay: 'narrowSymbol',
                })}
              </Text>
              <PaymentMethodPill
                label={
                  selectedPaymentMethod?.name ||
                  strings('fiat_on_ramp.select_payment_method')
                }
                isLoading={paymentMethodsLoading}
                onPress={() => {
                  navigation.navigate(
                    ...createPaymentSelectionModalNavigationDetails(),
                  );
                }}
              />
            </View>
          </View>

          <View style={styles.actionSection}>
            {selectedProvider && (
              <Text variant={TextVariant.BodySM} style={styles.poweredByText}>
                {strings('fiat_on_ramp.powered_by_provider', {
                  provider: selectedProvider.name,
                })}
              </Text>
            )}
            {hasAmount ? (
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                onPress={handleContinuePress}
                isFullWidth
                isDisabled={!canContinue}
                isLoading={quotesLoading || isNavigating}
                testID="build-quote-continue-button"
              >
                {strings('fiat_on_ramp.continue')}
              </Button>
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
