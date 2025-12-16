import React, { useCallback, useEffect, useState } from 'react';
import { View, TouchableOpacity, InteractionManager } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { BuyQuote } from '@consensys/native-ramps-sdk';

import styleSheet from './BuildQuote.styles';

import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import Keypad from '../../../../../Base/Keypad';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import BadgeNetwork from '../../../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';
import AvatarToken from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import ListItem from '../../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';
import TagBase from '../../../../../../component-library/base-components/TagBase';

import AccountSelector from '../../components/AccountSelector';

import { useDepositSDK } from '../../sdk';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';
import useDepositTokenExchange from '../../hooks/useDepositTokenExchange';

import { useStyles } from '../../../../../hooks/useStyles';
import { useDepositRouting } from '../../hooks/useDepositRouting';
import useAnalytics from '../../../hooks/useAnalytics';
import { useCryptoCurrencies } from '../../hooks/useCryptoCurrencies';
import { useRegions } from '../../hooks/useRegions';
import { usePaymentMethods } from '../../hooks/usePaymentMethods';
import SdkErrorAlert from '../../components/SdkErrorAlert/SdkErrorAlert';
import TruncatedError from '../../components/TruncatedError/TruncatedError';
import { useDepositCryptoCurrencyNetworkName } from '../../hooks/useDepositCryptoCurrencyNetworkName';

import { createTokenSelectorModalNavigationDetails } from '../Modals/TokenSelectorModal/TokenSelectorModal';
import { createPaymentMethodSelectorModalNavigationDetails } from '../Modals/PaymentMethodSelectorModal/PaymentMethodSelectorModal';
import { createRegionSelectorModalNavigationDetails } from '../Modals/RegionSelectorModal';
import { createUnsupportedRegionModalNavigationDetails } from '../Modals/UnsupportedRegionModal';
import { createIncompatibleAccountTokenModalNavigationDetails } from '../Modals/IncompatibleAccountTokenModal';
import { createConfigurationModalNavigationDetails } from '../Modals/ConfigurationModal/ConfigurationModal';

import { formatCurrency } from '../../utils';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { strings } from '../../../../../../../locales/i18n';
import { getDepositNavbarOptions } from '../../../../Navbar';
import Logger from '../../../../../../util/Logger';
import { trace, endTrace, TraceName } from '../../../../../../util/trace';

import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { MUSD_PLACEHOLDER } from '../../constants/constants';
import { useDepositUser } from '../../hooks/useDepositUser';
import { getAllDepositOrders } from '../../../../../../reducers/fiatOrders';

interface BuildQuoteParams {
  shouldRouteImmediately?: boolean;
}

export const createBuildQuoteNavDetails =
  createNavigationDetails<BuildQuoteParams>(Routes.DEPOSIT.BUILD_QUOTE);

