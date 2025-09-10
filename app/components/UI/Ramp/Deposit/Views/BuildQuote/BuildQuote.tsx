import React, { useCallback, useEffect, useState } from 'react';
import { View, TouchableOpacity, InteractionManager } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
import useAccountTokenCompatible from '../../hooks/useAccountTokenCompatible';

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

import { selectNetworkConfigurations } from '../../../../../../selectors/networkController';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import Skeleton from '../../../../../../component-library/components/Skeleton/Skeleton';

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

  // Waterfall: fetch regions, crypto currencies, and payment methods
  const {
    regions,
    isFetching: isFetchingRegions,
    error: regionsError,
  } = useRegions();
  const {
    cryptoCurrencies,
    isFetching: isFetchingCryptos,
    error: cryptosError,
  } = useCryptoCurrencies();
  const {
    paymentMethods,
    isFetching: isFetchingPaymentMethods,
    error: paymentMethodsError,
  } = usePaymentMethods();

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const {
    isAuthenticated,
    selectedRegion,
    selectedPaymentMethod,
    selectedCryptoCurrency,
  } = useDepositSDK();

  const [amount, setAmount] = useState<string>('0');
  const [amountAsNumber, setAmountAsNumber] = useState<number>(0);
  const [error, setError] = useState<string | null>();

  const isAccountTokenCompatible = useAccountTokenCompatible(
    selectedCryptoCurrency,
  );

  const { routeAfterAuthentication, navigateToVerifyIdentity } =
    useDepositRouting({
      cryptoCurrencyChainId: selectedCryptoCurrency?.chainId || '',
      paymentMethodId: selectedPaymentMethod?.id || '',
    });

  const allNetworkConfigurations = useSelector(selectNetworkConfigurations);

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
    fiatCurrency: selectedRegion?.currency || 'USD',
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
    if (isFetchingRegions) {
      // Loading case: do nothing (button should be disabled via skeleton)
      return;
    }

    if (regions && regions.length > 0) {
      // Normal case: show regions
      navigation.navigate(
        ...createRegionSelectorModalNavigationDetails({ regions }),
      );
    } else if (regionsError || (regions && regions.length === 0)) {
      // Error case OR empty collection case: show error modal
      navigation.navigate(
        ...createRegionSelectorModalNavigationDetails({
          regions: [],
          error: regionsError || 'No regions available',
        }),
      );
    }
    // Loading case: do nothing (button should be disabled via skeleton)
  }, [navigation, regions, regionsError, isFetchingRegions]);

  useFocusEffect(
    useCallback(() => {
      if (selectedRegion && !selectedRegion.supported) {
        InteractionManager.runAfterInteractions(() => {
          navigation.navigate(
            ...createUnsupportedRegionModalNavigationDetails(),
          );
        });
      }
    }, [selectedRegion, navigation]),
  );

  const handleNavigateToIncompatibleAccountTokenModal = useCallback(() => {
    navigation.navigate(
      ...createIncompatibleAccountTokenModalNavigationDetails(),
    );
  }, [navigation]);

  const handleOnPressContinue = useCallback(async () => {
    if (!selectedCryptoCurrency || !selectedPaymentMethod) {
      return;
    }
    if (!isAccountTokenCompatible) {
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
        currency_source: selectedRegion?.currency || '',
        is_authenticated: isAuthenticated,
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
    isAccountTokenCompatible,
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
    if (cryptoCurrencies && cryptoCurrencies.length > 0) {
      // Normal case: show crypto currencies
      navigation.navigate(
        ...createTokenSelectorModalNavigationDetails({ cryptoCurrencies }),
      );
    } else if (
      cryptosError ||
      (cryptoCurrencies && cryptoCurrencies.length === 0)
    ) {
      // Error case OR empty collection case: show error modal
      navigation.navigate(
        ...createTokenSelectorModalNavigationDetails({
          cryptoCurrencies: [],
          error: cryptosError || 'No tokens available',
        }),
      );
    }
    // Loading case: do nothing (button should be disabled via skeleton)
  }, [navigation, cryptoCurrencies, cryptosError]);

  const handlePaymentMethodPress = useCallback(() => {
    if (paymentMethods && paymentMethods.length > 0) {
      // Normal case: show payment methods
      navigation.navigate(
        ...createPaymentMethodSelectorModalNavigationDetails({
          paymentMethods,
        }),
      );
    } else if (
      paymentMethodsError ||
      (paymentMethods && paymentMethods.length === 0)
    ) {
      // Error case OR empty collection case: show error modal
      navigation.navigate(
        ...createPaymentMethodSelectorModalNavigationDetails({
          paymentMethods: [],
          error: paymentMethodsError || 'No payment methods available',
        }),
      );
    }
    // Loading case: do nothing (button should be disabled via skeleton)
  }, [navigation, paymentMethods, paymentMethodsError]);

  const networkName =
    allNetworkConfigurations[selectedCryptoCurrency?.chainId ?? '']?.name;

  const networkImageSource = selectedCryptoCurrency?.chainId
    ? getNetworkImageSource({
        chainId: selectedCryptoCurrency.chainId,
      })
    : null;

  useEffect(() => {
    if (shouldRouteImmediately) {
      navigation.setParams({
        shouldRouteImmediately: false,
      });
      handleOnPressContinue();
    }
  }, [handleOnPressContinue, shouldRouteImmediately, navigation]);

  try {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ScreenLayout.Content style={styles.content}>
            <View style={styles.selectionRow}>
              <AccountSelector isEvmOnly={false} />
              {isFetchingRegions && !selectedRegion ? (
                <View style={[styles.fiatSelector, styles.regionContent]}>
                  <Skeleton height={20} width={80} />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.fiatSelector}
                  onPress={handleRegionPress}
                  disabled={false}
                >
                  <View style={styles.regionContent}>
                    {regionsError ||
                    (regions && regions.length === 0) ||
                    (regions && !selectedRegion && !isFetchingRegions) ? (
                      <>
                        <Icon
                          name={IconName.Danger}
                          size={IconSize.Sm}
                          color={theme.colors.error.default}
                        />
                        <Text
                          variant={TextVariant.BodyMD}
                          color={TextColor.Error}
                        >
                          {regionsError ? 'Error' : 'No region'}
                        </Text>
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
              )}
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

                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                  style={styles.convertedAmount}
                >
                  {isLoadingTokenAmount ||
                  errorLoadingTokenAmount ||
                  !selectedCryptoCurrency ? (
                    ' '
                  ) : (
                    <>
                      {Number(tokenAmount) === 0 ? '0' : tokenAmount}{' '}
                      {selectedCryptoCurrency.symbol}
                    </>
                  )}
                </Text>
              </View>

              {isFetchingCryptos ? (
                <View style={styles.cryptoPill}>
                  <Skeleton
                    height={24}
                    width={60}
                    style={styles.cryptoPillSkeleton}
                  />
                  <Icon
                    name={IconName.ArrowDown}
                    size={IconSize.Sm}
                    color={theme.colors.icon.alternative}
                  />
                </View>
              ) : (
                <TouchableOpacity onPress={handleCryptoPress} disabled={false}>
                  <View style={styles.cryptoPill}>
                    {cryptosError ||
                    (cryptoCurrencies && cryptoCurrencies.length === 0) ||
                    (cryptoCurrencies &&
                      !selectedCryptoCurrency &&
                      !isFetchingCryptos) ? (
                      <>
                        <Icon
                          name={IconName.Danger}
                          size={IconSize.Md}
                          color={theme.colors.error.default}
                        />
                        <Text
                          variant={TextVariant.BodyMD}
                          color={TextColor.Error}
                        >
                          {cryptosError ? 'Error' : 'No tokens'}
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
              )}
              {error && (
                <View style={styles.errorContainer}>
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Error}
                    style={styles.errorText}
                  >
                    {error}
                  </Text>
                </View>
              )}
            </View>

            {isFetchingPaymentMethods || isFetchingCryptos ? (
              <View style={styles.paymentMethodBox}>
                <ListItem gap={8}>
                  <ListItemColumn widthType={WidthType.Fill}>
                    <Skeleton
                      height={16}
                      width={60}
                      style={styles.skeletonMargin}
                    />
                    <Skeleton height={14} width={100} />
                  </ListItemColumn>
                  <ListItemColumn>
                    <Skeleton height={20} width={50} />
                  </ListItemColumn>
                </ListItem>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.paymentMethodBox}
                onPress={handlePaymentMethodPress}
                disabled={false}
              >
                <ListItem gap={8}>
                  <ListItemColumn widthType={WidthType.Fill}>
                    {paymentMethodsError ||
                    (paymentMethods && paymentMethods.length === 0) ||
                    (paymentMethods &&
                      !selectedPaymentMethod &&
                      !isFetchingPaymentMethods) ? (
                      <View style={styles.errorRow}>
                        <Icon
                          name={IconName.Danger}
                          size={IconSize.Sm}
                          color={theme.colors.error.default}
                        />
                        <Text
                          variant={TextVariant.BodyMD}
                          color={TextColor.Error}
                        >
                          {paymentMethodsError
                            ? 'Error loading payment methods'
                            : 'No payment methods available'}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Text variant={TextVariant.BodyMD}>
                          {strings('deposit.buildQuote.payWith')}
                        </Text>
                        <Text
                          variant={TextVariant.BodySM}
                          color={TextColor.Alternative}
                        >
                          {selectedPaymentMethod?.name}
                        </Text>
                      </>
                    )}
                  </ListItemColumn>

                  {selectedPaymentMethod &&
                    !paymentMethodsError &&
                    paymentMethods &&
                    paymentMethods.length > 0 && (
                      <>
                        <ListItemColumn>
                          <TagBase
                            includesBorder
                            textProps={{ variant: TextVariant.BodySM }}
                          >
                            {strings(
                              `deposit.payment_duration.${selectedPaymentMethod?.duration}`,
                            )}
                          </TagBase>
                        </ListItemColumn>
                        <ListItemColumn>
                          <Icon
                            name={IconName.ArrowRight}
                            size={IconSize.Md}
                            color={theme.colors.icon.alternative}
                          />
                        </ListItemColumn>
                      </>
                    )}
                </ListItem>
              </TouchableOpacity>
            )}

            <Keypad
              value={amount}
              onChange={handleKeypadChange}
              currency={selectedRegion?.currency}
              decimals={0}
              periodButtonProps={{
                isDisabled: true,
              }}
            />
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
              isDisabled={amountAsNumber <= 0 || isLoading}
              loading={isLoading}
            />
          </ScreenLayout.Content>
        </ScreenLayout.Footer>
      </ScreenLayout>
    );
  } catch (error) {
    console.error('BuildQuote Debug - Error caught in component:', error);
    console.error(
      'BuildQuote Debug - Error stack:',
      error instanceof Error ? error.stack : 'No stack trace',
    );

    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ScreenLayout.Content>
            <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
              Error: {error instanceof Error ? error.message : 'Unknown error'}
            </Text>
          </ScreenLayout.Content>
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }
};

export default BuildQuote;
