import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { CaipChainId } from '@metamask/utils';

import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import { getRampCallbackBaseUrl } from '../../utils/getRampCallbackBaseUrl';
import Keypad, { type KeypadChangeData } from '../../../../Base/Keypad';
import PaymentMethodPill from '../../components/PaymentMethodPill';
import QuickAmounts from '../../components/QuickAmounts';
import Text, {
  TextVariant,
  TextColor,
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
import { useFormatters } from '../../../../hooks/useFormatters';
import { useTokenNetworkInfo } from '../../hooks/useTokenNetworkInfo';
import { useRampsController } from '../../hooks/useRampsController';
import { useRampsQuotes } from '../../hooks/useRampsQuotes';
import { createSettingsModalNavDetails } from '../Modals/SettingsModal';
import useRampAccountAddress from '../../hooks/useRampAccountAddress';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { BuildQuoteSelectors } from '../../Aggregator/Views/BuildQuote/BuildQuote.testIds';
import { createPaymentSelectionModalNavigationDetails } from '../Modals/PaymentSelectionModal';
import { createCheckoutNavDetails } from '../Checkout';
import {
  isNativeProvider,
  getQuoteProviderName,
  getQuoteBuyUserAgent,
} from '../../types';
import { FIAT_ORDER_PROVIDERS } from '../../../../../constants/on-ramp';
import Logger from '../../../../../util/Logger';
import { createTokenNotAvailableModalNavigationDetails } from '../Modals/TokenNotAvailableModal';
import { useParams } from '../../../../../util/navigation/navUtils';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import { useTransakController } from '../../hooks/useTransakController';
import { useTransakRouting } from '../../hooks/useTransakRouting';
import { createV2EnterEmailNavDetails } from '../NativeFlow/EnterEmail';
import { parseUserFacingError } from '../../utils/parseUserFacingError';
import TruncatedError from '../../components/TruncatedError';
import { PROVIDER_LINKS } from '../../Aggregator/types';

export interface BuildQuoteParams {
  assetId?: string;
  nativeFlowError?: string;
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
  const { formatCurrency } = useFormatters();

  const [amount, setAmount] = useState<string>(() => String(DEFAULT_AMOUNT));
  const [amountAsNumber, setAmountAsNumber] = useState<number>(DEFAULT_AMOUNT);
  const [userHasEnteredAmount, setUserHasEnteredAmount] = useState(false);
  const [isOnBuildQuoteScreen, setIsOnBuildQuoteScreen] =
    useState<boolean>(true);
  const [isContinueLoading, setIsContinueLoading] = useState(false);
  const [nativeFlowError, setNativeFlowError] = useState<string | null>(null);
  const params = useParams<BuildQuoteParams>();

  useEffect(() => {
    if (params?.nativeFlowError) {
      setNativeFlowError(params.nativeFlowError);
      navigation.setParams({ nativeFlowError: undefined });
    }
  }, [params?.nativeFlowError, navigation]);

  useFocusEffect(
    useCallback(() => {
      setIsOnBuildQuoteScreen(true);
      return () => {
        setIsOnBuildQuoteScreen(false);
      };
    }, []),
  );

  const {
    userRegion,
    selectedProvider,
    selectedToken,
    getWidgetUrl,
    paymentMethodsLoading,
    selectedPaymentMethod,
  } = useRampsController();

  const isTokenUnavailable = useMemo(
    () =>
      !!(
        selectedProvider &&
        params?.assetId &&
        selectedProvider.supportedCryptoCurrencies &&
        !selectedProvider.supportedCryptoCurrencies[params.assetId]
      ),
    [selectedProvider, params?.assetId],
  );

  const hasShownTokenUnavailableRef = useRef(false);

  useEffect(() => {
    if (isTokenUnavailable && !hasShownTokenUnavailableRef.current) {
      hasShownTokenUnavailableRef.current = true;
      navigation.navigate(
        ...createTokenNotAvailableModalNavigationDetails({
          assetId: params?.assetId ?? '',
        }),
      );
    } else if (!isTokenUnavailable) {
      hasShownTokenUnavailableRef.current = false;
    }
  }, [isTokenUnavailable, params?.assetId, navigation]);

  const {
    checkExistingToken: transakCheckExistingToken,
    getBuyQuote: transakGetBuyQuote,
  } = useTransakController();

  const { routeAfterAuthentication: transakRouteAfterAuth } =
    useTransakRouting();

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

  const quoteFetchEnabled = !!(
    isOnBuildQuoteScreen &&
    walletAddress &&
    selectedPaymentMethod &&
    selectedProvider &&
    selectedToken?.assetId &&
    debouncedPollingAmount > 0
  );

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
            forceRefresh: true,
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

  const selectedQuote = useMemo(() => {
    if (!quotesResponse?.success || !selectedProvider || !selectedPaymentMethod)
      return null;
    const { success } = quotesResponse;
    const providerMatches = (q: (typeof success)[0]) =>
      q.provider === selectedProvider.id;
    if (success.length === 1) {
      return providerMatches(success[0]) ? success[0] : null;
    }
    if (success.length > 1) {
      const match = success.find(
        (q) =>
          providerMatches(q) &&
          q.quote?.paymentMethod === selectedPaymentMethod.id,
      );
      return match ?? null;
    }
    return null;
  }, [quotesResponse, selectedProvider, selectedPaymentMethod]);

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
      setNativeFlowError(null);
    },
    [],
  );

  const handleQuickAmountPress = useCallback((quickAmount: number) => {
    setAmount(String(quickAmount));
    setAmountAsNumber(quickAmount);
    setUserHasEnteredAmount(true);
    setNativeFlowError(null);
  }, []);

  const handlePaymentPillPress = useCallback(() => {
    if (debouncedPollingAmount <= 0) {
      return;
    }

    navigation.navigate(
      ...createPaymentSelectionModalNavigationDetails({
        amount: debouncedPollingAmount,
      }),
    );
  }, [debouncedPollingAmount, navigation]);

  const handleContinuePress = useCallback(async () => {
    if (!selectedQuote || !selectedProvider) return;
    setNativeFlowError(null);

    const quoteAmount =
      selectedQuote.quote?.amountIn ??
      (selectedQuote as { amountIn?: number }).amountIn;
    const quotePaymentMethod =
      selectedQuote.quote?.paymentMethod ??
      (selectedQuote as { paymentMethod?: string }).paymentMethod;

    // Validate provider matches (prevents proceeding with wrong-provider quote)
    if (selectedQuote.provider !== selectedProvider.id) return;

    // Validate amount matches
    if (quoteAmount !== amountAsNumber) {
      return;
    }

    // Validate payment method context matches
    if (quotePaymentMethod != null) {
      if (
        !selectedPaymentMethod ||
        selectedPaymentMethod.id !== quotePaymentMethod
      ) {
        return;
      }
    }

    if (isNativeProvider(selectedQuote)) {
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
          await transakRouteAfterAuth(quote);
        } else {
          navigation.navigate(
            ...createV2EnterEmailNavDetails({
              amount: String(amountAsNumber),
              currency,
              assetId: selectedToken?.assetId,
            }),
          );
        }
      } catch (error) {
        Logger.error(error as Error, {
          message: 'Failed to route native provider flow',
        });
        setNativeFlowError(
          parseUserFacingError(
            error,
            strings('deposit.buildQuote.unexpectedError'),
          ),
        );
      } finally {
        setIsContinueLoading(false);
      }
      return;
    }

    setIsContinueLoading(true);
    try {
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
        Logger.error(
          new Error('No widget URL available for aggregator provider'),
          { provider: selectedQuote.provider },
        );
        setNativeFlowError(strings('deposit.buildQuote.unexpectedError'));
      }
    } catch (error) {
      Logger.error(error as Error, {
        provider: selectedQuote.provider,
        message: 'Failed to fetch widget URL',
      });
      setNativeFlowError(
        parseUserFacingError(
          error,
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
    getWidgetUrl,
    amountAsNumber,
    selectedPaymentMethod,
    transakCheckExistingToken,
    transakGetBuyQuote,
    transakRouteAfterAuth,
  ]);

  const hasAmount = amountAsNumber > 0;

  const quoteMatchesAmount =
    debouncedPollingAmount === amountAsNumber && debouncedPollingAmount > 0;

  const quoteMatchesCurrentContext = useMemo(() => {
    if (!selectedQuote || !selectedProvider) return false;

    const quoteAmount =
      selectedQuote.quote?.amountIn ??
      (selectedQuote as { amountIn?: number }).amountIn;
    const quotePaymentMethod =
      selectedQuote.quote?.paymentMethod ??
      (selectedQuote as { paymentMethod?: string }).paymentMethod;

    // Provider must match (prevents using a stale quote for a different provider)
    if (selectedQuote.provider !== selectedProvider.id) return false;

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
  }, [selectedQuote, selectedProvider, amountAsNumber, selectedPaymentMethod]);

  const canContinue =
    hasAmount &&
    !selectedQuoteLoading &&
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
                testID={BuildQuoteSelectors.AMOUNT_INPUT}
                variant={TextVariant.HeadingLG}
                color={nativeFlowError ? TextColor.Error : undefined}
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
                onPress={handlePaymentPillPress}
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
                {nativeFlowError ? (
                  <TruncatedError
                    error={nativeFlowError}
                    providerName={selectedProvider?.name}
                    providerSupportUrl={
                      selectedProvider?.links?.find(
                        (link) => link.name === PROVIDER_LINKS.SUPPORT,
                      )?.url
                    }
                  />
                ) : (
                  selectedProvider && (
                    <Text
                      variant={TextVariant.BodySM}
                      style={styles.poweredByText}
                    >
                      {strings('fiat_on_ramp.powered_by_provider', {
                        provider: selectedProvider.name,
                      })}
                    </Text>
                  )
                )}
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
