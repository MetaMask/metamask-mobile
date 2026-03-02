import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
import {
  getQuickBuyErrorCallback,
  removeQuickBuyErrorCallback,
} from '../../utils/quickBuyCallbackRegistry';

export interface BuildQuoteParams {
  assetId?: string;
  amount?: string;
  currency?: string;
  providerId?: string;
  paymentMethodId?: string;
  autoProceed?: boolean;
  callbackKey?: string;
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

const autoProceedDispatched = new Set<string>();

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
  const isAutoProceed = Boolean(params?.autoProceed);

  useEffect(() => {
    if (params?.nativeFlowError) {
      setNativeFlowError(params.nativeFlowError);
      navigation.setParams({ nativeFlowError: undefined });
    }
  }, [params?.nativeFlowError, navigation]);

  useEffect(() => {
    const amountFromIntent = Number(params?.amount);
    if (
      !userHasEnteredAmount &&
      params?.amount &&
      Number.isFinite(amountFromIntent) &&
      amountFromIntent > 0
    ) {
      setAmount(params.amount);
      setAmountAsNumber(amountFromIntent);
      setUserHasEnteredAmount(true);
    }
  }, [params?.amount, userHasEnteredAmount]);

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
    providers,
    selectedProvider,
    setSelectedProvider,
    paymentMethods,
    setSelectedPaymentMethod,
    selectedToken,
    getWidgetUrl,
    paymentMethodsLoading,
    selectedPaymentMethod,
    providersLoading,
  } = useRampsController();

  const hasAppliedRoutingSelectionsRef = useRef(false);
  useEffect(() => {
    if (hasAppliedRoutingSelectionsRef.current) {
      return;
    }

    const hasProviderIntent = Boolean(params?.providerId);
    const hasPaymentMethodIntent = Boolean(params?.paymentMethodId);
    if (!hasProviderIntent && !hasPaymentMethodIntent) {
      hasAppliedRoutingSelectionsRef.current = true;
      return;
    }

    let hasResolvedProviderSelection = !hasProviderIntent;
    if (hasProviderIntent) {
      const intendedProvider = providers.find(
        (provider) => provider.id === params?.providerId,
      );

      if (!intendedProvider) {
        hasResolvedProviderSelection = !providersLoading;
      } else if (selectedProvider?.id === intendedProvider.id) {
        hasResolvedProviderSelection = true;
      } else {
        setSelectedProvider(intendedProvider);
        return;
      }
    }

    let hasResolvedPaymentSelection = !hasPaymentMethodIntent;
    if (hasPaymentMethodIntent) {
      const intendedPaymentMethod = paymentMethods.find(
        (paymentMethod) => paymentMethod.id === params?.paymentMethodId,
      );

      if (!intendedPaymentMethod) {
        hasResolvedPaymentSelection = !paymentMethodsLoading;
      } else {
        if (selectedPaymentMethod?.id !== intendedPaymentMethod.id) {
          setSelectedPaymentMethod(intendedPaymentMethod);
        }
        hasResolvedPaymentSelection = true;
      }
    }

    if (hasResolvedProviderSelection && hasResolvedPaymentSelection) {
      hasAppliedRoutingSelectionsRef.current = true;
      navigation.setParams({
        providerId: undefined,
        paymentMethodId: undefined,
      });
    }
  }, [
    params?.providerId,
    params?.paymentMethodId,
    paymentMethods,
    paymentMethodsLoading,
    providers,
    providersLoading,
    navigation,
    selectedPaymentMethod?.id,
    selectedProvider?.id,
    setSelectedPaymentMethod,
    setSelectedProvider,
  ]);

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

  const handleContinuePress = useCallback(
    async (options?: { suppressUiError?: boolean }) => {
      const suppressUiError = options?.suppressUiError ?? false;
      if (!selectedQuote || !selectedProvider) {
        return {
          success: false,
          errorMessage: strings('deposit.buildQuote.unexpectedError'),
        };
      }

      const quoteAmount =
        selectedQuote.quote?.amountIn ??
        (selectedQuote as { amountIn?: number }).amountIn;
      const quotePaymentMethod =
        selectedQuote.quote?.paymentMethod ??
        (selectedQuote as { paymentMethod?: string }).paymentMethod;

      if (selectedQuote.provider !== selectedProvider.id) {
        return {
          success: false,
          errorMessage: strings('deposit.buildQuote.unexpectedError'),
        };
      }

      if (quoteAmount !== amountAsNumber) {
        return {
          success: false,
          errorMessage: strings('deposit.buildQuote.unexpectedError'),
        };
      }

      if (quotePaymentMethod != null) {
        if (
          !selectedPaymentMethod ||
          selectedPaymentMethod.id !== quotePaymentMethod
        ) {
          return {
            success: false,
            errorMessage: strings('deposit.buildQuote.unexpectedError'),
          };
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
          return { success: true };
        } catch (error) {
          Logger.error(error as Error, {
            message: 'Failed to route native provider flow',
          });
          const errorMessage = parseUserFacingError(
            error,
            strings('deposit.buildQuote.unexpectedError'),
          );
          if (!suppressUiError) {
            setNativeFlowError(errorMessage);
          }
          return { success: false, errorMessage };
        } finally {
          setIsContinueLoading(false);
        }
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
              isQuickBuy: isAutoProceed,
            }),
          );
          return { success: true };
        }

        Logger.error(
          new Error('No widget URL available for aggregator provider'),
          { provider: selectedQuote.provider },
        );
        return {
          success: false,
          errorMessage: strings('deposit.buildQuote.unexpectedError'),
        };
      } catch (error) {
        Logger.error(error as Error, {
          provider: selectedQuote.provider,
          message: 'Failed to fetch widget URL',
        });
        return {
          success: false,
          errorMessage: parseUserFacingError(
            error,
            strings('deposit.buildQuote.unexpectedError'),
          ),
        };
      } finally {
        setIsContinueLoading(false);
      }
    },
    [
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
      isAutoProceed,
    ],
  );

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

  const exitQuickBuyFlow = useCallback(
    (errorMessage?: string) => {
      if (params?.callbackKey && errorMessage) {
        getQuickBuyErrorCallback(params.callbackKey)?.(errorMessage);
      }
      if (params?.callbackKey) {
        removeQuickBuyErrorCallback(params.callbackKey);
      }

      const navigationWithParent = navigation as typeof navigation & {
        getParent?: () => {
          getParent?: () => {
            canGoBack?: () => boolean;
            goBack?: () => void;
          };
        };
      };
      const topLevelNavigation = navigationWithParent
        .getParent?.()
        ?.getParent?.();
      if (topLevelNavigation?.canGoBack?.()) {
        topLevelNavigation.goBack?.();
        return;
      }
      if (navigation.canGoBack?.()) {
        navigation.goBack();
      }
    },
    [navigation, params?.callbackKey],
  );

  const autoProceedAttemptedRef = useRef(false);
  const autoProceedFailedRef = useRef(false);

  const autoProceedSessionKey = isAutoProceed
    ? `${params?.assetId ?? ''}|${params?.paymentMethodId ?? ''}|${params?.amount ?? ''}`
    : '';

  const isAutoProceedAlreadyDispatched =
    isAutoProceed &&
    autoProceedSessionKey !== '' &&
    autoProceedDispatched.has(autoProceedSessionKey);

  useEffect(() => {
    if (
      !isAutoProceed ||
      isAutoProceedAlreadyDispatched ||
      autoProceedAttemptedRef.current ||
      autoProceedFailedRef.current
    ) {
      return;
    }

    if (quoteFetchError) {
      autoProceedFailedRef.current = true;
      exitQuickBuyFlow(
        parseUserFacingError(
          quoteFetchError,
          strings('deposit.buildQuote.quoteFetchError'),
        ),
      );
      return;
    }

    if (
      quoteFetchEnabled &&
      !selectedQuoteLoading &&
      quotesResponse &&
      !canContinue
    ) {
      autoProceedFailedRef.current = true;
      exitQuickBuyFlow(strings('fiat_on_ramp.quote_unavailable'));
    }
  }, [
    isAutoProceed,
    isAutoProceedAlreadyDispatched,
    quoteFetchEnabled,
    quoteFetchError,
    selectedQuoteLoading,
    quotesResponse,
    canContinue,
    exitQuickBuyFlow,
  ]);

  useEffect(() => {
    if (
      !isAutoProceed ||
      isAutoProceedAlreadyDispatched ||
      autoProceedAttemptedRef.current ||
      autoProceedFailedRef.current ||
      selectedQuoteLoading ||
      isContinueLoading
    ) {
      return;
    }

    if (!selectedQuote || !selectedProvider) {
      return;
    }

    autoProceedAttemptedRef.current = true;
    if (autoProceedSessionKey) {
      autoProceedDispatched.add(autoProceedSessionKey);
      setTimeout(() => autoProceedDispatched.delete(autoProceedSessionKey), 300000);
    }

    let isCancelled = false;

    const continueFlow = async () => {
      const result = await handleContinuePress({ suppressUiError: true });
      if (isCancelled) {
        return;
      }

      if (!result.success) {
        autoProceedFailedRef.current = true;
        if (autoProceedSessionKey) {
          autoProceedDispatched.delete(autoProceedSessionKey);
        }
        exitQuickBuyFlow(
          result.errorMessage || strings('deposit.buildQuote.unexpectedError'),
        );
      } else if (params?.callbackKey) {
        removeQuickBuyErrorCallback(params.callbackKey);
      }
    };

    continueFlow().catch((error: unknown) => {
      Logger.error(error as Error, {
        message: 'Failed to auto proceed quick buy',
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [
    isAutoProceed,
    isAutoProceedAlreadyDispatched,
    autoProceedSessionKey,
    selectedQuote,
    selectedProvider,
    selectedQuoteLoading,
    isContinueLoading,
    handleContinuePress,
    exitQuickBuyFlow,
    params?.callbackKey,
  ]);

  useEffect(() => {
    if (!isAutoProceed || isAutoProceedAlreadyDispatched) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (!autoProceedAttemptedRef.current && !autoProceedFailedRef.current) {
        autoProceedFailedRef.current = true;
        exitQuickBuyFlow(strings('deposit.buildQuote.unexpectedError'));
      }
    }, 15000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isAutoProceed, isAutoProceedAlreadyDispatched, exitQuickBuyFlow]);

  const onContinuePress = useCallback(() => {
    handleContinuePress().catch((error: unknown) => {
      Logger.error(error as Error, {
        message: 'Failed to continue from build quote',
      });
    });
  }, [handleContinuePress]);

  if (isAutoProceed) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ScreenLayout.Content style={styles.content}>
            <View style={styles.centerGroup}>
              <ActivityIndicator testID="build-quote-auto-proceed-loader" />
            </View>
          </ScreenLayout.Content>
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content style={styles.content}>
          <View style={styles.centerGroup}>
            <View style={styles.amountContainer}>
              <Text
                testID={BuildQuoteSelectors.AMOUNT_INPUT}
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
                onPress={handlePaymentPillPress}
              />
            </View>
          </View>

          {nativeFlowError && (
            <BannerAlert
              severity={BannerAlertSeverity.Error}
              description={nativeFlowError}
            />
          )}

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
                {selectedProvider && (
                  <Text
                    variant={TextVariant.BodySM}
                    style={styles.poweredByText}
                  >
                    {strings('fiat_on_ramp.powered_by_provider', {
                      provider: selectedProvider.name,
                    })}
                  </Text>
                )}
                <Button
                  variant={ButtonVariant.Primary}
                  size={ButtonSize.Lg}
                  onPress={onContinuePress}
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
