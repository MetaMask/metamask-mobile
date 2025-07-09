import React, { useCallback, useEffect, useState } from 'react';
import { View, TouchableOpacity, InteractionManager } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
import useSupportedTokens from '../../hooks/useSupportedTokens';
import usePaymentMethods from '../../hooks/usePaymentMethods';

import { createEnterEmailNavDetails } from '../EnterEmail/EnterEmail';
import { createTokenSelectorModalNavigationDetails } from '../Modals/TokenSelectorModal/TokenSelectorModal';
import { createPaymentMethodSelectorModalNavigationDetails } from '../Modals/PaymentMethodSelectorModal/PaymentMethodSelectorModal';
import { createRegionSelectorModalNavigationDetails } from '../Modals/RegionSelectorModal';
import { createUnsupportedRegionModalNavigationDetails } from '../Modals/UnsupportedRegionModal';

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

import { selectNetworkConfigurations } from '../../../../../../selectors/networkController';
import {
  USDC_TOKEN,
  DepositCryptoCurrency,
  DepositPaymentMethod,
  USD_CURRENCY,
  DepositFiatCurrency,
  EUR_CURRENCY,
  DEBIT_CREDIT_PAYMENT_METHOD,
} from '../../constants';
import { useDepositRouting } from '../../hooks/useDepositRouting';
import Logger from '../../../../../../util/Logger';

const BuildQuote = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});

  const supportedTokens = useSupportedTokens();
  const paymentMethods = usePaymentMethods();

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [paymentMethod, setPaymentMethod] = useState<DepositPaymentMethod>(
    DEBIT_CREDIT_PAYMENT_METHOD,
  );
  const [cryptoCurrency, setCryptoCurrency] =
    useState<DepositCryptoCurrency>(USDC_TOKEN);
  const [fiatCurrency, setFiatCurrency] =
    useState<DepositFiatCurrency>(USD_CURRENCY);
  const [amount, setAmount] = useState<string>('0');
  const [amountAsNumber, setAmountAsNumber] = useState<number>(0);
  const { isAuthenticated, selectedWalletAddress, selectedRegion } =
    useDepositSDK();
  const [error, setError] = useState<string | null>();

  const { routeAfterAuthentication } = useDepositRouting({
    selectedWalletAddress,
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
      getDepositNavbarOptions(navigation, { title: 'Build Quote' }, theme),
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

  const handleOnPressContinue = useCallback(async () => {
    setIsLoading(true);
    let quote: BuyQuote | undefined;
    try {
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
      setError(strings('deposit.buildQuote.quoteFetchError'));
      setIsLoading(false);
      return;
    }

    try {
      if (!isAuthenticated) {
        navigation.navigate(
          ...createEnterEmailNavDetails({
            quote,
            paymentMethodId: paymentMethod.id,
            cryptoCurrencyChainId: cryptoCurrency.chainId,
          }),
        );
        return;
      }

      await routeAfterAuthentication(quote);
    } catch (routeError) {
      Logger.error(
        routeError as Error,
        'Deposit::BuildQuote - Error handling authentication',
      );
      setError(strings('deposit.buildQuote.unexpectedError'));
      return;
    } finally {
      setIsLoading(false);
    }
  }, [
    getQuote,
    fiatCurrency,
    cryptoCurrency,
    paymentMethod,
    amount,
    isAuthenticated,
    navigation,
    routeAfterAuthentication,
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
        setCryptoCurrency(selectedToken);
      }
      setError(null);
    },
    [supportedTokens],
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
        setPaymentMethod(selectedPaymentMethod);
      }
      setError(null);
    },
    [paymentMethods],
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

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content style={styles.content}>
          <View style={styles.selectionRow}>
            <AccountSelector />
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
            <Text
              variant={TextVariant.HeadingLG}
              style={styles.mainAmount}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCurrency(amountAsNumber, fiatCurrency.id, {
                currencyDisplay: 'narrowSymbol',
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
                <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
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
            deleteIcon={<Icon name={IconName.Arrow2Left} size={IconSize.Lg} />}
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
