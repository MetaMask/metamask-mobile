import React, { useCallback, useEffect, useState } from 'react';
import { View, TouchableOpacity, InteractionManager } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { Hex, isHexString } from '@metamask/utils';

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
import useSupportedTokens from '../../hooks/useSupportedTokens';
import usePaymentMethods from '../../hooks/usePaymentMethods';
import useAccountTokenCompatible from '../../hooks/useAccountTokenCompatible';

import { createTokenSelectorModalNavigationDetails } from '../Modals/TokenSelectorModal/TokenSelectorModal';
import { createPaymentMethodSelectorModalNavigationDetails } from '../Modals/PaymentMethodSelectorModal/PaymentMethodSelectorModal';
import { createRegionSelectorModalNavigationDetails } from '../Modals/RegionSelectorModal';
import { createUnsupportedRegionModalNavigationDetails } from '../Modals/UnsupportedRegionModal';
import { createIncompatibleAccountTokenModalNavigationDetails } from '../Modals/IncompatibleAccountTokenModal';
import { createConfigurationModalNavigationDetails } from '../Modals/ConfigurationModal/ConfigurationModal';

import {
  getTransakCryptoCurrencyId,
  getTransakFiatCurrencyId,
  getTransakChainId,
  getTransakPaymentMethodId,
  formatCurrency,
} from '../../utils';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { strings } from '../../../../../../../locales/i18n';
import { getDepositNavbarOptions } from '../../../../Navbar';
import Logger from '../../../../../../util/Logger';