const BuildQuote = () => {
  const { shouldRouteImmediately } = useParams<BuildQuoteParams>();

  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const trackEvent = useAnalytics();
  const depositOrders = useSelector(getAllDepositOrders);

  const {
    regions,
    isFetching: isFetchingRegions,
    error: regionsError,
    retryFetchRegions,
    userRegionLocked,
  } = useRegions();

  const {
    userDetails,
    isFetching: isFetchingUserDetails,
    error: userDetailsError,
    fetchUserDetails,
  } = useDepositUser({
    screenLocation: 'BuildQuote Screen',
    shouldTrackFetch: true,
    fetchOnMount: true,
  });

  const {
    cryptoCurrencies,
    isFetching: isFetchingCryptos,
    error: cryptosError,
    retryFetchCryptoCurrencies,
  } = useCryptoCurrencies();
  const {
    paymentMethods,
    isFetching: isFetchingPaymentMethods,
    error: paymentMethodsError,
    retryFetchPaymentMethods,
  } = usePaymentMethods();

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const {
    isAuthenticated,
    selectedRegion,
    selectedPaymentMethod,
    selectedCryptoCurrency,
    selectedWalletAddress,
  } = useDepositSDK();

  const [amount, setAmount] = useState<string>('0');
  const [amountAsNumber, setAmountAsNumber] = useState<number>(0);
  const [quoteError, setError] = useState<string | null>();

  const { routeAfterAuthentication, navigateToVerifyIdentity } =
    useDepositRouting();

  const getNetworkName = useDepositCryptoCurrencyNetworkName();

  const [, getQuote] = useDepositSdkMethod(
    { method: 'getBuyQuote', onMount: false, throws: true },
    selectedRegion?.currency || '',
    selectedCryptoCurrency?.assetId || '',
    selectedCryptoCurrency?.chainId || '',
    selectedPaymentMethod?.id || '',
    amount,
  );

  const {
    tokenAmount,
    isLoading: isLoadingTokenAmount,
    error: errorLoadingTokenAmount,
  } = useDepositTokenExchange({
    fiatCurrency: selectedRegion?.currency || null,
    fiatAmount: amount,
    token: selectedCryptoCurrency,
    tokens: cryptoCurrencies,
  });

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        {
          title: strings('deposit.buildQuote.title'),
          showBack: false,
          showClose: true,
          showConfiguration: true,
          onConfigurationPress: () => {
            navigation.navigate(
              ...createConfigurationModalNavigationDetails({}),
            );
          },
        },
        theme,
      ),
    );
  }, [navigation, theme]);

  useEffect(() => {
    endTrace({
      name: TraceName.LoadDepositExperience,
      data: {
        destination: Routes.DEPOSIT.BUILD_QUOTE,
      },
    });
  }, []);

  const handleRegionPress = useCallback(() => {
    if (regionsError || !regions || regions.length === 0 || userRegionLocked) {
      return;
    }

    navigation.navigate(
      ...createRegionSelectorModalNavigationDetails({ regions }),
    );
  }, [navigation, regions, regionsError, userRegionLocked]);

  useFocusEffect(
    useCallback(() => {
      if (
        !isFetchingRegions &&
        selectedRegion &&
        !selectedRegion.supported &&
        regions
      ) {
        InteractionManager.runAfterInteractions(() => {
          navigation.navigate(
            ...createUnsupportedRegionModalNavigationDetails({
              regions,
            }),
          );
        });
      }
    }, [isFetchingRegions, selectedRegion, regions, navigation]),
  );

  const handleNavigateToIncompatibleAccountTokenModal = useCallback(() => {
    navigation.navigate(
      ...createIncompatibleAccountTokenModalNavigationDetails(),
    );
  }, [navigation]);

  const handleOnPressContinue = useCallback(async () => {
    setError(null);

    if (!selectedCryptoCurrency || !selectedPaymentMethod) {
      return;
    }
    if (!selectedWalletAddress) {
      handleNavigateToIncompatibleAccountTokenModal();
      return;
    }
    setIsLoading(true);
    let quote: BuyQuote | undefined;

    // Start tracing the continue flow process (if not coming from OTP)
    if (!shouldRouteImmediately) {
      trace({
        name: TraceName.DepositContinueFlow,
        tags: {
          amount: amountAsNumber,
          currency: selectedCryptoCurrency?.symbol || '',
          paymentMethod: selectedPaymentMethod?.id || '',
          authenticated: isAuthenticated,
        },
      });
    }

    try {
      trackEvent('RAMPS_ORDER_PROPOSED', {
        ramp_type: 'DEPOSIT',
        amount_source: amountAsNumber,
        amount_destination: Number(tokenAmount) || 0,
        payment_method_id: selectedPaymentMethod?.id || '',
        region: selectedRegion?.isoCode || '',
        chain_id: selectedCryptoCurrency?.chainId || '',
        currency_destination: selectedCryptoCurrency?.assetId || '',
        currency_destination_symbol: selectedCryptoCurrency?.symbol,
        currency_destination_network: getNetworkName(
          selectedCryptoCurrency?.chainId,
        ),
        currency_source: selectedRegion?.currency || '',
        is_authenticated: isAuthenticated,
        first_time_order: depositOrders.length === 0,
      });

      quote = await getQuote();

      if (!quote) {
        throw new Error(strings('deposit.buildQuote.quoteFetchError'));
      }
    } catch (quoteError) {
      if (!shouldRouteImmediately) {
        endTrace({
          name: TraceName.DepositContinueFlow,
          data: {
            error:
              quoteError instanceof Error
                ? quoteError.message
                : 'Unknown error',
          },
        });
      }

      Logger.error(
        quoteError as Error,
        'Deposit::BuildQuote - Error fetching quote',
      );

      trackEvent('RAMPS_ORDER_FAILED', {
        ramp_type: 'DEPOSIT',
        amount_source: amountAsNumber,
        amount_destination: Number(tokenAmount) || 0,
        payment_method_id: selectedPaymentMethod?.id || '',
        region: selectedRegion?.isoCode || '',
        chain_id: selectedCryptoCurrency?.chainId || '',
        currency_destination: selectedCryptoCurrency?.assetId || '',
        currency_destination_symbol: selectedCryptoCurrency?.symbol,
        currency_destination_network: getNetworkName(
          selectedCryptoCurrency?.chainId,
        ),
        currency_source: selectedRegion?.currency || '',
        error_message: 'BuildQuote - Error fetching quote',
        is_authenticated: isAuthenticated,
      });

      setError(
        quoteError instanceof Error && quoteError.message
          ? quoteError.message
          : strings('deposit.buildQuote.quoteFetchError'),
      );
      setIsLoading(false);
      return;
    }

    try {
      if (!isAuthenticated) {
        navigateToVerifyIdentity({ quote });
        return;
      }

      trackEvent('RAMPS_ORDER_SELECTED', {
        ramp_type: 'DEPOSIT',
        amount_source: quote.fiatAmount,
        amount_destination: quote.cryptoAmount,
        exchange_rate: Number(quote.conversionPrice || 0),
        gas_fee: Number(
          quote.feeBreakdown?.find((fee) => fee.type === 'network_fee')
            ?.value || 0,
        ),
        processing_fee: Number(
          quote.feeBreakdown?.find((fee) => fee.type === 'transak_fee')
            ?.value || 0,
        ),
        total_fee: Number(quote.totalFee || 0),
        payment_method_id: selectedPaymentMethod?.id || '',
        region: selectedRegion?.isoCode || '',
        chain_id: selectedCryptoCurrency?.chainId || '',
        currency_destination: selectedCryptoCurrency?.assetId || '',
        currency_destination_symbol: selectedCryptoCurrency?.symbol,
        currency_destination_network: getNetworkName(
          selectedCryptoCurrency?.chainId,
        ),
        currency_source: selectedRegion?.currency || '',
      });

      await routeAfterAuthentication(quote);
    } catch (routeError) {
      Logger.error(
        routeError as Error,
        'Deposit::BuildQuote - Error handling authentication',
      );

      trackEvent('RAMPS_ORDER_FAILED', {
        ramp_type: 'DEPOSIT',
        amount_source: quote?.fiatAmount || amountAsNumber,
        amount_destination: quote?.cryptoAmount || Number(tokenAmount) || 0,
        payment_method_id: selectedPaymentMethod?.id || '',
        region: selectedRegion?.isoCode || '',
        chain_id: selectedCryptoCurrency?.chainId || '',
        currency_destination: selectedCryptoCurrency?.assetId || '',
        currency_destination_symbol: selectedCryptoCurrency?.symbol,
        currency_destination_network: getNetworkName(
          selectedCryptoCurrency?.chainId,
        ),
        currency_source: selectedRegion?.currency || '',
        error_message: 'BuildQuote - Error handling authentication',
        is_authenticated: isAuthenticated,
      });

      setError(
        routeError instanceof Error && routeError.message
          ? routeError.message
          : strings('deposit.buildQuote.unexpectedError'),
      );
      return;
    } finally {
      setIsLoading(false);
    }
  }, [
    getNetworkName,
    handleNavigateToIncompatibleAccountTokenModal,
    trackEvent,
    amountAsNumber,
    tokenAmount,
    selectedPaymentMethod,
    selectedRegion?.isoCode,
    selectedCryptoCurrency,
    selectedRegion?.currency,
    isAuthenticated,
    getQuote,
    routeAfterAuthentication,
    navigateToVerifyIdentity,
    shouldRouteImmediately,
    selectedWalletAddress,
    depositOrders.length,
  ]);

  const handleKeypadChange = useCallback(
    ({
      value,
      valueAsNumber,
    }: {
      value: string;
      valueAsNumber: number;
      pressedKey: string;
    }) => {
      setError(null);
      setAmount(value || '0');
      setAmountAsNumber(valueAsNumber || 0);
    },
    [setAmount, setAmountAsNumber, setError],
  );

  const handleCryptoPress = useCallback(() => {
    if (cryptosError || !cryptoCurrencies || cryptoCurrencies.length === 0) {
      return;
    }

    const networkName = selectedCryptoCurrency
      ? getNetworkName(selectedCryptoCurrency.chainId)
      : undefined;

    trackEvent('RAMPS_TOKEN_SELECTOR_CLICKED', {
      ramp_type: 'DEPOSIT',
      region: selectedRegion?.isoCode,
      location: 'build_quote',
      chain_id: selectedCryptoCurrency?.chainId,
      currency_destination: selectedCryptoCurrency?.assetId,
      currency_destination_symbol: selectedCryptoCurrency?.symbol,
      currency_destination_network: networkName,
      currency_source: selectedRegion?.currency,
      is_authenticated: isAuthenticated,
    });

    setError(null);
    navigation.navigate(
      ...createTokenSelectorModalNavigationDetails({ cryptoCurrencies }),
    );
  }, [
    navigation,
    cryptoCurrencies,
    cryptosError,
    trackEvent,
    selectedRegion?.isoCode,
    selectedRegion?.currency,
    getNetworkName,
    isAuthenticated,
    selectedCryptoCurrency,
  ]);

  const handlePaymentMethodPress = useCallback(() => {
    if (paymentMethodsError || !paymentMethods || paymentMethods.length === 0) {
      return;
    }

    setError(null);
    navigation.navigate(
      ...createPaymentMethodSelectorModalNavigationDetails({
        paymentMethods,
      }),
    );
  }, [navigation, paymentMethods, paymentMethodsError]);

  const networkName = selectedCryptoCurrency
    ? getNetworkName(selectedCryptoCurrency.chainId)
    : undefined;

  const networkImageSource = selectedCryptoCurrency?.chainId
    ? getNetworkImageSource({
        chainId: selectedCryptoCurrency.chainId,
      })
    : null;

  useEffect(() => {
    if (shouldRouteImmediately) {
      if (isAuthenticated && (isFetchingUserDetails || !userDetails)) {
        return;
      }

      navigation.setParams({
        shouldRouteImmediately: false,
      });

      if (
        userDetails?.address?.countryCode &&
        selectedRegion?.isoCode?.toLowerCase() !==
          userDetails?.address?.countryCode?.toLowerCase()
      ) {
        setIsLoading(false);
        return;
      }

      handleOnPressContinue();
    }
  }, [
    shouldRouteImmediately,
    handleOnPressContinue,
    navigation,
    selectedRegion?.isoCode,
    userDetails?.address?.countryCode,
    isAuthenticated,
    isFetchingUserDetails,
    userDetails,
  ]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content style={styles.content}>
          <View style={styles.selectionRow}>
            <AccountSelector isEvmOnly={false} />
            <TouchableOpacity
              style={styles.fiatSelector}
              onPress={handleRegionPress}
              disabled={!!regionsError || !regions || regions.length === 0}
            >
              <View style={styles.regionContent}>
                {!selectedRegion ? (
                  <>
                    <Text variant={TextVariant.BodyMD}>🏳️</Text>
                    <Text variant={TextVariant.BodyMD}>—</Text>
                  </>
                ) : (
                  <>
                    <Text variant={TextVariant.BodyMD}>
                      {selectedRegion?.flag}
                    </Text>
                    <Text variant={TextVariant.BodyMD}>
                      {selectedRegion?.isoCode}
                    </Text>
                  </>
                )}
                <Icon
                  name={IconName.ArrowDown}
                  size={IconSize.Sm}
                  color={theme.colors.icon.alternative}
                />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.centerGroup}>
            <View>
              <Text
                variant={TextVariant.HeadingLG}
                style={styles.mainAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatCurrency(
                  amountAsNumber,
                  selectedRegion?.currency || 'USD',
                  {
                    currencyDisplay: 'narrowSymbol',
                    maximumFractionDigits: 0,
                  },
                )}
              </Text>

              {!quoteError && (
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                  style={styles.convertedAmount}
                >
                  {isLoadingTokenAmount ||
                  errorLoadingTokenAmount ||
                  !selectedCryptoCurrency ||
                  isFetchingCryptos ||
                  !cryptoCurrencies ||
                  cryptoCurrencies.length === 0 ? (
                    ' '
                  ) : (
                    <>
                      {Number(tokenAmount) === 0 ? '0' : tokenAmount}{' '}
                      {selectedCryptoCurrency.symbol}
                    </>
                  )}
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={handleCryptoPress}
              disabled={
                !!cryptosError ||
                !cryptoCurrencies ||
                cryptoCurrencies.length === 0
              }
            >
              <View style={styles.cryptoPill}>
                {!selectedCryptoCurrency ? (
                  <>
                    <AvatarToken
                      name={MUSD_PLACEHOLDER.symbol}
                      imageSource={{ uri: MUSD_PLACEHOLDER.iconUrl }}
                      size={AvatarSize.Md}
                    />
                    <Text variant={TextVariant.HeadingLG}>
                      {MUSD_PLACEHOLDER.symbol}
                    </Text>
                  </>
                ) : (
                  <>
                    <BadgeWrapper
                      badgePosition={BadgePosition.BottomRight}
                      badgeElement={
                        networkImageSource ? (
                          <BadgeNetwork
                            name={networkName}
                            imageSource={networkImageSource}
                          />
                        ) : null
                      }
                    >
                      <AvatarToken
                        name={selectedCryptoCurrency?.name || ''}
                        imageSource={{
                          uri: selectedCryptoCurrency?.iconUrl || '',
                        }}
                        size={AvatarSize.Md}
                      />
                    </BadgeWrapper>
                    <Text variant={TextVariant.HeadingLG}>
                      {selectedCryptoCurrency?.symbol}
                    </Text>
                  </>
                )}

                <Icon
                  name={IconName.ArrowDown}
                  size={IconSize.Sm}
                  color={theme.colors.icon.alternative}
                />
              </View>
            </TouchableOpacity>
            <SdkErrorAlert
              error={regionsError}
              onRetry={retryFetchRegions}
              isRetrying={isFetchingRegions}
              errorType="regions"
            />
            <SdkErrorAlert
              error={cryptosError}
              onRetry={retryFetchCryptoCurrencies}
              isRetrying={isFetchingCryptos}
              errorType="tokens"
            />
            <SdkErrorAlert
              error={paymentMethodsError}
              onRetry={retryFetchPaymentMethods}
              isRetrying={isFetchingPaymentMethods}
              errorType="paymentMethods"
            />
            <SdkErrorAlert
              error={userDetailsError}
              onRetry={fetchUserDetails}
              isRetrying={isFetchingUserDetails}
              errorType="userDetails"
            />
            {quoteError && (
              <View style={styles.errorContainer}>
                <TruncatedError error={quoteError} />
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.paymentMethodBox}
            onPress={handlePaymentMethodPress}
            disabled={
              !!paymentMethodsError ||
              !paymentMethods ||
              paymentMethods.length === 0
            }
          >
            <ListItem gap={8}>
              <ListItemColumn widthType={WidthType.Fill}>
                <Text variant={TextVariant.BodyMD}>
                  {strings('deposit.buildQuote.payWith')}
                </Text>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {selectedPaymentMethod?.name || ' '}
                </Text>
              </ListItemColumn>

              <ListItemColumn>
                {selectedPaymentMethod ? (
                  <TagBase
                    includesBorder
                    textProps={{ variant: TextVariant.BodySM }}
                  >
                    {strings(
                      `deposit.payment_duration.${selectedPaymentMethod.duration}`,
                    )}
                  </TagBase>
                ) : null}
              </ListItemColumn>
              <ListItemColumn>
                <Icon
                  name={IconName.ArrowRight}
                  size={IconSize.Md}
                  color={theme.colors.icon.alternative}
                />
              </ListItemColumn>
            </ListItem>
          </TouchableOpacity>

          <Keypad value={amount} onChange={handleKeypadChange} />
        </ScreenLayout.Content>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <Button
            size={ButtonSize.Lg}
            onPress={handleOnPressContinue}
            label={'Continue'}
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
            isDisabled={
              amountAsNumber <= 0 ||
              isLoading ||
              !!regionsError ||
              !!cryptosError ||
              !!paymentMethodsError ||
              !!userDetailsError ||
              !selectedRegion ||
              !selectedCryptoCurrency ||
              !selectedPaymentMethod
            }
            loading={isLoading}
          />
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default BuildQuote;