import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../../../../../selectors/networkController';
import {
  USDC_TOKEN,
  DepositCryptoCurrency,
  DepositPaymentMethod,
  USD_CURRENCY,
  DepositFiatCurrency,
  EUR_CURRENCY,
  APPLE_PAY_PAYMENT_METHOD,
} from '../../constants';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';

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

  const chainId = useSelector(selectChainId);
  const supportedTokens = useSupportedTokens();
  const paymentMethods = usePaymentMethods();

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [paymentMethod, setPaymentMethod] = useState<DepositPaymentMethod>(
    APPLE_PAY_PAYMENT_METHOD,
  );
  const [cryptoCurrency, setCryptoCurrency] =
    useState<DepositCryptoCurrency>(USDC_TOKEN);
  const [fiatCurrency, setFiatCurrency] =
    useState<DepositFiatCurrency>(USD_CURRENCY);
  const [amount, setAmount] = useState<string>('0');
  const [amountAsNumber, setAmountAsNumber] = useState<number>(0);
  const { isAuthenticated, selectedRegion } = useDepositSDK();
  const [error, setError] = useState<string | null>();

  const isAccountTokenCompatible = useAccountTokenCompatible(cryptoCurrency);

  const { routeAfterAuthentication, navigateToVerifyIdentity } =
    useDepositRouting({
      cryptoCurrencyChainId: cryptoCurrency.chainId,
      paymentMethodId: paymentMethod.id,
    });

  const allNetworkConfigurations = useSelector(selectNetworkConfigurations);

  const [, getQuote] = useDepositSdkMethod(
    { method: 'getBuyQuote', onMount: false, throws: true },
    fiatCurrency.id,
    cryptoCurrency.assetId,
    cryptoCurrency.chainId,
    paymentMethod.id,
    amount,
  );

  const {
    tokenAmount,
    isLoading: isLoadingTokenAmount,
    error: errorLoadingTokenAmount,
  } = useDepositTokenExchange({
    fiatCurrency,
    fiatAmount: amount,
    token: cryptoCurrency,
    tokens: supportedTokens,
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
    if (selectedRegion?.currency) {
      if (selectedRegion.currency === 'USD') {
        setFiatCurrency(USD_CURRENCY);
      } else if (selectedRegion.currency === 'EUR') {
        setFiatCurrency(EUR_CURRENCY);
      }
    }
  }, [selectedRegion?.currency]);

  useEffect(() => {
    if (selectedRegion?.isoCode && paymentMethods.length > 0) {
      const isPaymentMethodSupported = paymentMethods.some(
        (method) => method.id === paymentMethod.id,
      );

      if (!isPaymentMethodSupported) {
        setPaymentMethod(paymentMethods[0]);
      }
    }
  }, [selectedRegion?.isoCode, paymentMethods, paymentMethod]);

  useEffect(() => {
    if (supportedTokens.length > 0) {
      let caipChainId;
      if (isHexString(chainId)) {
        caipChainId = toEvmCaipChainId(chainId as Hex);
      } else {
        caipChainId = chainId;
      }

      if (cryptoCurrency.chainId !== caipChainId) {
        const token = supportedTokens.find(
          (supportedToken) => supportedToken.chainId === caipChainId,
        );
        if (token) {
          setCryptoCurrency(token);
          return;
        }
      }

      if (
        !supportedTokens.some(
          (token) => token.assetId === cryptoCurrency.assetId,
        )
      ) {
        setCryptoCurrency(supportedTokens[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, supportedTokens]);

  const handleRegionPress = useCallback(() => {
    navigation.navigate(...createRegionSelectorModalNavigationDetails());
  }, [navigation]);

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
    if (!isAccountTokenCompatible) {
      handleNavigateToIncompatibleAccountTokenModal();
      return;
    }
    setIsLoading(true);
    let quote: BuyQuote | undefined;

    try {
      trackEvent('RAMPS_ORDER_PROPOSED', {
        ramp_type: 'DEPOSIT',
        amount_source: amountAsNumber,
        amount_destination: Number(tokenAmount),
        payment_method_id: paymentMethod.id,
        region: selectedRegion?.isoCode || '',
        chain_id: cryptoCurrency.chainId,
        currency_destination: cryptoCurrency.assetId,
        currency_source: fiatCurrency.id,
        is_authenticated: isAuthenticated,
      });

      quote = await getQuote(
        getTransakFiatCurrencyId(fiatCurrency),
        getTransakCryptoCurrencyId(cryptoCurrency),
        getTransakChainId(cryptoCurrency.chainId),
        getTransakPaymentMethodId(paymentMethod),
        amount,
      );

      if (!quote) {
        throw new Error(strings('deposit.buildQuote.quoteFetchError'));
      }
    } catch (quoteError) {
      Logger.error(
        quoteError as Error,
        'Deposit::BuildQuote - Error fetching quote',
      );

      trackEvent('RAMPS_ORDER_FAILED', {
        ramp_type: 'DEPOSIT',
        amount_source: amountAsNumber,
        amount_destination: Number(tokenAmount),
        payment_method_id: paymentMethod.id,
        region: selectedRegion?.isoCode || '',
        chain_id: cryptoCurrency.chainId,
        currency_destination: cryptoCurrency.assetId,
        currency_source: fiatCurrency.id,
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
        payment_method_id: quote.paymentMethod,
        region: selectedRegion?.isoCode || '',
        chain_id: cryptoCurrency.chainId,
        currency_destination: cryptoCurrency.assetId,
        currency_source: quote.fiatCurrency,
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
        amount_destination: quote?.cryptoAmount || Number(tokenAmount),
        payment_method_id: quote?.paymentMethod || paymentMethod.id,
        region: selectedRegion?.isoCode || '',
        chain_id: cryptoCurrency.chainId,
        currency_destination: cryptoCurrency.assetId,
        currency_source: quote?.fiatCurrency || fiatCurrency.id,
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
    paymentMethod,
    selectedRegion?.isoCode,
    cryptoCurrency,
    fiatCurrency,
    isAuthenticated,
    getQuote,
    amount,
    routeAfterAuthentication,
    navigateToVerifyIdentity,
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
    [],
  );

  const handleSelectAssetId = useCallback(
    (assetId: string) => {
      const selectedToken = supportedTokens.find(
        (token) => token.assetId === assetId,
      );
      if (selectedToken) {
        trackEvent('RAMPS_TOKEN_SELECTED', {
          ramp_type: 'DEPOSIT',
          region: selectedRegion?.isoCode || '',
          chain_id: selectedToken.chainId,
          currency_destination: selectedToken.assetId,
          currency_source: fiatCurrency.id,
          is_authenticated: isAuthenticated,
        });
        setCryptoCurrency(selectedToken);
      }
      setError(null);
    },
    [
      supportedTokens,
      trackEvent,
      selectedRegion?.isoCode,
      fiatCurrency.id,
      isAuthenticated,
    ],
  );

  const handleCryptoPress = useCallback(
    () =>
      navigation.navigate(
        ...createTokenSelectorModalNavigationDetails({
          selectedAssetId: cryptoCurrency.assetId,
          handleSelectAssetId,
        }),
      ),
    [cryptoCurrency, navigation, handleSelectAssetId],
  );

  const handleSelectPaymentMethodId = useCallback(
    (selectedPaymentMethodId: string) => {
      const selectedPaymentMethod = paymentMethods.find(
        (_paymentMethod) => _paymentMethod.id === selectedPaymentMethodId,
      );
      if (selectedPaymentMethod) {
        trackEvent('RAMPS_PAYMENT_METHOD_SELECTED', {
          ramp_type: 'DEPOSIT',
          region: selectedRegion?.isoCode || '',
          payment_method_id: selectedPaymentMethod.id,
          is_authenticated: isAuthenticated,
        });
        setPaymentMethod(selectedPaymentMethod);
      }
      setError(null);
    },
    [paymentMethods, trackEvent, selectedRegion?.isoCode, isAuthenticated],
  );

  const handlePaymentMethodPress = useCallback(() => {
    navigation.navigate(
      ...createPaymentMethodSelectorModalNavigationDetails({
        selectedPaymentMethodId: paymentMethod.id,
        handleSelectPaymentMethodId,
      }),
    );
  }, [handleSelectPaymentMethodId, navigation, paymentMethod.id]);

  const networkName = allNetworkConfigurations[cryptoCurrency.chainId]?.name;
  const networkImageSource = getNetworkImageSource({
    chainId: cryptoCurrency.chainId,
  });

  useEffect(() => {
    if (shouldRouteImmediately) {
      navigation.setParams({
        shouldRouteImmediately: false,
      });
      handleOnPressContinue();
    }
  }, [handleOnPressContinue, shouldRouteImmediately, navigation]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content style={styles.content}>
          <View style={styles.selectionRow}>
            <AccountSelector isEvmOnly={false} />
            <TouchableOpacity
              style={styles.fiatSelector}
              onPress={handleRegionPress}
            >
              <View style={styles.regionContent}>
                <Text variant={TextVariant.BodyMD}>{selectedRegion?.flag}</Text>
                <Text variant={TextVariant.BodyMD}>
                  {selectedRegion?.isoCode}
                </Text>
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
                {formatCurrency(amountAsNumber, fiatCurrency.id, {
                  currencyDisplay: 'narrowSymbol',
                  maximumFractionDigits: 0,
                })}
              </Text>

              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Alternative}
                style={styles.convertedAmount}
              >
                {isLoadingTokenAmount || errorLoadingTokenAmount ? (
                  ' '
                ) : (
                  <>
                    {Number(tokenAmount) === 0 ? '0' : tokenAmount}{' '}
                    {cryptoCurrency.symbol}
                  </>
                )}
              </Text>
            </View>

            <TouchableOpacity onPress={handleCryptoPress}>
              <View style={styles.cryptoPill}>
                <BadgeWrapper
                  badgePosition={BadgePosition.BottomRight}
                  badgeElement={
                    <BadgeNetwork
                      name={networkName}
                      imageSource={networkImageSource}
                    />
                  }
                >
                  <AvatarToken
                    name={cryptoCurrency.name}
                    imageSource={{ uri: cryptoCurrency.iconUrl }}
                    size={AvatarSize.Md}
                  />
                </BadgeWrapper>
                <Text variant={TextVariant.HeadingLG}>
                  {cryptoCurrency.symbol}
                </Text>

                <Icon
                  name={IconName.ArrowDown}
                  size={IconSize.Sm}
                  color={theme.colors.icon.alternative}
                />
              </View>
            </TouchableOpacity>
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

          <TouchableOpacity
            style={styles.paymentMethodBox}
            onPress={handlePaymentMethodPress}
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
                  {paymentMethod.name}
                </Text>
              </ListItemColumn>

              <ListItemColumn>
                <TagBase
                  includesBorder
                  textProps={{ variant: TextVariant.BodySM }}
                >
                  {strings(
                    `deposit.payment_duration.${paymentMethod.duration}`,
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
            </ListItem>
          </TouchableOpacity>

          <Keypad
            style={styles.keypad}
            value={amount}
            onChange={handleKeypadChange}
            currency={fiatCurrency.symbol}
            decimals={0}
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
};

export default BuildQuote;
